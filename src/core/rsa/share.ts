/**
 * The /rsa share state without its validator: the chapters, the modes, the defaults, and
 * a `load()` that imports the zod schema in `./state.ts` once a link is read or written
 * (`LazyShareState` in `../state/schema.ts`). Zod-free, so the page's first load is too.
 */

import type { LazyShareState } from '../state/schema';
import { RSA_DEFAULT_SEED, RSA_EXAMPLE } from './examples';
import type { RsaShareState } from './state';

export const RSA_CHAPTERS = ['keys', 'encrypt', 'sign', 'malleability'] as const;
export type RsaChapter = (typeof RSA_CHAPTERS)[number];

export const RSA_MODES = ['paper', 'realistic'] as const;

/** Digits in the largest message a 512-bit n takes. */
export const MAX_MESSAGE_DIGITS = 155;

export const RSA_SHARE: LazyShareState<RsaShareState> = {
  m: 'rsa',
  v: 1,
  defaults: {
    m: 'rsa',
    v: 1,
    seed: RSA_DEFAULT_SEED,
    step: 0,
    input: {
      chapter: 'keys',
      mode: 'paper',
      p: Number(RSA_EXAMPLE.p),
      q: Number(RSA_EXAMPLE.q),
      e: Number(RSA_EXAMPLE.e),
      msg: String(RSA_EXAMPLE.m),
      text: RSA_EXAMPLE.text,
      bits: 512,
    },
  },
  load: () => import('./state').then((module) => module.RSA_SHARE_STATE),
};
