/** The avalanche effect: the same `cipher` on two blocks one bit apart, round by round. */

import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import { assertBlock, changedCells, cipher } from './aes128';
import type { AesEvent } from './events';
import { expandKeyBytes, ROUNDS } from './keyExpansion';

/** Flip bit `bit` (0 = most significant bit of byte 0) of a copy of `block`. */
export function flipBlockBit(block: Uint8Array, bit: number): Uint8Array {
  if (!Number.isInteger(bit) || bit < 0 || bit >= block.length * 8) {
    throw new RangeError(`No bit ${bit} in a ${block.length}-byte block`);
  }
  const out = Uint8Array.from(block);
  out[bit >> 3] ^= 0x80 >> (bit & 7);
  return out;
}

function countBits(a: Uint8Array, b: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = a[i] ^ b[i];
    while (x) {
      count += x & 1;
      x >>= 1;
    }
  }
  return count;
}

/** The state at the end of each round 0–10 (after its AddRoundKey). */
export function roundStates(key: Uint8Array, block: Uint8Array): Uint8Array[] {
  assertBlock(block);
  const states: Uint8Array[] = [];
  cipher(block.slice(), expandKeyBytes(key), (op, _round, _before, after) => {
    if (op === 'addRoundKey') states.push(after);
  });
  return states;
}

/** Encrypt `block` and `block` with one bit flipped; compare the states round by round. */
export function avalancheRun(
  key: Uint8Array,
  block: Uint8Array,
  bit: number,
): SimResult<AesEvent> {
  const flippedBlock = flipBlockBit(block, bit);
  const a = roundStates(key, block);
  const b = roundStates(key, flippedBlock);
  const run = createRun<AesEvent>();
  run.group(
    'Avalanche',
    () => {
      run.step({
        kind: 'aes.avalanche',
        stage: 'flip',
        id: 'aes.avalanche.flip',
        label: `Flip one plaintext bit: bit ${bit % 8} of byte ${(bit >> 3) + 1}.`,
        citation: 'webster-tavares1985',
        round: -1,
        bit,
        stateA: Array.from(block),
        stateB: Array.from(flippedBlock),
        changed: changedCells(block, flippedBlock),
        flipped: 1,
      });
      for (let round = 0; round <= ROUNDS; round += 1) {
        const flipped = countBits(a[round], b[round]);
        const changed = changedCells(a[round], b[round]);
        run.step({
          kind: 'aes.avalanche',
          stage: 'round',
          id: `aes.avalanche.r${round}`,
          label: `After round ${round}: ${flipped} of 128 bits differ, in ${changed.length} of 16 bytes.`,
          detail:
            round === 0
              ? 'AddRoundKey XORs the same key into both, so the difference is still one bit.'
              : round <= 2
                ? 'SubBytes spreads a difference across its byte, ShiftRows and MixColumns spread it across the state.'
                : 'By now each output bit flips with probability about one half: the full avalanche.',
          citation: round === 0 ? 'fips197.5.1.4' : 'fips197.5.1',
          round,
          bit,
          stateA: Array.from(a[round]),
          stateB: Array.from(b[round]),
          changed,
          flipped,
        });
      }
    },
    {
      id: 'avalanche',
      description: 'One plaintext bit flipped, followed round by round.',
    },
  );
  return run.finish();
}
