import { RSA_EXAMPLE, RSA_PAPER_INPUT } from '@/core/rsa/examples';
import type { RsaKeyInput } from '@/core/rsa/keygen';
import { rsaKeyRun } from '@/core/rsa/keygen';
import type { RsaShareState } from '@/core/rsa/state';

import type { RsaRun } from './runs';

/**
 * The keys chapter: the first screen, so it's in the route's first load. The other
 * chapters' runs (`./runs`, which reuses `keyInputFor`) load right after hydration
 * (`useDeferredImport`).
 */

/** The walkthrough's inputs: the hand-worked p = 61, q = 53, e = 17 and m = 65. */
export const RSA_WALKTHROUGH = {
  key: RSA_PAPER_INPUT,
  m: RSA_EXAMPLE.m,
  text: RSA_EXAMPLE.text,
} as const;

export type Mode = 'walkthrough' | 'free';

/** The key input for a page state, after walkthrough/free play is resolved. */
export function keyInputFor(mode: Mode, state: RsaShareState): RsaKeyInput {
  if (mode === 'walkthrough') return RSA_WALKTHROUGH.key;
  const { input, seed } = state;
  if (input.mode === 'realistic') return { mode: 'realistic', bits: input.bits, seed };
  return {
    mode: 'paper',
    seed,
    ...(input.p === undefined ? {} : { p: BigInt(input.p) }),
    ...(input.q === undefined ? {} : { q: BigInt(input.q) }),
    ...(input.e === undefined ? {} : { e: BigInt(input.e) }),
  };
}

/** Core refuses bad input with a `RangeError` written for the learner; show that instead. */
export function runOrProblem(build: () => RsaRun['result']): RsaRun {
  try {
    return { result: build(), problem: null };
  } catch (error) {
    if (error instanceof RangeError) return { result: null, problem: error.message };
    throw error;
  }
}

export function keysRunFor(mode: Mode, state: RsaShareState): RsaRun {
  return runOrProblem(() => rsaKeyRun(keyInputFor(mode, state)));
}
