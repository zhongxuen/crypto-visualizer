'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { stepIndexAt, timeOfStep } from '@/core/events/builder';
import {
  createPlayback,
  DEFAULT_SPEED,
  jumpToEnd,
  jumpToStart,
  pause as pauseState,
  play as playState,
  replayPhase as replayPhaseState,
  seek as seekState,
  setSpeed as setSpeedState,
  stepBack,
  stepEventBack,
  stepEventForward,
  stepForward,
  tick as tickState,
  timelineFrom,
  togglePlay,
  type PlaybackState,
  type PlaybackTimeline,
} from '@/core/sim/playback';
import type { SimResult } from '@/core/sim/result';

import type { PlaybackCommand } from './keymap';
import { useReducedMotion } from './useMediaQuery';

/**
 * Playback, wired to React.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/hooks/usePlayback.ts` at 59ae4ad
 * (see VENDORED.md). Kept: the Zustand store over the pure state machine in
 * `src/core/sim/playback.ts`, the single `requestAnimationFrame` loop that only runs
 * while playing, and the clamped frame delta. Dropped: the viewer-preference and
 * frame-clock plumbing tied to Internet Visualizer's canvas. Added: `seekStep` and
 * `useStepIndex`, because a crypto run is read one step at a time.
 *
 * Every rule about what play, seek and step do lives in core and is unit-tested there.
 * What's added here is somewhere to keep the state and something to move it.
 *
 * A module page owns its store: a global singleton would leak one module's playhead
 * into the next.
 */

export interface PlaybackActions {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(time: number): void;
  /** Jump to step `index` and pause there. */
  seekStep(index: number): void;
  /** Advance by `deltaMs` of real time. Called by the rAF loop; nothing else should. */
  tick(deltaMs: number): void;
  /** One phase boundary in `direction`. */
  stepPhase(direction: 1 | -1): void;
  /** One event in `direction`. */
  stepEvent(direction: 1 | -1): void;
  jumpTo(edge: 'start' | 'end'): void;
  setSpeed(speed: number): void;
  replayPhase(): void;
  /** Point playback at a different run. Resets to the start. */
  setTimeline(timeline: PlaybackTimeline): void;
  /** Run a command from the keyboard map. The one path shortcuts and buttons share. */
  run(command: PlaybackCommand): void;
}

export interface PlaybackStoreState extends PlaybackState, PlaybackActions {
  timeline: PlaybackTimeline;
}

export type PlaybackStore = StoreApi<PlaybackStoreState>;

type Transition = (state: PlaybackState, timeline: PlaybackTimeline) => PlaybackState;

export function createPlaybackStore(
  timeline: PlaybackTimeline,
  speed: number = DEFAULT_SPEED,
): PlaybackStore {
  return createStore<PlaybackStoreState>((set, get) => {
    /** Core transitions return the same object for a no-op, so nothing re-renders. */
    const apply = (transition: Transition) => {
      const state = get();
      const next = transition(state, state.timeline);
      if (next === state) return;
      set({ status: next.status, virtualTime: next.virtualTime, speed: next.speed });
    };

    return {
      ...createPlayback(speed),
      timeline,

      play: () => apply(playState),
      pause: () => apply(pauseState),
      toggle: () => apply(togglePlay),
      seek: (time) => apply((state, line) => seekState(state, line, time)),
      seekStep: (index) =>
        apply((state, line) => pauseState(seekState(state, line, timeOfStep(index)))),
      tick: (deltaMs) => apply((state, line) => tickState(state, line, deltaMs)),
      stepPhase: (direction) => apply(direction === 1 ? stepForward : stepBack),
      stepEvent: (direction) => apply(direction === 1 ? stepEventForward : stepEventBack),
      jumpTo: (edge) =>
        apply((state, line) => {
          if (edge === 'start') return jumpToStart(state, line);
          // The end of the run is one step past the last step's start. Resting on the
          // last step instead keeps it on screen, labelled as the step it is.
          const last = line.eventTimes[line.eventTimes.length - 1];
          return last === undefined
            ? jumpToEnd(state, line)
            : pauseState(seekState(state, line, last));
        }),
      setSpeed: (value) => apply((state) => setSpeedState(state, value)),
      replayPhase: () => apply(replayPhaseState),

      setTimeline: (next) => {
        if (next === get().timeline) return;
        set({ timeline: next, ...createPlayback(get().speed) });
      },

      run: (command) => {
        const actions = get();
        switch (command.type) {
          case 'toggle':
            return actions.toggle();
          case 'step-phase':
            return actions.stepPhase(command.direction);
          case 'step-event':
            return actions.stepEvent(command.direction);
          case 'jump':
            return actions.jumpTo(command.to);
          case 'speed':
            return actions.setSpeed(command.speed);
          case 'replay-phase':
            return actions.replayPhase();
        }
      },
    };
  });
}

/** Longest frame delta the loop will believe: a backgrounded tab resumes, not skips. */
const MAX_FRAME_MS = 100;

/** The product's one animation loop. Runs only while playing. */
function useRafLoop(store: PlaybackStore): void {
  const playing = useStore(store, (state) => state.status === 'playing');

  useEffect(() => {
    if (!playing || typeof requestAnimationFrame !== 'function') return;

    let frame = 0;
    let previous: number | null = null;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      if (previous !== null) {
        store.getState().tick(Math.min(now - previous, MAX_FRAME_MS));
      }
      previous = now;
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, store]);
}

export interface UsePlaybackOptions {
  /** The run to play. Changing it resets the playhead to the start. */
  result: SimResult;
  speed?: number;
  /** Start playing on mount. Ignored under reduced motion. */
  autoPlay?: boolean;
  /** Step to open on, e.g. from a share link. Clamped to the run. */
  initialStep?: number;
}

/** Create the playback store for a run and drive it. Call once per view. */
export function usePlayback({
  result,
  speed = DEFAULT_SPEED,
  autoPlay = false,
  initialStep = 0,
}: UsePlaybackOptions): PlaybackStore {
  const timeline = useMemo(() => timelineFrom(result), [result]);
  const [store] = useState(() => createPlaybackStore(timeline, speed));
  const reduced = useReducedMotion();

  useEffect(() => {
    store.getState().setTimeline(timeline);
    if (initialStep > 0) store.getState().seekStep(initialStep);
    // `initialStep` is read when the run changes, not tracked afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, timeline]);

  const shouldAutoPlay = autoPlay && !reduced;
  useEffect(() => {
    if (shouldAutoPlay) store.getState().play();
  }, [store, timeline, shouldAutoPlay]);

  useRafLoop(store);

  return store;
}

/** Read a slice of playback state. Re-renders only when the slice changes. */
export function usePlaybackState<T>(
  store: PlaybackStore,
  selector: (state: PlaybackStoreState) => T,
): T {
  return useStore(store, selector);
}

/**
 * The index of the step on screen. Re-renders only when the step changes, not on every
 * frame, which is what keeps a 350-step SHA-256 run smooth to scrub.
 */
export function useStepIndex(store: PlaybackStore, result: SimResult): number {
  return useStore(store, (state) => stepIndexAt(result, state.virtualTime));
}

/** The index of the phase containing the playhead, or `-1` before the first. */
export function usePhaseIndex(store: PlaybackStore, result: SimResult): number {
  return useStore(store, (state) => {
    const time = state.virtualTime;
    let index = -1;
    for (const phase of result.phases) {
      if (phase.startMs <= time + 1e-6) index = phase.index;
      else break;
    }
    return index;
  });
}
