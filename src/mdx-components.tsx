import type { ComponentPropsWithoutRef } from 'react';
import type { MDXComponents } from 'mdx/types';

/** Required by @next/mdx in the App Router. Walkthrough styling comes from `.prose-cv`. */
const components: MDXComponents = {
  // The wrapper scrolls a wide table on small screens (see `.table-scroll` in
  // globals.css). It takes focus so the scroll works from the keyboard.
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className="table-scroll" role="region" aria-label="Table" tabIndex={0}>
      <table {...props} />
    </div>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
