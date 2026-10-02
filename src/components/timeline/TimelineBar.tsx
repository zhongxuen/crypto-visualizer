'use client';

import { useEffect } from 'react';

import { STEP_MS } from '@/core/events/builder';
import type { SimResult } from '@/core/sim/result';
import { cn } from '@/lib/cn';

import { PlaybackControls } from './PlaybackControls';
import { Timeline } from './Timeline';
import {
  usePhaseIndex,
  usePlaybackState,
  useStepIndex,
  type PlaybackStore,
} from './usePlayback';

/**
 * The dock for one run: transport, the phase-segmented scrubber, speed, shortcuts and
 * "Copy link", wired to a playback store. `ModuleLayout` pins it to the bottom of the
 * page.
 *
 * It also publishes the playback speed as `--speed` on the page, which the motion
 * tokens divide by, so an operation's animation stays shorter than the step at 4x.
 */
export interface TimelineBarProps {
  store: PlaybackStore;
  result: SimResult<{ label: string }>;
  className?: string;
}

/** "about 2 min left" at the current speed, or nothing for under ten seconds. */
export function timeLeft(stepsLeft: number, speed: number): string | undefined {
  const seconds = (stepsLeft * STEP_MS) / 1000 / speed;
  if (seconds < 10) return undefined;
  if (seconds < 90) return `about ${Math.round(seconds / 10) * 10} s left`;
  return `about ${Math.round(seconds / 60)} min left`;
}

export function TimelineBar({ store, result, className }: TimelineBarProps) {
  const index = useStepIndex(store, result);
  const phaseIndex = usePhaseIndex(store, result);
  const status = usePlaybackState(store, (state) => state.status);
  const speed = usePlaybackState(store, (state) => state.speed);
  const count = result.events.length;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--speed', String(speed));
    return () => {
      root.style.removeProperty('--speed');
    };
  }, [speed]);

  return (
    <PlaybackControls
      status={status}
      speed={speed}
      atStart={index <= 0}
      atEnd={count > 0 && index === count - 1}
      onCommand={(command) => store.getState().run(command)}
      className={cn(className)}
    >
      <Timeline
        className="w-full"
        count={count}
        index={Math.max(0, index)}
        phases={result.phases}
        stepMs={STEP_MS}
        label={result.events[index]?.label}
        phase={result.phases[phaseIndex]?.title}
        remaining={
          count > 0 ? timeLeft(count - 1 - Math.max(0, index), speed) : undefined
        }
        onSeekStep={(step) => store.getState().seekStep(step)}
      />
    </PlaybackControls>
  );
}
