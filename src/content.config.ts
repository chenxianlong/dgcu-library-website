import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
    category: z.enum(['通知公告', '新闻动态', '活动预告', '获奖通知']),
    summary: z.string(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    sourceUrl: z.string().optional(),
    legacyId: z.string().optional(),
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml,json}', base: './src/content/resources' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    url: z.string(),
    category: z.enum(['中文数据库', '外文数据库', '电子图书', '考试学习', '开放资源', '试用资源']),
    access: z.enum(['校内', 'VPN', '公开']),
    featured: z.boolean().default(false),
  }),
});

export const collections = { articles, resources };
