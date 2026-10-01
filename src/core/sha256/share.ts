/**
 * The /hashing share state without its validator: the chapters, the defaults, and a
 * `load()` that imports the zod schema in `./state.ts` once a link is read or written
 * (`LazyShareState` in `../state/schema.ts`). Zod-free, so the page's first load is too.
 */

import type { LazyShareState } from '../state/schema';
import type { HashingShareState } from './state';

export const HASHING_CHAPTERS = ['sha256', 'avalanche', 'hmac'] as const;
export type HashingChapter = (typeof HASHING_CHAPTERS)[number];

/** Longest HMAC key a link carries: enough for a key longer than one block. */
export const MAX_HMAC_KEY_BYTES = 131;

export const HASHING_SHARE: LazyShareState<HashingShareState> = {
  m: 'hashing',
  v: 1,
  defaults: {
    m: 'hashing',
    v: 1,
    seed: 0,
    step: 0,
    input: { chapter: 'sha256', message: 'abc', bit: 0, key: 'Jefe' },
  },
  load: () => import('./state').then((module) => module.HASHING_SHARE_STATE),
};
