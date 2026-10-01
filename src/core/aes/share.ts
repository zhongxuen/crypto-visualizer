/**
 * The /aes share state without its validator: the chapters, the modes, the defaults, and
 * a `load()` that imports the zod schema in `./state.ts` once a link is read or written
 * (`LazyShareState` in `../state/schema.ts`). Zod-free, so the page's first load is too.
 */

import type { LazyShareState } from '../state/schema';
import { AES_DEFAULT_SEED, AES_EXAMPLES } from './examples';
import type { AesShareState } from './state';

export const AES_CHAPTERS = [
  'block',
  'keys',
  'avalanche',
  'modes',
  'penguin',
  'gcm',
] as const;
export type AesChapter = (typeof AES_CHAPTERS)[number];

export const AES_MODES = ['ecb', 'cbc', 'ctr'] as const;

export const AES_SHARE: LazyShareState<AesShareState> = {
  m: 'aes',
  v: 1,
  defaults: {
    m: 'aes',
    v: 1,
    seed: AES_DEFAULT_SEED,
    step: 0,
    input: {
      chapter: 'block',
      mode: 'ecb',
      keyHex: AES_EXAMPLES.appendixB.keyHex,
      ptHex: AES_EXAMPLES.appendixB.ptHex,
      bit: 0,
    },
  },
  load: () => import('./state').then((module) => module.AES_SHARE_STATE),
};
