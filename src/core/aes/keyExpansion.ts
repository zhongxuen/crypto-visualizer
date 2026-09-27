/**
 * KEYEXPANSION() for AES-128 (FIPS 197 §5.2): 16 key bytes become 44 words, w[0..43],
 * four per round key. Words are unsigned 32-bit numbers, first byte most significant, as
 * the standard prints them (`w0 = 2b7e1516`).
 *
 * For i ≥ 4, w[i] = w[i−4] ⊕ temp, where temp is w[i−1], except when i mod 4 = 0: then
 * temp = SUBWORD(ROTWORD(w[i−1])) ⊕ Rcon[i/4].
 */

import { SBOX } from './sbox';

/** Nk, Nr and the schedule length for AES-128 (§5, Table 3). */
export const KEY_BYTES = 16;
export const ROUNDS = 10;
export const SCHEDULE_WORDS = 4 * (ROUNDS + 1);

/** Rcon[j] = x^(j−1) in GF(2^8), in the first byte of the word (§5.2, Table 5). */
export const RCON: readonly number[] = [
  0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36,
].map((byte) => (byte << 24) >>> 0);

/** ROTWORD([a0, a1, a2, a3]) = [a1, a2, a3, a0] (§5.2). */
export function rotWord(word: number): number {
  return ((word << 8) | (word >>> 24)) >>> 0;
}

/** SUBWORD(): the S-box on each of the four bytes (§5.2). */
export function subWord(word: number): number {
  return (
    ((SBOX[word >>> 24] << 24) |
      (SBOX[(word >>> 16) & 0xff] << 16) |
      (SBOX[(word >>> 8) & 0xff] << 8) |
      SBOX[word & 0xff]) >>>
    0
  );
}

/** How one word w[i] was made. `rot`, `sub`, `rcon` and `afterRcon` only when i mod 4 = 0. */
export interface KeyWordTrace {
  i: number;
  /** w[i−1] (for i ≥ 4). */
  temp: number;
  rot?: number;
  sub?: number;
  rcon?: number;
  afterRcon?: number;
  /** w[i−4] (for i ≥ 4). */
  back: number;
  word: number;
}

function assertKey(key: Uint8Array): void {
  if (key.length !== KEY_BYTES) {
    throw new RangeError(`AES-128 takes a ${KEY_BYTES}-byte key, got ${key.length}`);
  }
}

/** Expand a 16-byte key into 44 words. `trace` receives every word in order. */
export function expandKey(
  key: Uint8Array,
  trace?: (step: KeyWordTrace) => void,
): Uint32Array {
  assertKey(key);
  const w = new Uint32Array(SCHEDULE_WORDS);
  for (let i = 0; i < 4; i += 1) {
    w[i] =
      ((key[4 * i] << 24) |
        (key[4 * i + 1] << 16) |
        (key[4 * i + 2] << 8) |
        key[4 * i + 3]) >>>
      0;
    trace?.({ i, temp: 0, back: 0, word: w[i] });
  }
  for (let i = 4; i < SCHEDULE_WORDS; i += 1) {
    const temp = w[i - 1];
    if (i % 4 === 0) {
      const rot = rotWord(temp);
      const sub = subWord(rot);
      const rcon = RCON[i / 4 - 1];
      const afterRcon = (sub ^ rcon) >>> 0;
      w[i] = w[i - 4] ^ afterRcon;
      trace?.({ i, temp, rot, sub, rcon, afterRcon, back: w[i - 4], word: w[i] });
    } else {
      w[i] = w[i - 4] ^ temp;
      trace?.({ i, temp, back: w[i - 4], word: w[i] });
    }
  }
  return w;
}

/** The 176 round-key bytes: round key r is bytes 16r..16r+15, in state order. */
export function roundKeyBytes(w: Uint32Array): Uint8Array {
  const out = new Uint8Array(4 * w.length);
  for (let i = 0; i < w.length; i += 1) {
    out[4 * i] = w[i] >>> 24;
    out[4 * i + 1] = (w[i] >>> 16) & 0xff;
    out[4 * i + 2] = (w[i] >>> 8) & 0xff;
    out[4 * i + 3] = w[i] & 0xff;
  }
  return out;
}

/** Expand `key` straight to round-key bytes: what the cipher uses. */
export function expandKeyBytes(key: Uint8Array): Uint8Array {
  return roundKeyBytes(expandKey(key));
}
