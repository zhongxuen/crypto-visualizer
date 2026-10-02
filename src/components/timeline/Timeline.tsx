'use client';

import { memo } from 'react';

import type { PhaseSummary } from '@/core/sim/result';
import { cn } from '@/lib/cn';

/**
 * The scrubber, over steps, with the run's phases drawn as labelled segments of the
 * track (UIUX §4.2).
 *
 * ADAPTED from Internet Visualizer `src/components/viz/Timeline.tsx` at 59ae4ad (see
 * VENDORED.md). Upstream scrubs virtual milliseconds and puts a focusable marker on each
 * phase. A crypto run is read step by step and can have 130 groups (two SHA-256 blocks
 * of 64 rounds), so here the slider's value is the **step index**, and the phase
 * segments are decorative (their names show on hover): the phase stepper and Shift + an
 * arrow are the keyboard way to a phase.
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
  /** Virtual ms per step, to place the phase segments. */
  stepMs: number;
  onSeekStep: (index: number) => void;
  /** What the current step is, for the slider's spoken value. */
  label?: string;
  /** The current phase's name, printed under the track. */
  phase?: string;
  /** Printed after the step count, e.g. "about 2 min left". */
  remaining?: string;
  className?: string;
}

const THUMB =
  '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow ' +
  '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface [&::-moz-range-thumb]:bg-accent';

export const Timeline = memo(function Timeline({
  count,
  index,
  phases,
  stepMs,
  onSeekStep,
  label,
  phase,
  remaining,
  className,
}: TimelineProps) {
  const empty = count <= 0;
  const last = Math.max(0, count - 1);
  const fraction = empty || last === 0 ? 0 : index / last;
  const valueText = empty
    ? 'No steps'
    : `Step ${index + 1} of ${count}${label ? `: ${label}` : ''}`;
  /** Where a step sits along the track, as a percentage. */
  const at = (step: number) => (last === 0 ? 0 : (step / last) * 100);

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <div className="relative flex h-5 items-center">
        {/* Phase segments: decorative; the phase stepper is the way to them. */}
        <div aria-hidden="true" className="absolute inset-x-0 flex h-1.5">
          {last > 0 && phases.length > 0 ? (
            phases.map((p, i) => {
              const start = Math.round(p.startMs / stepMs);
              const end =
                i + 1 < phases.length
                  ? Math.round(phases[i + 1].startMs / stepMs)
                  : last + 1;
              const current = index >= start && index < end;
              return (
                <span
                  key={p.id}
                  title={p.title}
                  className={cn(
                    'absolute inset-y-0 rounded-full',
                    current ? 'bg-border-strong' : 'bg-surface-overlay',
                  )}
                  style={{
                    left: `${at(start)}%`,
                    width: `calc(${Math.max(0, at(Math.min(end, last)) - at(start))}% - 2px)`,
                    minWidth: '2px',
                  }}
                />
              );
            })
          ) : (
            <span className="bg-surface-overlay absolute inset-0 rounded-full" />
          )}
        </div>
        <div
          aria-hidden="true"
          style={{ transform: `scaleX(${fraction})`, transformOrigin: 'left center' }}
          className="bg-accent absolute inset-x-0 h-1.5 rounded-full opacity-80 transition-transform duration-(--dur-quick) ease-(--ease-out)"
        />
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
            'relative h-11 w-full cursor-pointer appearance-none bg-transparent md:h-5',
            'focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2',
            'disabled:cursor-not-allowed',
            THUMB,
          )}
        />
      </div>
      <div className="text-fg-muted flex min-w-0 justify-between gap-2 text-xs">
        <span className="truncate">{phase}</span>
        <span className="shrink-0 font-mono">
          {empty ? 0 : index + 1} / {count}
          {/* Only from lg: between md and lg the dock's buttons leave the scrubber too
              narrow, and the hint ran under the speed control. */}
          {remaining ? <span className="max-lg:hidden"> · {remaining}</span> : null}
        </span>
      </div>
    </div>
  );
});
