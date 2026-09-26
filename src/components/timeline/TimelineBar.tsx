'use client';

import { STEP_MS } from '@/core/events/builder';
import type { SimResult } from '@/core/sim/result';
import { cn } from '@/lib/cn';

import { PlaybackControls } from './PlaybackControls';
import { Timeline } from './Timeline';
import { usePlaybackState, useStepIndex, type PlaybackStore } from './usePlayback';

/**
 * The whole transport bar for one run: buttons, speed and the scrubber, wired to a
 * playback store. `ModuleLayout` pins it to the bottom of the page.
 */
export interface TimelineBarProps {
  store: PlaybackStore;
  result: SimResult<{ label: string }>;
  className?: string;
}

export function TimelineBar({ store, result, className }: TimelineBarProps) {
  const index = useStepIndex(store, result);
  const status = usePlaybackState(store, (state) => state.status);
  const speed = usePlaybackState(store, (state) => state.speed);
  const count = result.events.length;

  return (
    <PlaybackControls
      status={status}
      speed={speed}
      atEnd={count > 0 && index === count - 1}
      onCommand={(command) => store.getState().run(command)}
      className={cn(className)}
    >
      <Timeline
        className="w-full min-w-40"
        count={count}
        index={Math.max(0, index)}
        phases={result.phases}
        stepMs={STEP_MS}
        label={result.events[index]?.label}
        onSeekStep={(step) => store.getState().seekStep(step)}
      />
    </PlaybackControls>
  );
}
