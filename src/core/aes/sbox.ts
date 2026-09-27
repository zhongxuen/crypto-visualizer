/**
 * The AES S-box, computed rather than pasted (FIPS 197 §5.1.1).
 *
 * Each byte is replaced by its inverse in GF(2^8), then put through an affine transform
 * over GF(2): bit i of the output is
 *
 *   b_i ⊕ b_(i+4 mod 8) ⊕ b_(i+5 mod 8) ⊕ b_(i+6 mod 8) ⊕ b_(i+7 mod 8) ⊕ c_i,  c = 0x63.
 *
 * The differential test compares the result with the table printed in the standard.
 */

import { gfInverse } from './gf256';

/** The affine constant c = {63} (§5.1.1, eq. 5.2). */
export const AFFINE_CONSTANT = 0x63;

const rotl8 = (x: number, n: number) => ((x << n) | (x >> (8 - n))) & 0xff;

/** The affine transform of §5.1.1: XOR of four rotations of `b`, then {63}. */
export function affine(b: number): number {
  return (
    (b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ AFFINE_CONSTANT) & 0xff
  );
}

/** SBOX(b) worked out: the field inverse, then the affine transform. */
export function sboxParts(b: number): { input: number; inverse: number; output: number } {
  const inverse = gfInverse(b);
  return { input: b & 0xff, inverse, output: affine(inverse) };
}

function buildTables(): { sbox: Uint8Array; inverse: Uint8Array } {
  const sbox = new Uint8Array(256);
  const inverse = new Uint8Array(256);
  for (let b = 0; b < 256; b += 1) {
    const s = affine(gfInverse(b));
    sbox[b] = s;
    inverse[s] = b;
  }
  return { sbox, inverse };
}

const TABLES = buildTables();

/** SBOX(), indexed by the input byte. Computed once when the module loads. */
export const SBOX: Readonly<Uint8Array> = TABLES.sbox;

/** INVSBOX() (§5.3.2), the inverse permutation of `SBOX`. */
export const INV_SBOX: Readonly<Uint8Array> = TABLES.inverse;
