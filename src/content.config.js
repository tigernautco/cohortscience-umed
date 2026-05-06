import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pdfs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pdfs' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case'),
    file: z.string(),
    uploadedAt: z.coerce.date(),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    archived: z.boolean().default(false),
  }),
});

export const collections = { pdfs };
