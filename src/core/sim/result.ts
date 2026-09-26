/**
 * `SimResult` -- what a finished run hands to the renderer.
 *
 * ADAPTED from Internet Visualizer `src/core/sim/result.ts` at 59ae4ad (see VENDORED.md).
 * The upstream file types `events` as its networking `SimEvent` union and carries a
 * `pdus` map, both imported from Internet Visualizer's `src/core/types`, which this project
 * does not have. Here the result is generic over the event type and has no `pdus`.
 * Everything `playback.ts` reads -- `events[].at`, `phases[].startMs`, `durationMs` -- has
 * the same name, type and meaning, which is what lets `playback.ts` stay byte-identical.
 */

/** Any event placed on the virtual timeline. */
export interface TimedEvent {
  /** Virtual millisecond the event happens at. */
  at: number;
}

/** An event of type `E`, placed on the timeline. */
export type Timed<E> = E & TimedEvent;

/**
 * One chapter of the story, with its extent on the timeline.
 *
 * The stepper, the timeline markers, and `stepForward`/`stepBack` all navigate this list.
 */
export interface PhaseSummary {
  /** Position in `SimResult.phases`, so a stepper can move by index without a lookup. */
  index: number;
  /** Stable across runs -- safe to put in a URL or a test. */
  id: string;
  /** Short human title, e.g. `'Round 3'`. */
  title: string;
  /** One or two sentences explaining what happens in this phase. */
  description: string;
  /** Virtual millisecond the phase begins. */
  startMs: number;
  /**
   * Virtual millisecond the phase ends -- the next phase's `startMs`, or the run's
   * `durationMs` for the last phase. Treated as a half-open interval `[startMs, endMs)`
   * everywhere, so exactly one phase is current at any time.
   */
  endMs: number;
  /** A plain-language sentence, when the run wrote one. */
  plain?: string;
}

/**
 * The complete output of one run.
 *
 * Deterministic by contract: the same scenario and seed produce a deep-equal `SimResult`,
 * which is what lets tests compare two runs with `toStrictEqual`.
 */
export interface SimResult<E = unknown> {
  /** Every event, sorted by `at` (non-decreasing). */
  events: Timed<E>[];
  /** The phase index; see `summarizePhases`. */
  phases: PhaseSummary[];
  /** Total virtual duration in milliseconds -- the far end of the timeline. */
  durationMs: number;
}

/** Where a phase starts, before its end is known. */
export interface PhaseStart {
  at: number;
  id: string;
  title: string;
  description: string;
  plain?: string;
}

/**
 * Build the phase index from phase starts, in order.
 *
 * The one place phase boundaries are computed. Each phase ends where the next begins,
 * and the last ends at `durationMs` (or at its own start, if the run is shorter than its
 * final phase -- an empty phase is preferable to a negative one).
 *
 * `plain` is copied only when present. A summary never carries `plain: undefined`: the
 * determinism guard compares runs with `toStrictEqual`, and a key that is
 * present-but-undefined is a difference a consumer can see.
 */
export function summarizePhases(
  starts: readonly PhaseStart[],
  durationMs: number,
): PhaseSummary[] {
  return starts.map((start, index) => {
    const next = starts[index + 1];
    const endMs = next ? next.at : Math.max(durationMs, start.at);

    return {
      index,
      id: start.id,
      title: start.title,
      description: start.description,
      startMs: start.at,
      endMs,
      ...(start.plain === undefined ? {} : { plain: start.plain }),
    };
  });
}
