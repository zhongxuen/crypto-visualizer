import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

import { cspModeFromEnv, securityHeaders } from './src/lib/securityHeaders';

const nextConfig: NextConfig = {
  // Walkthroughs are MDX files imported by module pages (src/modules/*/walkthrough.mdx).
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],

  /**
   * Security headers on every response: pages, static assets and the PBKDF2 Worker
   * script alike. The policy and the argument for each directive live in
   * `src/lib/securityHeaders.ts`; this only decides when. `next build` sets NODE_ENV to
   * production for every environment, so previews get the same policy as production.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({
          mode: cspModeFromEnv(),
          development: process.env.NODE_ENV === 'development',
          reportUri: process.env.CSP_REPORT_URI,
        }),
      },
    ];
  },
};

const withMDX = createMDX({
  options: {
    // Turbopack needs plugins named by string (node_modules/next/dist/docs, MDX guide).
    remarkPlugins: ['remark-gfm'],
  },
});

export default withMDX(nextConfig);
