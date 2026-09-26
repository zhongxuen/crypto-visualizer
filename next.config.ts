import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Walkthroughs are MDX files imported by module pages (src/modules/*/walkthrough.mdx).
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
};

const withMDX = createMDX({
  options: {
    // Turbopack needs plugins named by string (node_modules/next/dist/docs, MDX guide).
    remarkPlugins: ['remark-gfm'],
  },
});

export default withMDX(nextConfig);
