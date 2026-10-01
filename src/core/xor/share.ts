/**
 * The /xor share state without its validator: the chapters, the defaults, and a `load()`
 * that imports the zod schema in `./state.ts` once a link is read or written
 * (`LazyShareState` in `../state/schema.ts`). Zod-free, so the page's first load is too.
 */

import type { LazyShareState } from '../state/schema';
import type { XorShareState } from './state';
import { TWO_TIME_PAD_EXAMPLE } from './twoTimePad';

export const XOR_CHAPTERS = ['bytes', 'xor', 'otp', 'ttp'] as const;
export type XorChapter = (typeof XOR_CHAPTERS)[number];

export const XOR_SHARE: LazyShareState<XorShareState> = {
  m: 'xor',
  v: 1,
  defaults: {
    m: 'xor',
    v: 1,
    seed: 1,
    step: 0,
    input: {
      chapter: 'bytes',
      a: TWO_TIME_PAD_EXAMPLE.p1,
      b: TWO_TIME_PAD_EXAMPLE.p2,
      crib: TWO_TIME_PAD_EXAMPLE.crib,
    },
  },
  load: () => import('./state').then((module) => module.XOR_SHARE_STATE),
};
