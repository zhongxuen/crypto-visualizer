/**
 * The toy run -- a small hand-written `SimResult` for the vendored playback tests.
 *
 * NOT vendored. `__tests__/playback.test.ts` (vendored unchanged) imports `buildToyRun`
 * from here and asserts on its timeline: phases at 0, 10 and 60, events at
 * 0, 8, 10, 16, 24, 54, 60, 90, 96 and 102, and a duration of 120. Internet Visualizer's
 * version is a two-hop ping built from networking types this project doesn't have, so
 * this one reproduces the same timeline with plain labelled events.
 *
 * Deterministic by construction: fixed numbers, no clock, no rng.
 */

import { summarizePhases, type PhaseStart, type SimResult } from './result';

export interface ToyEvent {
  label: string;
}

const DURATION_MS = 120;

const PHASES: PhaseStart[] = [
  { at: 0, id: 'compose', title: 'Compose', description: 'The first phase.' },
  { at: 10, id: 'request', title: 'Request', description: 'The second phase.' },
  { at: 60, id: 'reply', title: 'Reply', description: 'The third phase.' },
];

/** Several events share an instant on purpose: the timeline must deduplicate them. */
const EVENT_TIMES = [0, 0, 8, 10, 16, 16, 24, 54, 54, 60, 60, 90, 96, 102, 102];

/** A fresh object every call, so no caller can mutate another's copy. */
export function buildToyRun(): SimResult<ToyEvent> {
  return {
    events: EVENT_TIMES.map((at, index) => ({ at, label: `event ${index}` })),
    phases: summarizePhases(PHASES, DURATION_MS),
    durationMs: DURATION_MS,
  };
}
