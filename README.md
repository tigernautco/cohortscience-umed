# PDF Hosting

A static Astro site that hosts PDFs at stable URLs and provides a Decap CMS admin panel at `/admin` so a non-technical client can upload and manage PDFs themselves. Deployed to Netlify.

## How it works

- PDFs live in [public/pdfs/](public/pdfs/) and resolve at `https://<your-domain>/pdfs/<slug>.pdf`.
- Each PDF has a markdown entry in [src/content/pdfs/](src/content/pdfs/) with frontmatter (title, slug, file, uploadedAt, description).
- The home page lists every PDF, newest first.
- The admin panel at `/admin` reads/writes those markdown files and uploads PDFs via Git Gateway, so every change becomes a Git commit on `main` and Netlify rebuilds.

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
npm run preview
```

The admin panel will not work locally without extra setup (it expects Netlify Identity + Git Gateway). Use the deployed site for content edits.

## Deploy to Netlify

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Netlify auto-detects Astro. Build command `npm run build`, publish directory `dist`.
4. Deploy. Then point your subdomain (e.g. `pdfs.example.com`) at the Netlify site under **Domain management**.
5. Update [astro.config.mjs](astro.config.mjs) `site:` to the real subdomain.

## Enable Identity + Git Gateway

This is what lets the client log in to `/admin` and commit through the browser.

1. In the Netlify site dashboard: **Integrations → Identity → Enable Identity**.
2. **Identity → Registration**: set to **Invite only** (recommended — otherwise anyone can sign up and edit your site).
3. **Identity → Services → Git Gateway → Enable Git Gateway**.
4. **Identity → Invite users**: send the client an invite to their email address.
5. The client clicks the invite link, sets a password, and is redirected to `/admin/`.

## Client guide

If you're managing the PDFs (and not a developer), this section is for you.

### Logging in

1. Open the invite email from Netlify and click **Accept the invite**.
2. Set a password. You'll be sent to the admin panel automatically.
3. After this, log in any time at `https://<your-domain>/admin/`.

### Adding a PDF

1. Click **New PDF**.
2. **Title** — what shows up on the home page list.
3. **Slug** — the short URL name. Lowercase letters, numbers, and single hyphens only. Examples: `q3-financial-report`, `2026-handbook`. Whatever you type here becomes the public URL: `/pdfs/<slug>.pdf`.
4. **PDF File** — click and choose your PDF. Then rename the local file to match the slug *before* you upload (so `q3-financial-report.pdf` for slug `q3-financial-report`). The form will reject anything that isn't a `.pdf`.
5. **Uploaded** — leave it as today's date.
6. **Description** — optional, one or two sentences.
7. **Archived** — leave unchecked unless you want to hide an old PDF (see below).
8. Click **Publish → Publish now**.

The site rebuilds in about a minute. Refresh the home page and your PDF is there.

### Updating a PDF

Open the entry, edit any field, click **Publish**. To swap out the file with a newer version, upload a new file with the same `<slug>.pdf` name.

### Archiving instead of deleting

If a PDF is out of date but you don't want to break links anyone has saved or emailed, **don't delete it** — open the entry and tick the **Archived** checkbox, then publish.

What archiving does:

- Removes the PDF from the home page list (so new visitors don't see it).
- **Keeps the PDF available at its original `/pdfs/<slug>.pdf` URL** — old bookmarks and shared links still work.
- The home page has a small **Show archived** button at the bottom that reveals archived PDFs with a muted "Archived" badge, in case you need to find one.

### Why not just delete?

Deleting an entry removes it from the admin, but the PDF file itself stays in the site's storage until a developer cleans it up. More importantly, anyone who bookmarked or emailed the old link gets a broken page. **Archive is almost always what you want.** Only delete if the PDF was genuinely a mistake (wrong file uploaded, etc.).

## Filename rules

- Slugs must match `^[a-z0-9]+(-[a-z0-9]+)*$` — lowercase letters, numbers, single hyphens, no leading/trailing/double hyphens. The admin form enforces this.
- The uploaded PDF's filename **must** match `<slug>.pdf`. The home page links to `/pdfs/<slug>.pdf`, so a mismatch means a broken link.
- No spaces, no uppercase, no underscores in slugs.
- Each slug must be unique. The build will fail with a clear error if two entries share one.

## Troubleshooting

**Build fails with "Duplicate slug ... in src/content/pdfs/".**
Two entries have the same slug. Open the named files in `src/content/pdfs/`, change one slug to something distinct, and re-deploy. If you can't access the repo, the easiest fix from the admin is to open one of the two entries and edit its **Slug** field — but note that Decap will then leave behind the old markdown file under the original name, which a developer will need to delete from the repo.

**The admin panel shows "Failed to load entries" or "Config Errors".**
Usually means Git Gateway isn't enabled. In Netlify: **Identity → Services → Git Gateway → Enable**. Wait a minute and refresh `/admin/`.

**Identity invite emails aren't arriving.**
Check the user's spam folder first. If still missing: in Netlify go to **Identity → Users**, find the pending user, and click **... → Resend invitation**. If invites still don't arrive, Netlify's free tier uses their default mail sender which gets aggressive spam-filtering — set up a custom SMTP under **Identity → Emails → Email templates** (or temporarily share the invite link directly: hover the user row in the dashboard).

**Logged-in user sees "You don't have access to this site's content".**
Their account exists in Identity but Git Gateway isn't enabled, or they were invited before Git Gateway was turned on. Re-enable Git Gateway, then have them log out and back in.

**A PDF link goes to a 404 even though the entry exists.**
The uploaded PDF's filename doesn't match the slug. Open the entry, re-upload the file with the correct `<slug>.pdf` name, publish. The old wrong-named file stays in `public/pdfs/` and needs manual removal from the repo by a developer.

## Customization

All theme tokens are CSS custom properties in [src/layouts/Base.astro](src/layouts/Base.astro), under the `/* === EDIT THESE VARIABLES TO REBRAND THE SITE === */` comment block. Edit them in one place and the whole site re-skins.

| Variable | Controls |
| --- | --- |
| `--color-bg` | Page background |
| `--color-text` | Default body text |
| `--color-muted` | Secondary text — descriptions, dates, file sizes, month headers |
| `--color-accent` | Links, focus rings, hover borders |
| `--color-border` | Dividers, list separators, input/button outlines, archived badge |
| `--font-heading` | Font for `h1`, `h2`, `h3` |
| `--font-body` | Default font on `<body>` |
| `--space-xs` … `--space-xl` | Spacing scale (0.25rem → 2rem) used for margins, padding, gaps |
| `--radius` | Corner radius on inputs, buttons, badges |
| `--max-width` | Max width of `<main>` content column |

Default values were chosen to meet WCAG AA contrast on the default background. If you change `--color-bg` or `--color-text`, recheck `--color-muted` and `--color-accent` against a contrast checker (target ≥ 4.5:1 for body text).

### Replacing the favicon and social image

- **Favicon**: [public/favicon.svg](public/favicon.svg) is a placeholder document icon in the default accent color. Replace with your own SVG (or drop in a `favicon.png` and update the `<link rel="icon">` in [src/layouts/Base.astro](src/layouts/Base.astro)).
- **Social preview**: [public/og-image.svg](public/og-image.svg) is a visual placeholder. The Base layout's `<meta property="og:image">` references `/og-image.png` — create a real **1200×630 PNG** and save it as `public/og-image.png`. Most social platforms (Twitter/X, Slack, Facebook) require PNG/JPG, not SVG.
- **Default site title and description**: edit the prop defaults in [src/layouts/Base.astro](src/layouts/Base.astro) frontmatter (`title = 'Document Library'`, `description = 'Document hosting'`).

## Going live checklist

Before handing the site to the client, verify each:

- [ ] Custom domain added to the Netlify site (**Domain management → Add a domain**).
- [ ] DNS CNAME confirmed and propagated (`dig <subdomain>` returns the Netlify load balancer; HTTPS cert auto-provisioned).
- [ ] [astro.config.mjs](astro.config.mjs) `site:` field updated to the real domain (so canonical URLs and OG image URLs resolve correctly).
- [ ] Netlify Identity enabled, **Registration** set to **Invite only**.
- [ ] Git Gateway enabled under **Identity → Services**.
- [ ] Identity invites sent to all client users; at least one user has accepted, logged in, and confirmed they can edit.
- [ ] [public/favicon.svg](public/favicon.svg) replaced with branded favicon.
- [ ] `public/og-image.png` created (1200×630) and committed.
- [ ] Site title and description in [src/layouts/Base.astro](src/layouts/Base.astro) updated from defaults.
- [ ] Theme variables (colors, fonts) in `:root` updated to client brand.
- [ ] Sample seed entry [src/content/pdfs/sample-document.md](src/content/pdfs/sample-document.md) deleted (or replaced with a real first upload).
- [ ] One end-to-end test: client logs in, uploads a PDF, verifies it appears on the home page after rebuild.

## Project layout

```
public/
  admin/              Decap CMS admin panel
    index.html
    config.yml
  pdfs/               PDF binaries (created on first upload)
  favicon.svg
  og-image.svg        Placeholder — replace with og-image.png (1200×630)
src/
  content/
    config.js         Content collection schema
    pdfs/             Markdown entries — one per PDF
  layouts/
    Base.astro        Shared layout, theme variables, OG/Twitter meta
  pages/
    index.astro       PDF list, search, month grouping, archive toggle
astro.config.mjs      Includes build-time slug-uniqueness integration
package.json
```
