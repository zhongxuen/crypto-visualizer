/**
 * Padding the message (FIPS 180-4 §5.1.1): append the byte `0x80` (a single 1 bit then
 * seven 0s), then zero bytes until the length is 56 mod 64, then the original length in
 * bits as a 64-bit big-endian number. The result is a whole number of 64-byte blocks.
 */

import { BLOCK_BYTES } from './constants';

/** How many zero bytes follow `0x80` for a message of `length` bytes. */
export function zeroPadLength(length: number): number {
  return (((55 - length) % BLOCK_BYTES) + BLOCK_BYTES) % BLOCK_BYTES;
}

/** Length of the padded message: a multiple of 64. */
export function paddedLength(length: number): number {
  return length + 1 + zeroPadLength(length) + 8;
}

/**
 * Write the padding for a message of `totalLength` bytes into `out` at `offset`: `0x80`,
 * the zeros, then the 64-bit bit length. Returns the offset after it.
 */
export function writePadding(
  out: Uint8Array,
  offset: number,
  totalLength: number,
): number {
  let at = offset;
  out[at++] = 0x80;
  const zeros = zeroPadLength(totalLength);
  out.fill(0, at, at + zeros);
  at += zeros;
  // The bit length can pass 2^32; both halves stay exact below 2^53.
  const bits = totalLength * 8;
  const high = Math.floor(bits / 0x1_0000_0000);
  const low = bits >>> 0;
  for (const [word, shift] of [
    [high, 24],
    [high, 16],
    [high, 8],
    [high, 0],
    [low, 24],
    [low, 16],
    [low, 8],
    [low, 0],
  ] as const) {
    out[at++] = (word >>> shift) & 0xff;
  }
  return at;
}

/** The message with its padding appended. */
export function padMessage(message: Uint8Array): Uint8Array {
  const out = new Uint8Array(paddedLength(message.length));
  out.set(message);
  writePadding(out, message.length, message.length);
  return out;
}
