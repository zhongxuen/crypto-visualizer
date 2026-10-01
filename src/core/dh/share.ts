/**
 * The /dh share state without its validator: the scenes, the defaults, and a `load()`
 * that imports the zod schema in `./state.ts` once a link is read or written
 * (`LazyShareState` in `../state/schema.ts`). Zod-free, so the page's first load is too.
 */

import type { LazyShareState } from '../state/schema';
import { DH_DEFAULT_SEED } from './examples';
import type { DhShareState } from './state';

export const DH_SCENES = ['paint', 'exchange', 'eve', 'mitm'] as const;
export type DhScene = (typeof DH_SCENES)[number];

export const DH_SHARE: LazyShareState<DhShareState> = {
  m: 'dh',
  v: 1,
  defaults: {
    m: 'dh',
    v: 1,
    seed: DH_DEFAULT_SEED,
    step: 0,
    input: { scene: 'paint', group: 'p23' },
  },
  load: () => import('./state').then((module) => module.DH_SHARE_STATE),
};
