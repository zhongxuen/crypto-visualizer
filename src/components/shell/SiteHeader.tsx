import Link from 'next/link';

import { SITE } from '@/lib/site';
import { MODULES } from '@/modules/registry';

import { ThemeToggle } from './ThemeToggle';

/** Site name, the ready modules, About and the theme toggle. */
export function SiteHeader() {
  const ready = MODULES.filter((entry) => entry.status === 'ready');

  return (
    <header className="border-border bg-surface border-b">
      <a
        href="#main"
        className="focus:bg-accent focus:text-accent-fg sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="focus-visible:outline-focus rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {SITE.name}
        </Link>
        <nav aria-label="Modules" className="flex-1">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {ready.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={entry.route}
                  className="text-fg-secondary hover:text-fg focus-visible:outline-focus rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {entry.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/about"
                className="text-fg-secondary hover:text-fg focus-visible:outline-focus rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                About
              </Link>
            </li>
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
