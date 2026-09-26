/**
 * The SHA-256 compression function (FIPS 180-4 §6.2.2 steps 2–4): 64 rounds over the
 * working variables a–h, then add them into the hash value.
 *
 * One implementation serves both the stepped and the fast path. With no `trace` it runs
 * straight through; with one, it reports every schedule word and round. The only cost to
 * the fast path is an `if (trace)` per round, and it guarantees the version a learner
 * steps through is the version the tests check against node:crypto.
 */

import { K } from './constants';
import { expandSchedule, rotr, type ScheduleTrace } from './schedule';

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

/**
 * Compress one block into `H` (8 words, updated in place). `W` is a 64-word scratch
 * buffer whose first 16 words hold the block, big-endian.
 */
export function compress(H: Uint32Array, W: Uint32Array, trace?: CompressTrace): void {
  expandSchedule(W, trace?.schedule);

  let a = H[0];
  let b = H[1];
  let c = H[2];
  let d = H[3];
  let e = H[4];
  let f = H[5];
  let g = H[6];
  let h = H[7];

  for (let t = 0; t < 64; t += 1) {
    const S1 = bigSigma1(e);
    const choose = ch(e, f, g);
    const T1 = (h + S1 + choose + K[t] + W[t]) >>> 0;
    const S0 = bigSigma0(a);
    const majority = maj(a, b, c);
    const T2 = (S0 + majority) >>> 0;

    const before = trace?.round ? [a, b, c, d, e, f, g, h] : undefined;

    h = g;
    g = f;
    f = e;
    e = (d + T1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (T1 + T2) >>> 0;

    if (before) {
      trace!.round!(t, before, [a, b, c, d, e, f, g, h], {
        T1,
        T2,
        ch: choose,
        maj: majority,
        S0,
        S1,
        K: K[t],
        W: W[t],
      });
    }
  }

  H[0] += a;
  H[1] += b;
  H[2] += c;
  H[3] += d;
  H[4] += e;
  H[5] += f;
  H[6] += g;
  H[7] += h;
}

/** Load 16 big-endian words from `bytes` at `offset` into `W[0..15]`. */
export function loadBlock(W: Uint32Array, bytes: Uint8Array, offset: number): void {
  for (let i = 0; i < 16; i += 1) {
    const at = offset + 4 * i;
    W[i] =
      (bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3];
  }
}
