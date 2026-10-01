import { dhExchangeRun, type DhInput } from '@/core/dh/dh';
import { dhEveRun } from '@/core/dh/eavesdropper';
import type { DhEvent } from '@/core/dh/events';
import { DEFAULT_MITM_MESSAGE, dhMitmRun } from '@/core/dh/mitm';
import { dhPaintRun } from '@/core/dh/paint';
import { getGroup } from '@/core/dh/params';
import { DH_DEFAULT_INPUT, DH_MITM_INPUT } from '@/core/dh/scenarios';
import type { DhScene, DhShareState } from '@/core/dh/state';
import type { SimResult } from '@/core/sim/result';

// For the page, which loads this file after hydration (`useDeferredImport`).
export { getGroup, isGroupId } from '@/core/dh/params';
export { ScenePicture } from './components/ScenePicture';

type Mode = 'walkthrough' | 'free';

/**
 * The walkthrough's inputs. Exchange and Eve share p = 23 with seed 1 (a = 6, b = 8), so
 * Eve attacks exactly the exchange the learner just watched. The MITM uses p = 467, big
 * enough that Mallory's two secrets can't collide by luck.
 */
export const DH_WALKTHROUGH = {
  exchange: DH_DEFAULT_INPUT,
  eve: DH_DEFAULT_INPUT,
  mitm: DH_MITM_INPUT,
  msg: DEFAULT_MITM_MESSAGE,
} as const;

/** The exchange input for a page state, after walkthrough/free play is resolved. */
export function dhInputFor(scene: DhScene, mode: Mode, state: DhShareState): DhInput {
  if (mode === 'walkthrough') {
    return scene === 'mitm' ? DH_WALKTHROUGH.mitm : DH_WALKTHROUGH.exchange;
  }
  const { input, seed } = state;
  return {
    group: input.group,
    seed,
    ...(input.a === undefined ? {} : { a: BigInt(input.a) }),
    ...(input.b === undefined ? {} : { b: BigInt(input.b) }),
  };
}

/** The MITM chapter's toy message: the user's, or 42 (or p − 1 when p ≤ 42). */
export function messageFor(mode: Mode, state: DhShareState): bigint {
  if (mode === 'walkthrough') return DH_WALKTHROUGH.msg;
  if (state.input.msg !== undefined) return BigInt(state.input.msg);
  const { p } = getGroup(state.input.group);
  return DEFAULT_MITM_MESSAGE < p ? DEFAULT_MITM_MESSAGE : p - 1n;
}

export interface DhRun {
  result: SimResult<DhEvent> | null;
  /** Why free play's input can't make this scene's run. */
  problem: string | null;
}

/**
 * The core run a scene shows. Core refuses bad input with a `RangeError` whose message
 * is written for the learner, which is shown instead of a run.
 */
export function dhRunFor(scene: DhScene, mode: Mode, state: DhShareState): DhRun {
  try {
    if (scene === 'paint') return { result: dhPaintRun(), problem: null };
    const input = dhInputFor(scene, mode, state);
    const result =
      scene === 'exchange'
        ? dhExchangeRun(input)
        : scene === 'eve'
          ? dhEveRun(input)
          : dhMitmRun(input, messageFor(mode, state));
    return { result, problem: null };
  } catch (error) {
    if (error instanceof RangeError) return { result: null, problem: error.message };
    throw error;
  }
}
