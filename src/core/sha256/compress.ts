/**
 * The SHA-256 compression function (FIPS 180-4 §6.2.2): the message schedule (step 1),
 * 64 rounds over the working variables a–h (steps 2–3), then adding them into the hash
 * value (step 4).
 *
 * One implementation serves both the stepped and the fast path. With no `trace` it runs
 * straight through; with one, it reports every schedule word and round. The only cost to
 * the fast path is an `if (trace)` per word and round, and it guarantees the version a
 * learner steps through is the version the tests check against node:crypto.
 *
 * The loop keeps words as signed 32-bit integers (`| 0`), not unsigned (`>>> 0`): a
 * value above 2^31 stored unsigned becomes a heap double in V8, and PBKDF2 runs this
 * 1.2 million times for one password. Rotations are written out inline for the same
 * reason. Bits are bits either way; values reported to a trace are converted to unsigned.
 * The named functions below (`bigSigma0`, `ch`, …) are the same formulas, exported for
 * the UI and tests, and `compress.test.ts` checks they agree with the loop.
 */

import { K } from './constants';
import { rotr, type ScheduleTrace } from './schedule';

/** Σ0(a) = ROTR^2 ⊕ ROTR^13 ⊕ ROTR^22 (§4.1.2, 4.4). */
export function bigSigma0(x: number): number {
  return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
}

/** Σ1(e) = ROTR^6 ⊕ ROTR^11 ⊕ ROTR^25 (§4.1.2, 4.5). */
export function bigSigma1(x: number): number {
  return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
}

/** Ch(e, f, g): for each bit, e chooses f (1) or g (0) (§4.1.2, 4.2). */
export function ch(e: number, f: number, g: number): number {
  return ((e & f) ^ (~e & g)) >>> 0;
}

/** Maj(a, b, c): each bit is the majority vote of the three (§4.1.2, 4.3). */
export function maj(a: number, b: number, c: number): number {
  return ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
}

export interface RoundParts {
  T1: number;
  T2: number;
  ch: number;
  maj: number;
  S0: number;
  S1: number;
  K: number;
  W: number;
}

export interface CompressTrace {
  schedule?: ScheduleTrace;
  round?: (t: number, before: number[], after: number[], parts: RoundParts) => void;
}

/** K as signed words, for the loop. */
const KS = Int32Array.from(K);

const unsigned = (words: number[]) => words.map((word) => word >>> 0);

/**
 * Compress one block into `H` (8 words, updated in place). `W` is a 64-word scratch
 * buffer whose first 16 words hold the block, big-endian. Both are `Uint32Array`s, so
 * stores wrap mod 2^32.
 */
export function compress(H: Uint32Array, W: Uint32Array, trace?: CompressTrace): void {
  // Step 1: the message schedule, W16..W63 (§6.2.2). σ0 and σ1 inline.
  const onSchedule = trace?.schedule;
  for (let t = 16; t < 64; t += 1) {
    const x = W[t - 15] | 0;
    const y = W[t - 2] | 0;
    const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
    const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
    W[t] = (s1 + (W[t - 7] | 0) + s0 + (W[t - 16] | 0)) | 0;
    if (onSchedule) onSchedule(t, W[t], s0 >>> 0, s1 >>> 0);
  }

  // Step 2: initialise the working variables.
  let a = H[0] | 0;
  let b = H[1] | 0;
  let c = H[2] | 0;
  let d = H[3] | 0;
  let e = H[4] | 0;
  let f = H[5] | 0;
  let g = H[6] | 0;
  let h = H[7] | 0;

  // Step 3: 64 rounds. Σ1, Ch, Σ0 and Maj inline.
  const onRound = trace?.round;
  for (let t = 0; t < 64; t += 1) {
    const S1 =
      ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const choose = (e & f) ^ (~e & g);
    const T1 = (h + S1 + choose + KS[t] + (W[t] | 0)) | 0;
    const S0 =
      ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const T2 = (S0 + majority) | 0;

    const before = onRound ? [a, b, c, d, e, f, g, h] : undefined;

    h = g;
    g = f;
    f = e;
    e = (d + T1) | 0;
    d = c;
    c = b;
    b = a;
    a = (T1 + T2) | 0;

    if (onRound && before) {
      onRound(t, unsigned(before), unsigned([a, b, c, d, e, f, g, h]), {
        T1: T1 >>> 0,
        T2: T2 >>> 0,
        ch: choose >>> 0,
        maj: majority >>> 0,
        S0: S0 >>> 0,
        S1: S1 >>> 0,
        K: K[t],
        W: W[t],
      });
    }
  }

  // Step 4: the intermediate hash value.
  H[0] = (H[0] | 0) + a;
  H[1] = (H[1] | 0) + b;
  H[2] = (H[2] | 0) + c;
  H[3] = (H[3] | 0) + d;
  H[4] = (H[4] | 0) + e;
  H[5] = (H[5] | 0) + f;
  H[6] = (H[6] | 0) + g;
  H[7] = (H[7] | 0) + h;
}

/** Load 16 big-endian words from `bytes` at `offset` into `W[0..15]`. */
export function loadBlock(W: Uint32Array, bytes: Uint8Array, offset: number): void {
  for (let i = 0; i < 16; i += 1) {
    const at = offset + 4 * i;
    W[i] =
      (bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3];
  }
}
