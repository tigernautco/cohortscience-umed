import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';

const pdfContentChecks = {
  name: 'pdf-content-checks',
  hooks: {
    'astro:build:start': ({ logger }) => {
      const dir = path.resolve('./src/content/pdfs');
      const publicDir = path.resolve('./public');
      if (!fs.existsSync(dir)) return;
      const seen = new Map();
      const missing = [];
      let fileChecks = 0;
      for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) {
        const text = fs.readFileSync(path.join(dir, f), 'utf8');
        const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fm) continue;
        const slugMatch = fm[1].match(/^slug:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m);
        if (slugMatch) {
          const slug = slugMatch[1].trim();
          if (seen.has(slug)) {
            throw new Error(
              `Duplicate slug "${slug}" in src/content/pdfs/: ${seen.get(slug)} and ${f}. ` +
              `Each PDF must have a unique slug — rename one of the entries.`
            );
          }
          seen.set(slug, f);
        }
        const fileMatch = fm[1].match(/^file:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m);
        if (fileMatch) {
          const file = fileMatch[1].trim();
          const abs = path.resolve(publicDir, file.replace(/^\/+/, ''));
          fileChecks++;
          if (!fs.existsSync(abs)) missing.push(`${f} → ${file}`);
        }
      }
      if (missing.length) {
        throw new Error(
          `Missing PDF file(s) referenced by content entries:\n  ${missing.join('\n  ')}\n` +
          `Each entry's \`file:\` path must exist under public/. Verify the Decap upload completed and the path matches.`
        );
      }
      logger.info(`pdf-content-checks: ${seen.size} unique slug(s), ${fileChecks} file path(s) verified`);
    },
  },
};

export default defineConfig({
  site: 'https://cohortscience-umed.netlify.app/',
  output: 'static',
  integrations: [pdfContentChecks],
});
