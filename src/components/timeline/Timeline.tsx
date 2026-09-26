'use client';

import { memo } from 'react';

import type { PhaseSummary } from '@/core/sim/result';
import { cn } from '@/lib/cn';

/**
 * The scrubber, over steps.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/Timeline.tsx` at 59ae4ad (see
 * VENDORED.md). Upstream scrubs virtual milliseconds and puts a focusable marker on each
 * phase. A crypto run is read step by step and can have 130 groups (two SHA-256 blocks
 * of 64 rounds), so here the slider's value is the **step index**, and the group marks
 * are decorative ticks: the phase stepper is the keyboard way to a group.
 *
 * A native `<input type="range">`: draggable, a real ARIA slider, and its arrows,
 * `Home` and `End` already do the right thing (`shouldIgnoreKey` leaves them to it).
 */

export interface TimelineProps {
  /** Number of steps in the run. */
  count: number;
  /** Step on screen. */
  index: number;
  phases: readonly PhaseSummary[];
  /** Virtual ms per step, to place the group ticks. */
  stepMs: number;
  onSeekStep: (index: number) => void;
  /** What the current step is, for the slider's spoken value. */
  label?: string;
  className?: string;
}

const THUMB =
  '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-accent ' +
  '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface [&::-moz-range-thumb]:bg-accent';

export const Timeline = memo(function Timeline({
  count,
  index,
  phases,
  stepMs,
  onSeekStep,
  label,
  className,
}: TimelineProps) {
  const empty = count <= 0;
  const last = Math.max(0, count - 1);
  const fraction = empty || last === 0 ? 0 : index / last;
  const valueText = empty
    ? 'No steps'
    : `Step ${index + 1} of ${count}${label ? `: ${label}` : ''}`;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="relative flex h-5 items-center">
        <div
          aria-hidden="true"
          className="bg-surface-overlay border-border absolute inset-x-0 h-1.5 rounded-full border"
        />
        <div
          aria-hidden="true"
          style={{ transform: `scaleX(${fraction})`, transformOrigin: 'left center' }}
          className="bg-accent absolute inset-x-0 h-1.5 rounded-full"
        />
        {/* Group boundaries: decorative, the phase stepper is the way to them. */}
        {last > 0
          ? phases.map((phase) => (
              <span
                key={phase.id}
                aria-hidden="true"
                className="bg-border-strong absolute top-0 h-1.5 w-px"
                style={{ left: `${(Math.round(phase.startMs / stepMs) / last) * 100}%` }}
              />
            ))
          : null}
        <input
          type="range"
          min={0}
          max={empty ? 1 : last}
          step={1}
          value={empty ? 0 : index}
          disabled={empty}
          onChange={(event) => onSeekStep(Number(event.target.value))}
          aria-label="Step"
          aria-valuetext={valueText}
          className={cn(
            'relative w-full cursor-pointer appearance-none bg-transparent',
            'focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-4',
            'disabled:cursor-not-allowed',
            THUMB,
          )}
        />
      </div>
      <div className="text-fg-muted flex justify-between font-mono text-xs">
        <span>
          Step {empty ? 0 : index + 1} / {count}
        </span>
      </div>
    </div>
  );
});
