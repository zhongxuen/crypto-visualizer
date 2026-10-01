/**
 * The hand-worked RSA example and default seed, on their own so a page can read them
 * without importing every run builder in `./scenarios.ts` (phase 10's JS budget).
 * `./share.ts` and the module's first-screen run use these; `./scenarios.ts` re-exports
 * them.
 */

import type { RsaKeyInput } from './keygen';

/**
 * The hand-worked example: p = 61, q = 53, e = 17 gives n = 3233, φ(n) = 3120 and
 * d = 2753, and m = 65 encrypts to c = 2790.
 */
export const RSA_EXAMPLE = {
  p: 61n,
  q: 53n,
  e: 17n,
  n: 3233n,
  phi: 3120n,
  d: 2753n,
  m: 65n,
  c: 2790n,
  text: 'Pay Bob 10',
} as const;

/** The default seed for realistic-mode primes. */
export const RSA_DEFAULT_SEED = 1;

export const RSA_PAPER_INPUT: RsaKeyInput = {
  mode: 'paper',
  p: RSA_EXAMPLE.p,
  q: RSA_EXAMPLE.q,
  e: RSA_EXAMPLE.e,
  seed: RSA_DEFAULT_SEED,
};
