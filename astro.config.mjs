// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // The public HTTPS site is behind two trusted Nginx hops. Form endpoints
  // perform their own session-bound CSRF validation; login validates PUBLIC_ORIGIN.
  security: { checkOrigin: false },
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), markdoc()]
});
