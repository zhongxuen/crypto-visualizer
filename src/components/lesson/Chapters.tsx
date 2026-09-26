'use client';

import { Check } from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Walkthrough chapters.
 *
 * A module's `walkthrough.mdx` holds every chapter's prose, each wrapped in
 * `<Chapter id="...">`. The module puts the current chapter in `ChapterContext`, and
 * only that chapter's prose renders, so one MDX file stays one readable lesson.
 */

export const ChapterContext = createContext<string | null>(null);

export function Chapter({ id, children }: { id: string; children: ReactNode }) {
  const current = useContext(ChapterContext);
  if (current !== null && current !== id) return null;
  return <div className="prose-cv">{children}</div>;
}

export interface ChapterInfo<Id extends string = string> {
  id: Id;
  title: string;
}

export function ChapterTabs<Id extends string>({
  chapters,
  current,
  onSelect,
  done,
  className,
}: {
  chapters: readonly ChapterInfo<Id>[];
  current: Id;
  onSelect: (id: Id) => void;
  /** Chapters to tick. */
  done?: readonly Id[];
  className?: string;
}) {
  return (
    <nav aria-label="Chapters" className={className}>
      <ol className="flex flex-wrap gap-1.5">
        {chapters.map((chapter, index) => {
          const active = chapter.id === current;
          const finished = done?.includes(chapter.id) ?? false;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => onSelect(chapter.id)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'focus-visible:outline-focus inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2',
                  active
                    ? 'border-accent bg-accent text-accent-fg font-medium'
                    : 'border-border bg-surface text-fg-secondary hover:text-fg',
                )}
              >
                <span className="font-mono text-xs">{index + 1}</span>
                {chapter.title}
                {finished ? (
                  <>
                    <Check aria-hidden="true" className="size-3.5" />
                    <span className="sr-only">(done)</span>
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
