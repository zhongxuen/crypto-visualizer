import Link from 'next/link';

import { SITE } from '@/lib/site';

import { SiteNav } from './SiteNav';

/**
 * The brand mark: a padlock whose body is a 3×3 grid of bytes, the site's one idea in a
 * glyph. Decorative; the wordmark next to it is the link's name.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}${col}`}
            x={5 + col * 5}
            y={10.5 + row * 4.25}
            width="4"
            height="3.5"
            rx="0.8"
            fill="currentColor"
            opacity={(row + col) % 2 === 0 ? 1 : 0.45}
          />
        )),
      )}
    </svg>
  );
}

/** Brand, the modules, About and the theme: one row at every width, 56 px on a phone. */
export function SiteHeader() {
  return (
    <header className="border-border bg-surface relative z-40 border-b">
      <a
        href="#main"
        className="focus:bg-accent focus:text-accent-fg sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      {/* 55 px and a 1 px rule: 56 px in all on a phone (B6). */}
      <div className="mx-auto flex h-[55px] max-w-7xl items-center gap-4 px-4">
        <Link
          href="/"
          className="focus-visible:outline-focus text-fg min-h-target inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <BrandMark className="text-accent size-6" />
          <span className="font-display text-lg leading-none">{SITE.name}</span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
