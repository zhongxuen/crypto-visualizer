import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MODULES } from '@/modules/registry';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

const LINK =
  'focus-visible:outline-focus min-h-target inline-flex items-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2';

/**
 * The 404 page (docs/UIUX.md §2.3): a small XOR joke and the ways back onto the path.
 * Next's built-in one has no `<main>`, which left the header's "Skip to content" link
 * pointing at nothing and failed axe (`landmark-one-main`).
 */
export default function NotFound() {
  const modules = MODULES.filter((m) => m.status === 'ready');
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 md:py-16"
    >
      <p className="text-accent font-mono text-sm">404 = 0x194</p>
      <h1 className="font-display text-4xl">Page not found</h1>
      <figure className="border-border bg-paper flex flex-col gap-2 rounded-(--radius) border p-5">
        <p className="font-mono text-lg md:text-xl" aria-hidden="true">
          this page ⊕ this page = <span className="bg-highlight px-1">0</span>
        </p>
        <figcaption className="text-fg-secondary text-sm">
          <span className="sr-only">This page XOR this page equals zero. </span>
          Anything XORed with itself cancels out, and that is all that is here.
        </figcaption>
      </figure>
      <p className="text-fg-secondary leading-7">
        Nothing lives at this address. The modules are all still where they were:
      </p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m.slug}>
            <Link
              href={m.route}
              className="border-border bg-surface hover:bg-surface-overlay focus-visible:outline-focus min-h-target flex items-center gap-3 rounded-md border px-3 text-sm focus-visible:outline-2"
            >
              <span
                className="font-display w-6 text-base"
                style={{ color: `var(--tint-${m.slug})` }}
              >
                {String(m.number).padStart(2, '0')}
              </span>
              {m.title}
            </Link>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link href="/learn" className={`${LINK} bg-accent text-accent-fg hover:opacity-90`}>
          The learning path
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href="/"
          className={`${LINK} text-fg-secondary hover:text-fg underline underline-offset-4`}
        >
          Home page
        </Link>
      </div>
    </main>
  );
}
