'use client';

import { Check, CircleDot } from 'lucide-react';
import { memo } from 'react';

import type { PhaseSummary } from '@/core/sim/result';
import { cn } from '@/lib/cn';

/**
 * The groups of the run, in order, with the current one marked.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/PhaseStepper.tsx` at 59ae4ad (see
 * VENDORED.md). Kept: an ordered list with a real button per group that seeks, and the
 * current group marked by an icon and the word "Now" as well as colour. Dropped: the
 * glossary links and the Simple / Full detail voices. Under reduced motion this list is
 * the primary way through a run.
 *
 * A long run (SHA-256 has 64 round groups per block) scrolls inside its own box, which
 * gets a tab stop and a name so the scroll area is reachable by keyboard.
 */

export interface PhaseStepperProps {
  phases: readonly PhaseSummary[];
  currentIndex: number;
  onSeek: (time: number) => void;
  className?: string;
}

export const PhaseStepper = memo(function PhaseStepper({
  phases,
  currentIndex,
  onSeek,
  className,
}: PhaseStepperProps) {
  if (phases.length === 0) {
    return (
      <p className={cn('text-fg-muted text-sm', className)}>This run has no groups.</p>
    );
  }

  return (
    <ol aria-label="Groups" className={cn('flex flex-col gap-0.5', className)}>
      {phases.map((phase) => {
        const current = phase.index === currentIndex;
        const done = phase.index < currentIndex;
        return (
          <li key={phase.id}>
            <button
              type="button"
              onClick={() => onSeek(phase.startMs)}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'focus-visible:outline-focus flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-sm focus-visible:outline-2',
                current
                  ? 'border-accent bg-surface-overlay'
                  : 'hover:bg-surface-overlay border-transparent',
              )}
            >
              <span className="text-fg-muted w-6 shrink-0 font-mono text-xs tabular-nums">
                {phase.index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn('block', current ? 'font-semibold' : 'text-fg-secondary')}
                >
                  {phase.title}
                </span>
                {current && phase.description ? (
                  <span className="text-fg-muted block text-xs">{phase.description}</span>
                ) : null}
              </span>
              <span className="text-fg-muted flex shrink-0 items-center gap-0.5 text-xs">
                {current ? (
                  <>
                    <CircleDot aria-hidden="true" className="text-accent size-3" />
                    Now
                  </>
                ) : done ? (
                  <>
                    <Check aria-hidden="true" className="size-3" />
                    <span className="sr-only">Finished</span>
                  </>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
});
