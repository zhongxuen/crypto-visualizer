/**
 * The default seed and inputs for the built-in Diffie-Hellman runs, on their own so a page can read them
 * without importing every run builder in `./scenarios.ts` (phase 10's JS budget).
 * `./share.ts` and the module's first-screen run use these; `./scenarios.ts` re-exports
 * them.
 */

import type { DhInput } from './dh';

/** The default seed for private keys. */
export const DH_DEFAULT_SEED = 1;

/** The default exchange: the smallest group, small enough for the modular clock. */
export const DH_DEFAULT_INPUT: DhInput = { group: 'p23', seed: DH_DEFAULT_SEED };

/** MITM and Eve default to p = 467: big enough that a lucky collision is unlikely. */
export const DH_MITM_INPUT: DhInput = { group: 'p467', seed: DH_DEFAULT_SEED };
