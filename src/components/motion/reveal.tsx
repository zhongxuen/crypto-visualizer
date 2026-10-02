'use client';

import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { useStepTransition } from './useStepTransition';

/**
 * `Reveal`, apart from the other primitives (`primitives.tsx`) because the step caption
 * uses it on every module's first screen, and Turbopack ships a file whole: the rest load
 * only with the views that use them.
 */

export type Trigger = string | number | boolean | null | undefined;

/**
 * Fade in and rise 4 px whenever `trigger` changes (the offset flips when stepping back).
 * `index` staggers siblings by `--stagger`.
 */
export function Reveal({
  trigger,
  index = 0,
  className,
  children,
}: {
  trigger: Trigger;
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const { animate, motion, direction } = useStepTransition();
  const style = {
    '--i': index,
    '--reveal-dir': direction === 'back' ? -1 : 1,
  } as CSSProperties;
  return (
    <span
      key={String(trigger)}
      style={style}
      className={cn(
        'block',
        animate ? 'motion-reveal' : motion ? 'motion-fade' : undefined,
        className,
      )}
    >
      {children}
    </span>
  );
}
