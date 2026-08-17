// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';

const enableKeystatic = process.env.NODE_ENV !== 'production' || Boolean(process.env.PUBLIC_KEYSTATIC_GITHUB_REPO);

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), markdoc(), ...(enableKeystatic ? [keystatic()] : [])]
});
