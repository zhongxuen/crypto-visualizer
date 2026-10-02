'use client';

import { Check } from 'lucide-react';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';

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
  const list = useRef<HTMLOListElement>(null);
  const bar = useRef<HTMLLIElement>(null);

  // The active indicator slides under the current tab. On a phone, where the tabs scroll
  // sideways, the current one is brought into view (sideways only: the page stays put).
  useLayoutEffect(() => {
    const ol = list.current;
    const active = ol?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!ol || !active || !bar.current) return;
    bar.current.style.width = `${active.offsetWidth}px`;
    bar.current.style.transform = `translateX(${active.offsetLeft}px)`;
    bar.current.hidden = false;
    if (ol.scrollWidth > ol.clientWidth) {
      ol.scrollLeft = active.offsetLeft - (ol.clientWidth - active.offsetWidth) / 2;
    }
  }, [current, chapters]);

  return (
    <nav aria-label="Chapters" className={cn('relative min-w-0', className)}>
      <ol
        ref={list}
        className="relative -mx-1 flex [scrollbar-width:none] gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,#000_0.75rem,#000_calc(100%-0.75rem),transparent)] px-1 pb-1.5 md:[mask-image:none]"
      >
        {chapters.map((chapter, index) => {
          const active = chapter.id === current;
          const finished = done?.includes(chapter.id) ?? false;
          return (
            <li key={chapter.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(chapter.id)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'focus-visible:outline-focus min-h-target inline-flex items-center gap-1.5 rounded-md px-2.5 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 md:min-h-8',
                  active
                    ? 'text-fg font-medium'
                    : 'text-fg-secondary hover:text-fg hover:bg-surface-overlay',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs',
                    active ? 'text-(--tint,var(--accent))' : 'text-fg-muted',
                  )}
                >
                  {index + 1}
                </span>
                {chapter.title}
                {finished ? (
                  <>
                    <Check aria-hidden="true" className="tick-draw text-ok size-3.5" />
                    <span className="sr-only">(done)</span>
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
        <li
          ref={bar}
          aria-hidden="true"
          hidden
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-(--tint,var(--accent)) transition-[transform,width] duration-(--dur-quick) ease-(--ease-out)"
        />
      </ol>
    </nav>
  );
}
