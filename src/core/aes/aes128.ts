/**
 * AES-128 (FIPS 197), one implementation with an emit switch.
 *
 * - `encryptBlock(key, block)` is the fast path: no events. The modes use
 *   `encryptWithRoundKeys`, which skips re-expanding the key for every block.
 * - `encryptBlock(key, block, { emit: true })` is the stepped path: the same `cipher`
 *   loop with a trace attached, which turns each SubBytes, ShiftRows, MixColumns and
 *   AddRoundKey into an event with the state before and after. 42 steps, one group per
 *   round.
 *
 * Both run through `cipher`, so a test that checks the fast path against node:crypto
 * also checks the code a learner steps through.
 *
 * `decryptBlock` is the inverse cipher (§5.3), fast path only: the UI describes
 * decryption as the same steps run backwards.
 *
 * The key schedule's run (`./keyScheduleRun`) and the avalanche run (`./avalanche`) are
 * in their own files, so the first screen of the AES page doesn't ship their step text.
 */

import { bytesToHex } from '../bytes/hex';
import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import type { AesEvent } from './events';
import { expandKeyBytes, ROUNDS } from './keyExpansion';
import {
  addRoundKey,
  BLOCK_BYTES,
  invMixColumns,
  invShiftRows,
  invSubBytes,
  mixColumns,
  mixColumnsTerms,
  shiftRows,
  subBytes,
} from './round';

export type AesOperation = 'subBytes' | 'shiftRows' | 'mixColumns' | 'addRoundKey';

/** Called after each transformation with the state before and after it. */
export type CipherTrace = (
  op: AesOperation,
  round: number,
  before: Uint8Array,
  after: Uint8Array,
) => void;

export function assertBlock(block: Uint8Array, name = 'block'): void {
  if (block.length !== BLOCK_BYTES) {
    throw new RangeError(`AES takes a ${BLOCK_BYTES}-byte ${name}, got ${block.length}`);
  }
}

/** CIPHER() (§5.1) on `state` in place, with round keys from `expandKeyBytes`. */
export function cipher(
  state: Uint8Array,
  roundKeys: Uint8Array,
  trace?: CipherTrace,
): void {
  const apply = (op: AesOperation, round: number, fn: () => void) => {
    if (!trace) {
      fn();
      return;
    }
    const before = state.slice();
    fn();
    trace(op, round, before, state.slice());
  };

  apply('addRoundKey', 0, () => addRoundKey(state, roundKeys, 0));
  for (let round = 1; round <= ROUNDS; round += 1) {
    apply('subBytes', round, () => subBytes(state));
    apply('shiftRows', round, () => shiftRows(state));
    if (round < ROUNDS) apply('mixColumns', round, () => mixColumns(state));
    apply('addRoundKey', round, () => addRoundKey(state, roundKeys, round));
  }
}

/** INVCIPHER() (§5.3) on `state` in place. */
export function invCipher(state: Uint8Array, roundKeys: Uint8Array): void {
  addRoundKey(state, roundKeys, ROUNDS);
  for (let round = ROUNDS - 1; round >= 0; round -= 1) {
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, roundKeys, round);
    if (round > 0) invMixColumns(state);
  }
}

/** Encrypt one block with already expanded round keys. Returns a new array. */
export function encryptWithRoundKeys(
  roundKeys: Uint8Array,
  block: Uint8Array,
): Uint8Array {
  assertBlock(block);
  const state = block.slice();
  cipher(state, roundKeys);
  return state;
}

/** Decrypt one block with already expanded round keys. Returns a new array. */
export function decryptWithRoundKeys(
  roundKeys: Uint8Array,
  block: Uint8Array,
): Uint8Array {
  assertBlock(block);
  const state = block.slice();
  invCipher(state, roundKeys);
  return state;
}

export interface AesBlockRun {
  ciphertext: Uint8Array;
  result: SimResult<AesEvent>;
}

/** Fast path: one block. */
export function encryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array;
/** Stepped path: one block, and a run with every sub-step as an event. */
export function encryptBlock(
  key: Uint8Array,
  block: Uint8Array,
  options: { emit: true },
): AesBlockRun;
export function encryptBlock(
  key: Uint8Array,
  block: Uint8Array,
  options?: { emit?: boolean },
): Uint8Array | AesBlockRun {
  if (!options?.emit) return encryptWithRoundKeys(expandKeyBytes(key), block);
  return encryptStepped(key, block);
}

/** INVCIPHER() on one block, fast path only. */
export function decryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  return decryptWithRoundKeys(expandKeyBytes(key), block);
}

/** Which of the 16 state bytes differ. */
export const changedCells = (before: Uint8Array, after: Uint8Array) => {
  const changed: number[] = [];
  for (let i = 0; i < BLOCK_BYTES; i += 1) if (before[i] !== after[i]) changed.push(i);
  return changed;
};

const hex = (bytes: Uint8Array | number[]) => bytesToHex(Uint8Array.from(bytes));

const OP_TEXT: Record<AesOperation, { label: string; detail: string; citation: string }> =
  {
    subBytes: {
      label: 'SubBytes: every byte replaced through the S-box.',
      detail:
        'The S-box is the inverse in GF(2^8) followed by a fixed affine map. It is the only non-linear step in AES, and it is what stops the cipher being solvable as a system of linear equations.',
      citation: 'fips197.5.1.1',
    },
    shiftRows: {
      label: 'ShiftRows: row r moves r places to the left.',
      detail:
        'Row 0 stays, row 1 moves one place, row 2 two, row 3 three. Each column now holds one byte from every column before it.',
      citation: 'fips197.5.1.2',
    },
    mixColumns: {
      label: 'MixColumns: each column multiplied by a fixed matrix in GF(2^8).',
      detail:
        'Every output byte depends on all four bytes of its column. With ShiftRows, one changed byte reaches the whole state after two rounds.',
      citation: 'fips197.5.1.3',
    },
    addRoundKey: {
      label: 'AddRoundKey: XOR the state with this round’s key.',
      detail:
        'The only step that uses the key. Everything else is public and fixed; without the key it would all be undone step by step.',
      citation: 'fips197.5.1.4',
    },
  };

const OP_ID: Record<AesOperation, string> = {
  subBytes: 'sub',
  shiftRows: 'shift',
  mixColumns: 'mix',
  addRoundKey: 'ark',
};

function encryptStepped(key: Uint8Array, block: Uint8Array): AesBlockRun {
  assertBlock(block);
  const roundKeys = expandKeyBytes(key);
  const steps: [AesOperation, number, Uint8Array, Uint8Array][] = [];
  const state = block.slice();
  cipher(state, roundKeys, (op, round, before, after) => {
    steps.push([op, round, before, after]);
  });

  const run = createRun<AesEvent>();

  run.group(
    'Input',
    () => {
      run.step({
        kind: 'aes.input',
        id: 'aes.input',
        label: `The 16 plaintext bytes fill the 4×4 state, column by column: ${hex(block)}.`,
        detail:
          'Byte 0 goes to row 0, column 0; byte 1 to row 1, column 0; and so on down each column.',
        citation: 'fips197.3.4',
        plaintext: Array.from(block),
        key: Array.from(key),
        state: Array.from(block),
      });
    },
    { id: 'input', description: 'Load the block into the state.' },
  );

  for (let round = 0; round <= ROUNDS; round += 1) {
    const inRound = steps.filter(([, r]) => r === round);
    run.group(
      `Round ${round}`,
      () => {
        for (const [op, , before, after] of inRound) {
          const text = OP_TEXT[op];
          const base = {
            id: `aes.r${round}.${OP_ID[op]}`,
            label:
              round === 0
                ? 'Initial AddRoundKey: XOR the state with the key itself (round key 0).'
                : text.label,
            detail: text.detail,
            citation: text.citation,
            round,
            before: Array.from(before),
            after: Array.from(after),
            changed: changedCells(before, after),
          };
          if (op === 'addRoundKey') {
            run.step({
              ...base,
              kind: 'aes.addRoundKey',
              roundKey: Array.from(roundKeys.subarray(16 * round, 16 * round + 16)),
            });
          } else if (op === 'mixColumns') {
            run.step({ ...base, kind: 'aes.mixColumns', terms: mixColumnsTerms(before) });
          } else {
            run.step({
              ...base,
              kind: op === 'subBytes' ? 'aes.subBytes' : 'aes.shiftRows',
            });
          }
        }
      },
      {
        id: `round-${round}`,
        description:
          round === 0
            ? 'Mix the key in before the first round.'
            : round === ROUNDS
              ? 'The last round: SubBytes, ShiftRows and AddRoundKey, with no MixColumns.'
              : 'SubBytes, ShiftRows, MixColumns, AddRoundKey.',
      },
    );
  }

  run.group(
    'Output',
    () => {
      run.step({
        kind: 'aes.output',
        id: 'aes.output',
        label: `The ciphertext, read out column by column: ${hex(state)}.`,
        detail:
          'Ten rounds for a 128-bit key. Decryption runs the inverse of each step in reverse order with the same round keys.',
        citation: 'fips197.5.1',
        state: Array.from(state),
        ciphertext: Array.from(state),
      });
    },
    { id: 'output', description: 'Read the ciphertext out of the state.' },
  );

  return { ciphertext: state, result: run.finish() };
}
