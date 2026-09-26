/**
 * Bit-level helpers. Bytes are `Uint8Array`; 32-bit words are `number`s kept unsigned
 * with `>>> 0`.
 *
 * Bit numbering, used by `bitDiff`: bit 0 is the **most significant** bit of byte 0, so
 * indices run left to right in the order `toBinary` prints them.
 */

function assertByte(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`Not a byte: ${value}`);
  }
}

/**
 * Eight binary digits per byte: `toBinary(0x41)` → `'01000001'`, and
 * `toBinary(Uint8Array.of(0x41, 0x42))` → `'01000001 01000010'`.
 */
export function toBinary(value: number | Uint8Array, separator = ' '): string {
  if (typeof value === 'number') {
    assertByte(value);
    return value.toString(2).padStart(8, '0');
  }
  return Array.from(value, (byte) => byte.toString(2).padStart(8, '0')).join(separator);
}

/** Byte-wise XOR of two equal-length arrays. */
export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new RangeError(`xorBytes needs equal lengths, got ${a.length} and ${b.length}`);
  }
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i] ^ b[i];
  return out;
}

/** Rotate a 32-bit word right by `n` bits (FIPS 180-4 §3.2 ROTR). `n` is taken mod 32. */
export function rotr32(word: number, n: number): number {
  const shift = ((n % 32) + 32) % 32;
  return ((word >>> shift) | (word << (32 - shift))) >>> 0;
}

/** Set bits in a 32-bit word, or in every byte of an array. */
export function popcount(value: number | Uint8Array): number {
  if (typeof value !== 'number') {
    let total = 0;
    for (const byte of value) total += popcount(byte);
    return total;
  }
  let x = value >>> 0;
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return Math.imul(x, 0x01010101) >>> 24;
}

/**
 * Indices of the bits that differ between two equal-length arrays, ascending (see the
 * numbering above). The avalanche demo draws these.
 */
export function bitDiff(a: Uint8Array, b: Uint8Array): number[] {
  if (a.length !== b.length) {
    throw new RangeError(`bitDiff needs equal lengths, got ${a.length} and ${b.length}`);
  }
  const flipped: number[] = [];
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] ^ b[i];
    if (diff === 0) continue;
    for (let bit = 0; bit < 8; bit += 1) {
      if (diff & (0x80 >> bit)) flipped.push(i * 8 + bit);
    }
  }
  return flipped;
}
