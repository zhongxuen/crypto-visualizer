/**
 * The four round transformations and their inverses (FIPS 197 §5.1, §5.3).
 *
 * The state is 16 bytes in input order, which is column-major: byte `r + 4c` is row r,
 * column c (§3.4). Every function here works in place on that array.
 */

import { gmul, xtime } from './gf256';
import { INV_SBOX, SBOX } from './sbox';

/** State size in bytes. */
export const BLOCK_BYTES = 16;

/** Index of row `r`, column `c` in the state array (§3.4). */
export const cell = (r: number, c: number) => r + 4 * c;

/** SUBBYTES(): every byte through the S-box (§5.1.1). */
export function subBytes(state: Uint8Array): void {
  for (let i = 0; i < BLOCK_BYTES; i += 1) state[i] = SBOX[state[i]];
}

/** INVSUBBYTES() (§5.3.2). */
export function invSubBytes(state: Uint8Array): void {
  for (let i = 0; i < BLOCK_BYTES; i += 1) state[i] = INV_SBOX[state[i]];
}

/** SHIFTROWS(): row r moves r places left, s'[r][c] = s[r][(c + r) mod 4] (§5.1.2). */
export function shiftRows(state: Uint8Array): void {
  const copy = state.slice();
  for (let r = 1; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) state[cell(r, c)] = copy[cell(r, (c + r) % 4)];
  }
}

/** INVSHIFTROWS(): row r moves r places right (§5.3.1). */
export function invShiftRows(state: Uint8Array): void {
  const copy = state.slice();
  for (let r = 1; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) state[cell(r, (c + r) % 4)] = copy[cell(r, c)];
  }
}

/** The MixColumns matrix, row by row (§5.1.3, eq. 5.6). */
export const MIX_MATRIX: readonly (readonly number[])[] = [
  [2, 3, 1, 1],
  [1, 2, 3, 1],
  [1, 1, 2, 3],
  [3, 1, 1, 2],
];

/** The InvMixColumns matrix (§5.3.3, eq. 5.13). */
export const INV_MIX_MATRIX: readonly (readonly number[])[] = [
  [0x0e, 0x0b, 0x0d, 0x09],
  [0x09, 0x0e, 0x0b, 0x0d],
  [0x0d, 0x09, 0x0e, 0x0b],
  [0x0b, 0x0d, 0x09, 0x0e],
];

/** MIXCOLUMNS(): each column times the fixed matrix in GF(2^8) (§5.1.3). */
export function mixColumns(state: Uint8Array): void {
  for (let c = 0; c < 4; c += 1) {
    const i = 4 * c;
    const a0 = state[i];
    const a1 = state[i + 1];
    const a2 = state[i + 2];
    const a3 = state[i + 3];
    // {02}·a = xtime(a) and {03}·a = xtime(a) ⊕ a.
    state[i] = xtime(a0) ^ xtime(a1) ^ a1 ^ a2 ^ a3;
    state[i + 1] = a0 ^ xtime(a1) ^ xtime(a2) ^ a2 ^ a3;
    state[i + 2] = a0 ^ a1 ^ xtime(a2) ^ xtime(a3) ^ a3;
    state[i + 3] = xtime(a0) ^ a0 ^ a1 ^ a2 ^ xtime(a3);
  }
}

/** INVMIXCOLUMNS() (§5.3.3). */
export function invMixColumns(state: Uint8Array): void {
  for (let c = 0; c < 4; c += 1) {
    const column = state.slice(4 * c, 4 * c + 4);
    for (let r = 0; r < 4; r += 1) {
      const m = INV_MIX_MATRIX[r];
      state[cell(r, c)] =
        gmul(m[0], column[0]) ^
        gmul(m[1], column[1]) ^
        gmul(m[2], column[2]) ^
        gmul(m[3], column[3]);
    }
  }
}

/** ADDROUNDKEY(): XOR round key `round` from the expanded key bytes (§5.1.4). */
export function addRoundKey(
  state: Uint8Array,
  roundKeys: Uint8Array,
  round: number,
): void {
  const offset = BLOCK_BYTES * round;
  for (let i = 0; i < BLOCK_BYTES; i += 1) state[i] ^= roundKeys[offset + i];
}

/** One product in a MixColumns output cell: `coefficient • input = product`. */
export interface MixTerm {
  coefficient: number;
  input: number;
  product: number;
}

/**
 * The working behind MIXCOLUMNS() for the UI's column detail: for each output cell (in
 * state order), the four GF(2^8) products XORed to make it (§4.2, §5.1.3).
 */
export function mixColumnsTerms(state: Uint8Array): MixTerm[][] {
  const terms: MixTerm[][] = [];
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      terms.push(
        MIX_MATRIX[r].map((coefficient, k) => {
          const input = state[cell(k, c)];
          return { coefficient, input, product: gmul(coefficient, input) };
        }),
      );
    }
  }
  return terms;
}
