'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

/**
 * The lesson rail follows the timeline (UIUX §2.1 P2): the walkthrough's prose is one
 * short paragraph per part of the run, each wrapped in `<Phase on="...">`, and the
 * paragraph for the step on screen is marked as current and kept in view.
 *
 * `LessonContext` carries the current step's lesson key (`lessonKey`), which the page
 * sets. Outside it (no run yet) every paragraph reads the same.
 */

export const LessonContext = createContext<string | null>(null);

/** Which paragraph a step belongs to: the part of the algorithm, never the block number. */
export function lessonKey(
  event: { kind: string; stage?: string; which?: string } | undefined,
): string | null {
  if (!event) return null;
  if (event.stage !== undefined) return `avalanche.${event.stage}`;
  // HMAC's pad and hash steps happen twice, once per lane: ipad, inner, opad, outer.
  if (event.which !== undefined) return `hmac.${event.which}`;
  return event.kind;
}

/** Scroll `node` into view inside its nearest scrolling box, leaving the page be. */
function keepInView(node: HTMLElement): void {
  let box = node.parentElement;
  while (box && box !== document.body) {
    const { overflowY } = getComputedStyle(box);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      box.scrollHeight > box.clientHeight
    ) {
      const top = node.getBoundingClientRect().top - box.getBoundingClientRect().top;
      if (top < 0 || top + node.offsetHeight > box.clientHeight) {
        box.scrollTop += top - 8;
      }
      return;
    }
    box = box.parentElement;
  }
}

export function Phase({
  on,
  title,
  children,
}: {
  /** Lesson keys this paragraph explains, space separated (`'sha256.add sha256.digest'`). */
  on: string;
  /** A short heading, shown in small caps above the paragraph. */
  title: string;
  children: ReactNode;
}) {
  const current = useContext(LessonContext);
  const ref = useRef<HTMLDivElement>(null);
  const active = current !== null && on.split(' ').includes(current);

  useLayoutEffect(() => {
    if (active && ref.current) keepInView(ref.current);
  }, [active]);

  return (
    <div
      ref={ref}
      data-lesson={on}
      aria-current={active ? 'step' : undefined}
      className={cn(
        'my-2 rounded-r-md border-l-2 py-0.5 pl-3 transition-colors duration-(--dur-quick) [&>p]:my-1',
        active ? 'border-accent bg-surface' : 'border-transparent',
      )}
    >
      <p className="text-fg-muted text-xs font-semibold tracking-wide uppercase">
        {title}
        {active ? <span className="sr-only"> (this step)</span> : null}
      </p>
      {children}
    </div>
  );
}
