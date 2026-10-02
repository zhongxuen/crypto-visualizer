'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The lesson follows the timeline (UIUX §2.1 P2): `walkthrough.mdx` splits each chapter
 * into one short paragraph per phase, `<Phase id="mix">`, where `id` is the core run's
 * group id. The page puts the current phase's id in `PhaseContext`; that paragraph is
 * marked as current and kept in view inside the lesson rail (never by scrolling the
 * page). The others stay readable, a shade quieter.
 */

export const PhaseContext = createContext<string | null>(null);

/** Bring `node` into view within its nearest scrolling ancestor, leaving the page be. */
function keepInView(node: HTMLElement) {
  for (let box = node.parentElement; box; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      box.scrollHeight > box.clientHeight
    ) {
      const top = node.getBoundingClientRect().top - box.getBoundingClientRect().top;
      if (top < 0) box.scrollTop += top - 8;
      else if (top + node.offsetHeight > box.clientHeight) {
        box.scrollTop += top + node.offsetHeight - box.clientHeight + 8;
      }
      return;
    }
  }
}

export function Phase({ id, children }: { id: string; children: ReactNode }) {
  const current = useContext(PhaseContext) === id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (current && ref.current) keepInView(ref.current);
  }, [current]);

  return (
    <div
      ref={ref}
      data-phase={id}
      aria-current={current ? 'step' : undefined}
      className={cn(
        'border-l-2 pl-3 transition-colors duration-(--dur-quick)',
        current
          ? 'text-fg border-(color:--tint)'
          : 'text-fg-secondary border-transparent',
      )}
    >
      {children}
    </div>
  );
}
