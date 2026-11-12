import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const relics = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/relics' }),
  schema: z.object({
    order: z.number(),
    short: z.string(),
    full: z.string(),
    lead: z.string(),
    stack: z.array(z.string()),
    points: z.array(z.string()),
    lore: z.string(),
    loreDraft: z.boolean().default(false),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    /** The object shown for this project, what to call it, and a few words on why it fits. */
    relic: z.enum(['cauldron', 'tome', 'owl', 'mask', 'bell']),
    relicName: z.string(),
    relicWhy: z.string(),
  }),
});

const journey = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/journey' }),
  schema: z.object({
    order: z.number(),
    short: z.string(),
    title: z.string(),
    place: z.string(),
    dates: z.string(),
    years: z.string(),
    points: z.array(z.string()),
  }),
});

export const collections = { relics, journey };
