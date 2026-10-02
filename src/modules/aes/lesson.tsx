'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';

import type { AesEvent } from '@/core/aes/events';
import { cn } from '@/lib/cn';

/*
 * The lesson follows the timeline (UIUX §2.1 P2): `walkthrough.mdx` splits each chapter
 * into short `<Phase on="...">` paragraphs, and the one about the step on screen is
 * marked current. The page publishes the step's tags here; computing them is a lookup on
 * the event core produced, nothing more.
 */

export const AesLessonContext = createContext<readonly string[]>([]);

/** The lesson tags of a step: what kind of step it is, and where in its run. */
export function lessonTags(event: AesEvent | undefined): string[] {
  if (!event) return [];
  switch (event.kind) {
    case 'aes.input':
      return ['input'];
    case 'aes.output':
      return ['output'];
    case 'aes.subBytes':
    case 'aes.shiftRows':
    case 'aes.mixColumns':
    case 'aes.addRoundKey': {
      const tags: string[] = [event.round === 0 ? 'round0' : event.kind.slice(4)];
      if (event.round === 10) tags.push('last');
      return tags;
    }
    case 'aes.keyWord':
      return [
        event.i < 4 ? 'key-copy' : event.rot !== undefined ? 'key-twist' : 'key-xor',
      ];
    case 'aes.avalanche':
      return [event.stage === 'flip' ? 'flip' : event.round <= 2 ? 'spread' : 'half'];
    case 'aes.pad':
      return ['pad'];
    case 'aes.modeSetup':
    case 'aes.modeBlock':
    case 'aes.modeResult':
      return [event.mode, event.kind === 'aes.modeSetup' ? 'setup' : 'block'];
    case 'aes.penguin':
    case 'aes.gcm':
      return [event.stage];
  }
}

/** The nearest ancestor that scrolls vertically: the lesson rail. */
function scroller(node: HTMLElement): HTMLElement | null {
  for (let p = node.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      p.scrollHeight > p.clientHeight
    )
      return p;
  }
  return null;
}

/**
 * One phase's paragraph. Current when any of its space-separated tags is a tag of the
 * step on screen: a marker line in the module's tint, full-strength text and
 * `aria-current`; the others stay readable but quieter. When it becomes current it is
 * scrolled into view inside the rail, never the page.
 */
export function Phase({ on, children }: { on: string; children: ReactNode }) {
  const tags = useContext(AesLessonContext);
  const current = on.split(' ').some((tag) => tags.includes(tag));
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!current || !node || node.offsetParent === null) return;
    const box = scroller(node);
    if (!box) return;
    const outer = box.getBoundingClientRect();
    const inner = node.getBoundingClientRect();
    // What of the rail is on screen: the rail may run on under the dock.
    const dock = document.querySelector('[role="region"][aria-label="Timeline"]');
    const top = Math.max(outer.top, 0);
    const bottom = Math.min(
      outer.bottom,
      dock?.getBoundingClientRect().top ?? window.innerHeight,
    );
    if (inner.top < top) box.scrollTop -= top - inner.top + 8;
    else if (inner.bottom > bottom)
      box.scrollTop += Math.min(inner.bottom - bottom + 8, inner.top - top);
  }, [current]);

  return (
    <div
      ref={ref}
      data-phase={on}
      aria-current={current ? 'step' : undefined}
      className={cn(
        'border-l-2 pl-3 transition-colors duration-(--dur-quick) [&>p]:my-2',
        current
          ? 'text-fg border-l-[color:var(--tint,var(--accent))]'
          : 'text-fg-secondary border-l-border',
      )}
    >
      {children}
    </div>
  );
}
