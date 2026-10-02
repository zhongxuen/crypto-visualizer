'use client';

import { CheckCircle2, Circle, Menu, Palette } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useProgress } from '@/components/state/useProgress';
import { cn } from '@/lib/cn';
import { MODULES } from '@/modules/registry';

import { Disclosure } from './Menus';
import { ThemeToggle } from './ThemeToggle';

/**
 * The header's menus (UIUX §4.2 SiteHeader). From `md`: a "Modules" menu (numbered, with
 * a tick for each walkthrough finished), the learning path, the glossary, About, and a
 * "Theme" menu. Below `md` all of it
 * moves into one "Menu" sheet, so the header stays one row (B6).
 *
 * Each menu's contents render only while it is open, so the two layouts never put the
 * same links on the page twice.
 */

function ModuleLinks({ onNavigate }: { onNavigate: () => void }) {
  const { progress } = useProgress();
  const pathname = usePathname();
  return (
    <nav aria-label="Modules">
      <ol className="flex flex-col">
        {MODULES.map((entry) => {
          const done = progress.completed.includes(entry.slug);
          const ready = entry.status === 'ready';
          const body = (
            <>
              <span
                className="font-display w-6 shrink-0 text-base"
                style={{ color: `var(--tint-${entry.slug})` }}
              >
                {String(entry.number).padStart(2, '0')}
              </span>{' '}
              <span className="flex-1">{entry.title}</span>{' '}
              {ready ? (
                done ? (
                  <>
                    <CheckCircle2 aria-hidden="true" className="text-ok size-4" />
                    <span className="sr-only">(finished)</span>
                  </>
                ) : (
                  <Circle aria-hidden="true" className="text-border-strong size-4" />
                )
              ) : (
                <span className="text-fg-muted text-xs">Coming next</span>
              )}
            </>
          );
          const row =
            'flex min-h-target items-center gap-2 rounded-md px-2 text-sm md:min-h-9';
          return (
            <li key={entry.slug}>
              {ready ? (
                <Link
                  href={entry.route}
                  onClick={onNavigate}
                  aria-current={pathname === entry.route ? 'page' : undefined}
                  className={cn(
                    row,
                    'hover:bg-surface-overlay focus-visible:outline-focus aria-[current=page]:bg-surface-overlay focus-visible:outline-2 aria-[current=page]:font-medium',
                  )}
                >
                  {body}
                </Link>
              ) : (
                <span className={cn(row, 'text-fg-muted')}>{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const LINK =
  'text-fg-secondary hover:text-fg focus-visible:outline-focus inline-flex min-h-target items-center rounded-md px-2 text-sm focus-visible:outline-2 md:min-h-9 aria-[current=page]:text-fg aria-[current=page]:font-medium';

/** The site's other pages: a short name in the header row, a longer one in the sheet. */
const PAGES = [
  { href: '/learn', short: 'Path', long: 'The learning path' },
  { href: '/glossary', short: 'Glossary', long: 'Glossary' },
  { href: '/about', short: 'About', long: 'About and accuracy' },
] as const;

function PageLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={pathname === href ? 'page' : undefined}
      className={LINK}
    >
      {children}
    </Link>
  );
}

export function SiteNav() {
  return (
    <>
      {/* From md: Modules, About and Theme, inline. */}
      <div className="flex flex-1 items-center gap-1 max-md:hidden">
        <Disclosure label="Modules" align="start" bare>
          {(close) => <ModuleLinks onNavigate={close} />}
        </Disclosure>
        {PAGES.map((page) => (
          <PageLink key={page.href} href={page.href}>
            {page.short}
          </PageLink>
        ))}
        <Disclosure label="Theme" icon={Palette} className="ml-auto" bare panel="wide">
          {() => <ThemeToggle />}
        </Disclosure>
      </div>

      {/* Below md: one menu sheet. */}
      <Disclosure label="Menu" icon={Menu} className="ml-auto md:hidden" panel="sheet">
        {(close) => (
          <div className="flex flex-col gap-3 p-1">
            <ModuleLinks onNavigate={close} />
            <ul className="border-border flex flex-col border-t pt-2">
              {PAGES.map((page) => (
                <li key={page.href}>
                  <PageLink href={page.href} onClick={close}>
                    {page.long}
                  </PageLink>
                </li>
              ))}
            </ul>
            <ThemeToggle />
          </div>
        )}
      </Disclosure>
    </>
  );
}
