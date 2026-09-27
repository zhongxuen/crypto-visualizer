import type { RsaEvent } from '@/core/rsa/events';
import type { RsaKeyInput } from '@/core/rsa/keygen';
import { rsaKeyRun } from '@/core/rsa/keygen';
import { rsaMalleabilityRun } from '@/core/rsa/malleability';
import { rsaEncryptRun } from '@/core/rsa/rsa';
import { RSA_EXAMPLE, RSA_PAPER_INPUT } from '@/core/rsa/scenarios';
import { rsaSignRun } from '@/core/rsa/sign';
import type { RsaChapter, RsaShareState } from '@/core/rsa/state';
import type { SimResult } from '@/core/sim/result';

/** The walkthrough's inputs: the hand-worked p = 61, q = 53, e = 17 and m = 65. */
export const RSA_WALKTHROUGH = {
  key: RSA_PAPER_INPUT,
  m: RSA_EXAMPLE.m,
  text: RSA_EXAMPLE.text,
} as const;

type Mode = 'walkthrough' | 'free';

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

export interface RsaRun {
  result: SimResult<RsaEvent> | null;
  /** Why free play's input can't make this chapter's run. */
  problem: string | null;
}

/**
 * The core run a chapter shows. Core refuses bad input with a `RangeError` whose message
 * is written for the learner, which is shown instead of a run.
 */
export function rsaRunFor(chapter: RsaChapter, mode: Mode, state: RsaShareState): RsaRun {
  const key = keyInputFor(mode, state);
  const m = mode === 'walkthrough' ? RSA_WALKTHROUGH.m : BigInt(state.input.msg || '0');
  const text = mode === 'walkthrough' ? RSA_WALKTHROUGH.text : state.input.text;
  try {
    const result =
      chapter === 'keys'
        ? rsaKeyRun(key)
        : chapter === 'encrypt'
          ? rsaEncryptRun(key, m)
          : chapter === 'sign'
            ? rsaSignRun(key, text)
            : rsaMalleabilityRun(key, m);
    return { result, problem: null };
  } catch (error) {
    if (error instanceof RangeError) return { result: null, problem: error.message };
    throw error;
  }
}
