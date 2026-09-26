/**
 * The message schedule (FIPS 180-4 §6.2.2 step 1): the block's 16 words become 64.
 *
 *   Wt = σ1(Wt−2) + Wt−7 + σ0(Wt−15) + Wt−16   (mod 2^32), for 16 ≤ t ≤ 63
 *
 * σ0 and σ1 (§4.1.2, equations 4.6 and 4.7) mix bits from far across each word, so a
 * change anywhere in the block spreads into every later word.
 */

/** ROTR^n (§3.2): rotate right by `n` bits. */
export function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/** σ0(x) = ROTR^7(x) ⊕ ROTR^18(x) ⊕ SHR^3(x) (§4.1.2, 4.6). */
export function smallSigma0(x: number): number {
  return (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
}

/** σ1(x) = ROTR^17(x) ⊕ ROTR^19(x) ⊕ SHR^10(x) (§4.1.2, 4.7). */
export function smallSigma1(x: number): number {
  return (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0;
}

/** Called for each word the schedule computes, t = 16..63. */
export type ScheduleTrace = (t: number, w: number, s0: number, s1: number) => void;

/** Fill `W[16..63]` from `W[0..15]`. `W` is a 64-word `Uint32Array`, so stores wrap. */
export function expandSchedule(W: Uint32Array, trace?: ScheduleTrace): void {
  for (let t = 16; t < 64; t += 1) {
    const s0 = smallSigma0(W[t - 15]);
    const s1 = smallSigma1(W[t - 2]);
    W[t] = s1 + W[t - 7] + s0 + W[t - 16];
    if (trace) trace(t, W[t], s0, s1);
  }
}
