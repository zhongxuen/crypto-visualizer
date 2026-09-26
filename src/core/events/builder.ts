/**
 * `createRun` -- turns a sequence of algorithm steps into a `SimResult`.
 *
 * The vendored playback runs on virtual time; crypto runs in discrete steps. Rather than
 * change the vendored code, every step gets a fixed virtual duration: step `n` starts at
 * `n * STEP_MS`, and the run lasts `steps * STEP_MS`, so the last step has as much room as
 * the others. `stepEventForward` / `stepEventBack` in `sim/playback.ts` then move exactly
 * one step, and `stepForward` / `stepBack` move one `group`.
 *
 * ```ts
 * const run = createRun<AesEvent>();
 * run.group('Key expansion', () => {
 *   run.step({ kind: 'aes.keyWord', id: 'aes.key.0', label: '...', citation: '...', ... });
 * });
 * return run.finish();
 * ```
 */

import { summarizePhases, type PhaseStart, type SimResult } from '../sim/result';
import type { EventBase } from './types';

/** Virtual milliseconds per step. At 1x playback, one step every 0.6 s. */
export const STEP_MS = 600;

/** Anything a run can hold: the shared fields plus a `kind` discriminator. */
export type StepEvent = EventBase & { kind: string };

export interface GroupOptions {
  /** Stable phase id. Defaults to the group's name. */
  id?: string;
  /** One or two sentences for the phase stepper. */
  description?: string;
  /** A plain-language sentence for beginners. */
  plain?: string;
}

export interface RunBuilder<E extends StepEvent> {
  /** Append one step. Inside `group`, the event's `group` defaults to the group name. */
  step(event: E): void;
  /**
   * Run `fn`, collecting its steps into one phase called `name`. Groups don't nest. A
   * group that adds no steps adds no phase.
   */
  group(name: string, fn: () => void, options?: GroupOptions): void;
  /** Number of steps so far. */
  readonly length: number;
  /** Produce the result. The builder can't be used afterwards. */
  finish(): SimResult<E>;
}

export function createRun<E extends StepEvent>(): RunBuilder<E> {
  const events: SimResult<E>['events'] = [];
  const phases: PhaseStart[] = [];
  const eventIds = new Set<string>();
  const phaseIds = new Set<string>();
  let currentGroup: string | null = null;
  let finished = false;

  function assertOpen(): void {
    if (finished) throw new Error('createRun: the run has already finished');
  }

  return {
    step(event) {
      assertOpen();
      if (eventIds.has(event.id)) {
        throw new Error(`createRun: duplicate event id "${event.id}"`);
      }
      eventIds.add(event.id);

      const grouped =
        currentGroup !== null && event.group === undefined
          ? { ...event, group: currentGroup }
          : { ...event };
      events.push({ ...grouped, at: events.length * STEP_MS });
    },

    group(name, fn, options = {}) {
      assertOpen();
      if (currentGroup !== null) {
        throw new Error(`createRun: group "${name}" is nested inside "${currentGroup}"`);
      }

      const id = options.id ?? name;
      if (phaseIds.has(id)) throw new Error(`createRun: duplicate group id "${id}"`);
      phaseIds.add(id);

      const firstStep = events.length;
      currentGroup = name;
      try {
        fn();
      } finally {
        currentGroup = null;
      }

      if (events.length === firstStep) return;
      phases.push({
        at: firstStep * STEP_MS,
        id,
        title: name,
        description: options.description ?? '',
        ...(options.plain === undefined ? {} : { plain: options.plain }),
      });
    },

    get length() {
      return events.length;
    },

    finish() {
      assertOpen();
      finished = true;
      const durationMs = events.length * STEP_MS;
      return { events, phases: summarizePhases(phases, durationMs), durationMs };
    },
  };
}

/**
 * Index of the step on screen at virtual time `time`: the last step that has started.
 * `-1` for a run with no steps.
 */
export function stepIndexAt(result: SimResult, time: number): number {
  const count = result.events.length;
  if (count === 0) return -1;
  if (!Number.isFinite(time) || time <= 0) return 0;
  return Math.min(count - 1, Math.floor(time / STEP_MS));
}

/** Virtual time at which step `index` starts. */
export function timeOfStep(index: number): number {
  return Math.max(0, Math.trunc(index)) * STEP_MS;
}
