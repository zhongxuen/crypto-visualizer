'use client';

import { useEffect, useRef } from 'react';

import type { SimResult } from '@/core/sim/result';

import {
  usePhaseIndex,
  usePlayback,
  useStepIndex,
  type PlaybackStore,
} from './usePlayback';
import { usePlaybackKeys } from './usePlaybackKeys';

/**
 * Everything a module page needs to show one run: the playback store with the keyboard
 * bound, the step and group on screen, and that step's event.
 *
 * `initialStep` is applied whenever it changes to a new value that differs from the
 * step on screen, which is how a share link's step lands once the URL has been read.
 * `onStep` reports every step change, which is how the step goes back into the link.
 */
export interface RunView<E> {
  store: PlaybackStore;
  index: number;
  phaseIndex: number;
  event: E | undefined;
  atEnd: boolean;
}

export function useRunView<E extends { label: string }>(
  result: SimResult<E>,
  {
    initialStep,
    onStep,
    keys = true,
  }: { initialStep?: number; onStep?: (index: number) => void; keys?: boolean } = {},
): RunView<SimResult<E>['events'][number]> {
  const store = usePlayback({ result });
  usePlaybackKeys(store, keys);
  const index = useStepIndex(store, result);
  const phaseIndex = usePhaseIndex(store, result);

  const applied = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (initialStep === undefined || initialStep === applied.current) return;
    applied.current = initialStep;
    const last = result.events.length - 1;
    if (last >= 0) store.getState().seekStep(Math.min(initialStep, last));
  }, [initialStep, result, store]);

  const report = useRef(onStep);
  useEffect(() => {
    report.current = onStep;
  });
  useEffect(() => {
    if (index >= 0) report.current?.(index);
  }, [index]);

  return {
    store,
    index,
    phaseIndex,
    event: index >= 0 ? result.events[index] : undefined,
    atEnd: result.events.length > 0 && index === result.events.length - 1,
  };
}
