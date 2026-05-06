import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';

const slugCollisionCheck = {
  name: 'slug-collision-check',
  hooks: {
    'astro:build:start': ({ logger }) => {
      const dir = path.resolve('./src/content/pdfs');
      if (!fs.existsSync(dir)) return;
      const seen = new Map();
      for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) {
        const text = fs.readFileSync(path.join(dir, f), 'utf8');
        const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fm) continue;
        const m = fm[1].match(/^slug:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m);
        if (!m) continue;
        const slug = m[1].trim();
        if (seen.has(slug)) {
          throw new Error(
            `Duplicate slug "${slug}" in src/content/pdfs/: ${seen.get(slug)} and ${f}. ` +
            `Each PDF must have a unique slug — rename one of the entries.`
          );
        }
        seen.set(slug, f);
      }
      logger.info(`slug-collision-check: ${seen.size} unique slug(s) verified`);
    },
  },
};

export default defineConfig({
  site: 'https://cohortscience-umed.netlify.app/',
  output: 'static',
  integrations: [slugCollisionCheck],
});
