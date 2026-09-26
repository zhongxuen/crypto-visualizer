import type { MDXComponents } from 'mdx/types';

/** Required by @next/mdx in the App Router. Walkthrough styling comes from `.prose-cv`. */
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
