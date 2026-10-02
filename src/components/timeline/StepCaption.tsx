'use client';

import { memo } from 'react';

import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/cn';

/**
 * The step, told in one sentence: the one thing a run says out loud.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/StepCaption.tsx` at 59ae4ad (see
 * VENDORED.md). Kept: exactly one polite `role="status"` per view, handed only discrete
 * values so it changes only when the step turns over. Dropped: the stage-moment logic
 * and glossary links. Added (UIUX §4.2): "Step 3 of 8 · Phase" as an eyebrow over a
 * larger headline that rises in on each step (`Reveal`; from below going forward, from
 * above going back, still under reduced motion).
 */

export interface StepCaptionProps {
  /** 0-based step on screen, or -1 for an empty run. */
  index: number;
  count: number;
  group?: string;
  label?: string;
  className?: string;
}

export const StepCaption = memo(function StepCaption({
  index,
  count,
  group,
  label,
  className,
}: StepCaptionProps) {
  return (
    <div role="status" className={cn('leading-snug text-pretty', className)}>
      {index >= 0 ? (
        <>
          <span className="text-fg-muted block text-xs font-semibold tracking-wide">
            <span className="font-mono text-(--tint,var(--accent))">
              Step {index + 1} of {count}
            </span>
            {group ? ` · ${group}` : ''}
            <span className="sr-only">: </span>
          </span>
          <Reveal trigger={index} className="text-lg font-medium md:text-xl">
            {label}
          </Reveal>
        </>
      ) : (
        <span className="text-fg-muted">Nothing to show yet.</span>
      )}
    </div>
  );
});
