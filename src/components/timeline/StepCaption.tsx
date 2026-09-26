'use client';

import { memo } from 'react';

import { cn } from '@/lib/cn';

/**
 * The step, told in one sentence: the one thing a run says out loud.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/StepCaption.tsx` at 59ae4ad (see
 * VENDORED.md). Kept: exactly one polite `role="status"` per view, handed only discrete
 * values so it changes only when the step turns over. Dropped: the stage-moment logic
 * and glossary links.
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
          <span className="text-accent block text-xs font-semibold tracking-wide">
            Step {index + 1} of {count}
            {group ? ` · ${group}` : ''}
            <span className="sr-only">: </span>
          </span>
          <span className="block font-medium">{label}</span>
        </>
      ) : (
        <span className="text-fg-muted">Nothing to show yet.</span>
      )}
    </div>
  );
});
