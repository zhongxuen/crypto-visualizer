import type { PhaseSummary } from '@/core/sim/result';

/**
 * The phase list in the rail, with each block's eight "Rounds 1–8", "Rounds 9–16", ...
 * phases shown as one "Rounds 1–64" entry (UIUX §2.2, module 2). The run's own phases
 * are untouched: the dock and the phase keys still move eight rounds at a time, and the
 * round slider in the stage moves within the 64.
 */

const ROUNDS = / · Rounds \d+–\d+$/;

export interface MergedPhases {
  phases: PhaseSummary[];
  /** For each of the run's phases, the index of the entry it is shown under. */
  indexOf: number[];
}

export function mergeRoundPhases(phases: readonly PhaseSummary[]): MergedPhases {
  const merged: PhaseSummary[] = [];
  const indexOf: number[] = [];
  for (const phase of phases) {
    const last = merged[merged.length - 1];
    const prefix = phase.title.replace(ROUNDS, '');
    const isRounds = prefix !== phase.title;
    const title = `${prefix} · Rounds 1–64`;
    if (isRounds && last?.title === title) {
      last.endMs = phase.endMs;
    } else if (isRounds) {
      merged.push({
        ...phase,
        index: merged.length,
        id: `${phase.id.replace(/-rounds-\d+$/, '')}-rounds`,
        title,
        description:
          'All 64 rounds. The round slider above the picture moves through them.',
      });
    } else {
      merged.push({ ...phase, index: merged.length });
    }
    indexOf.push(merged.length - 1);
  }
  return { phases: merged, indexOf };
}
