# CLAUDE.md

Context for future Claude Code sessions in this repo.

## What this project is

A static [Astro](https://astro.build) site whose only job is to host PDFs at stable, predictable URLs and let a non-technical client manage them through a Decap CMS admin panel. It deploys to Netlify on a subdomain.

The audience for `/admin` is the client, not a developer. Treat any change to that surface as user-facing — keep field labels plain-language, keep the form short, prefer hints over docs.

## Stack — non-negotiable

- **Astro 5.x**, static output (`output: 'static'`).
- **Plain JavaScript only.** No TypeScript files. The `tsconfig.json` extends `astro/tsconfigs/base` and explicitly disables `noImplicitAny` / `checkJs` so the Astro language server doesn't surface implicit-any errors on `.astro` frontmatter scripts. Don't re-enable strict mode.
- **Plain CSS with CSS variables.** All theme tokens live in the `:root` block at the top of [src/layouts/Base.astro](src/layouts/Base.astro), under the `EDIT THESE VARIABLES TO REBRAND THE SITE` comment. **That block is the single source of truth** — never hardcode colors, fonts, spacing, or radii anywhere else. Page-specific styles in [src/pages/index.astro](src/pages/index.astro) consume the variables, they don't redefine them.
- The base layout's `<style>` uses `is:global` — Astro's default scoped styles **don't propagate to slot content**, so without `is:global` none of the layout's class rules would apply to children. Same applies to the index page's `<style>`. Keep them global.
- **Decap CMS via CDN** at [public/admin/](public/admin/), loaded from `unpkg`. **Not** installed via npm.
- **Netlify Identity + Git Gateway** for auth and commits. The Identity widget script tag uses `is:inline` so Astro doesn't try to bundle a CDN URL.
- No client-side JS frameworks. The only browser JS in the project is the inline IIFE in [src/pages/index.astro](src/pages/index.astro) that drives search + archive toggle. It uses `is:inline` and is deliberately self-contained.

## Theme variables — full list

| Variable | Controls |
| --- | --- |
| `--color-bg` `--color-text` `--color-muted` `--color-accent` `--color-border` | Color surface |
| `--font-heading` `--font-body` | Fonts |
| `--space-xs` `--space-sm` `--space-md` `--space-lg` `--space-xl` | Spacing scale (0.25rem → 2rem) |
| `--radius` | Corner radius |
| `--max-width` | Content column max-width |

Default colors were chosen for WCAG AA: text 12.6:1, accent 5.6:1, muted 7.4:1 on `#fafafa` bg. If you change a color, re-verify with a contrast checker before merging.

## Architecture

```
PDF binary (public/pdfs/<slug>.pdf)
        ↑ uploaded by Decap (filename should match slug)
Markdown entry (src/content/pdfs/<slug>.md)
        schema in src/content/config.js, written by Decap
Astro index page (src/pages/index.astro)
   reads collection via getCollection('pdfs')
   reads file size via fs.statSync at build time (graceful fallback to "—")
   sorts by uploadedAt desc, groups by ISO year-month
   renders search input + archive toggle, both client-side filters
```

The slug is the contract: it's the markdown filename, the PDF filename, and the URL segment. If those drift apart, the home page link 404s.

## Build-time guards

[astro.config.mjs](astro.config.mjs) registers a small in-file Astro integration (`slugCollisionCheck`) that runs on `astro:build:start`. It scans every `.md` in `src/content/pdfs/`, regex-extracts `slug:` from the YAML frontmatter, and throws a `Duplicate slug "X" in ...: a.md and b.md` error if any two collide. Regex parsing rather than a YAML lib is intentional — no new dependencies.

[src/pages/index.astro](src/pages/index.astro) calls `fs.statSync` for each entry's `data.file` to determine PDF size at build time. If the file is missing, it logs a `[pdf-hosting]` warning and renders `—` in the meta row. The build does **not** fail — this is graceful degradation since Decap may have written the markdown entry slightly before the binary commit lands, and we'd rather show the entry than break the build.

## Content collection

[src/content/config.js](src/content/config.js), Astro 5 loader API (`glob` from `astro/loaders`):

- `title` — string, required
- `slug` — string, required, kebab-case (regex-validated, no leading/trailing/double hyphens)
- `file` — string, path under `/pdfs/`
- `uploadedAt` — date (coerced from ISO string)
- `description` — string, optional
- `archived` — boolean, defaults to `false`

The loader API (vs. the legacy `type: 'content'`) is what makes `slug` usable as a regular schema field — it's no longer a reserved key in Astro 5.

## Decap CMS config

[public/admin/config.yml](public/admin/config.yml):

- `backend: git-gateway`, branch `main`.
- `commit_messages` overridden to `Add PDF: {{slug}}` / `Update PDF: {{slug}}` / `Remove PDF: {{slug}}` so git history is readable.
- `media_folder: public/pdfs`, `public_folder: /pdfs`.
- Single collection `pdfs`, folder `src/content/pdfs`, `format: frontmatter`, `slug: '{{fields.slug}}'`.
- Slug widget pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`.
- File widget has a `\.pdf$` pattern guard so non-PDF uploads are rejected.
- Archived widget is a boolean checkbox.
- Summary template appends `[archived]` so the admin entry list shows status at a glance.

Schema and Decap fields must stay in sync — adding a field means editing **both** files.

## Index page behavior

[src/pages/index.astro](src/pages/index.astro) handles the data and renders the UI; the inline IIFE handles all filtering. Two filters compose:

- **Search** (input above the list): debounced ~150ms, sets `data-search-hit` and `display: none` on each `.pdf-item` whose `data-search` (lowercased title + description) doesn't include the query. Clear button (`×`) resets.
- **Archive toggle** (button below the list): toggles `.show-archived` on `#library`. CSS rule `#library:not(.show-archived) .is-archived { display: none }` hides archived items by default. Toggle text shows `Show N archived` / `Hide N archived`.

After every search or toggle event, `refresh()` re-evaluates per-item visibility AND per-month-section visibility — sections with no visible items get `display: none` so we don't render an empty month header. A `<p id="no-matches">` renders when search yields zero hits across all months.

States the page handles:
1. **No entries at all** → empty state with link to `/admin/`.
2. **Some entries** → search input, month-grouped list, archive toggle if any archived exist.
3. **Search yields zero matches** → `no-matches` paragraph appears, all sections hidden.
4. **All entries archived, toggle off** → all sections hidden, archive toggle visible to reveal them.

**Archived ≠ deleted.** Archived entries are hidden from the index (and from print), but their PDF binary is untouched, so `/pdfs/<slug>.pdf` continues to resolve. This is the key affordance and the README's client guide leans on it.

## SEO / social meta

[src/layouts/Base.astro](src/layouts/Base.astro) accepts `title`, `description`, `ogImage` props (defaults `Document Library` / `Document hosting` / `/og-image.png`). It renders canonical link, Open Graph (`og:type/title/description/url/image`), and Twitter (`summary_large_image` card) meta tags. URLs are absolute, built from `Astro.site` — so the `site` field in `astro.config.mjs` must be set to the real production URL before launch.

The `og-image.png` referenced in meta is **not committed** — only `og-image.svg` is, as a visual placeholder. Client must drop in a real 1200×630 PNG before launch (covered in README's "Going live checklist").

## Print + accessibility

- Print stylesheet (`@media print` in Base.astro): hides `#search-wrap` and `#archived-toggle`, force-hides `.is-archived`, switches bg to white and text to black, underlines all links.
- Global `:focus-visible` rule in Base.astro adds a 2px accent outline with 2px offset on every focusable element.
- Search input has `aria-label`, archive toggle has `aria-expanded`, clear button has `aria-label`.

## Constraints to respect when editing

- **Keep code lean.** Cumulative budget across three rounds was ~150 + ~80 + ~100 ≈ 330 LOC. Don't add helpers, components, or abstractions speculatively.
- **No TypeScript.** No `.ts` files, no annotations in `.astro` frontmatter scripts. Use Zod in the collection schema if you need validation.
- **No new npm dependencies.** Don't pull in YAML/frontmatter parsers for the slug check, don't add `lodash.debounce` for the search input, don't bring in a date library. The hand-rolled versions are intentional.
- **Don't run `npm install`** unless the user explicitly asks.
- **Don't hardcode theme values.** Anything that could be a CSS variable should be one — color, spacing, radius, font.
- **Don't add features the brief didn't ask for** — tags, categories, public-site auth, analytics, sitemaps, RSS, multi-language. If a need surfaces, surface it back to the user before building.

## Common changes and where they go

- Rebrand colors / fonts / spacing → the `:root` block in [src/layouts/Base.astro](src/layouts/Base.astro). Single edit point.
- Tweak list rendering / change groupings → [src/pages/index.astro](src/pages/index.astro) frontmatter (groups computation) and template.
- Change search behavior → the inline IIFE in [src/pages/index.astro](src/pages/index.astro).
- Add a content field → update both [src/content/config.js](src/content/config.js) (schema) **and** [public/admin/config.yml](public/admin/config.yml) (admin form). Out-of-sync schemas surface as silent build-time validation errors.
- Change commit message format → `backend.commit_messages` block in [public/admin/config.yml](public/admin/config.yml).
- Change the deploy URL → [astro.config.mjs](astro.config.mjs) `site:` field. Affects canonical and OG URLs.

## Deploy / auth setup

Covered in [README.md](README.md). Short version: enable Netlify Identity, set registration to invite-only, enable Git Gateway, invite the client. Not Claude's job to do this — it requires Netlify dashboard access. Troubleshooting and a "Going live checklist" are also in the README.

## Sample seed entry

[src/content/pdfs/sample-document.md](src/content/pdfs/sample-document.md) exists so the home page renders something on a fresh build. The seed references `/pdfs/sample-document.pdf` which doesn't exist on disk — this is intentional and exercises the "missing file" code path (size renders as `—`, build still succeeds with a warning). Delete the seed once real content is in.
