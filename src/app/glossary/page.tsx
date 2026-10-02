import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  GLOSSARY,
  type GlossaryEntry,
  type GlossaryId,
} from '@/components/lesson/glossary';
import { MODULES } from '@/modules/registry';

export const metadata: Metadata = {
  title: 'Glossary',
  description:
    'Every term the walkthroughs use, from byte and UTF-8 to φ(n) and OKLab, in a sentence or two of plain English.',
};

/**
 * `/glossary` (docs/UIUX.md §2.1 P3, §4.1): every term in `glossary.ts`, A to Z, with an
 * anchor per term. A `<Term>` popover in a walkthrough links to its entry here, and the
 * entry links on to the module that teaches it. A server component: no JS of its own.
 */

const GREEK = 'Greek letters';

interface Row {
  id: GlossaryId;
  entry: GlossaryEntry;
  group: string;
}

/** The letter a term files under, or `GREEK` for σ, Σ and φ. */
function groupOf(term: string): string {
  const first = term[0].toUpperCase();
  return /[A-Z]/.test(first) ? first : GREEK;
}

const ROWS: Row[] = (Object.keys(GLOSSARY) as GlossaryId[])
  .map((id) => {
    const entry: GlossaryEntry = GLOSSARY[id];
    return { id, entry, group: groupOf(entry.term) };
  })
  .sort((a, b) =>
    a.group === b.group
      ? a.entry.term.localeCompare(b.entry.term, 'en', { sensitivity: 'base' })
      : a.group === GREEK
        ? 1
        : b.group === GREEK
          ? -1
          : a.group.localeCompare(b.group),
  );

const GROUPS = [...new Set(ROWS.map((row) => row.group))];

const TITLES = new Map(MODULES.map((m) => [m.route, m.title]));

function groupAnchor(group: string): string {
  return group === GREEK ? 'letters-greek' : `letter-${group.toLowerCase()}`;
}

export default function GlossaryPage() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10"
    >
      <header className="flex flex-col gap-3">
        <p className="text-accent text-sm font-semibold tracking-wide uppercase">
          Reference
        </p>
        <h1 className="font-display text-4xl">Glossary</h1>
        <p className="text-fg-secondary text-lg leading-8">
          The words the walkthroughs use, each in a sentence or two. In a lesson, a word
          with a dotted underline opens its entry in place.
        </p>
      </header>

      <nav aria-label="Glossary letters">
        <ul className="flex flex-wrap gap-1.5">
          {GROUPS.map((group) => (
            <li key={group}>
              <a
                href={`#${groupAnchor(group)}`}
                className="border-border bg-surface hover:bg-surface-overlay focus-visible:outline-focus min-h-target inline-flex min-w-11 items-center justify-center rounded-md border px-2 font-mono text-sm focus-visible:outline-2 md:min-h-9 md:min-w-9"
              >
                {group === GREEK ? 'σ Σ φ' : group}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {GROUPS.map((group) => (
        <section
          key={group}
          id={groupAnchor(group)}
          aria-labelledby={`${groupAnchor(group)}-heading`}
          className="flex scroll-mt-6 flex-col gap-3"
        >
          <h2
            id={`${groupAnchor(group)}-heading`}
            className="font-display border-border border-b pb-1 text-2xl"
          >
            {group}
          </h2>
          <dl className="flex flex-col gap-3">
            {ROWS.filter((row) => row.group === group).map(({ id, entry }) => (
              <div
                key={id}
                id={id}
                className="border-border bg-surface target:bg-highlight flex scroll-mt-6 flex-col gap-1 rounded-(--radius) border p-4"
              >
                <dt className="font-mono text-lg font-semibold">{entry.term}</dt>
                <dd className="text-fg-secondary leading-7">{entry.definition}</dd>
                {entry.module ? (
                  <dd>
                    <Link
                      href={entry.module.route}
                      className="text-accent focus-visible:outline-focus inline-flex items-center gap-1 rounded-sm text-sm underline underline-offset-2 focus-visible:outline-2"
                    >
                      Module {entry.module.number}: {TITLES.get(entry.module.route)}
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
