/** The avalanche effect: the fast path on two messages one bit apart. */

import { toBinary } from '../bytes/bits';
import { bytesToHex } from '../bytes/hex';
import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import { DIGEST_BYTES } from './constants';
import type { Sha256Event } from './events';
import { sha256 } from './sha256';

/** Flip bit `bit` (0 = most significant bit of byte 0) of a copy of `message`. */
export function flipBit(message: Uint8Array, bit: number): Uint8Array {
  if (!Number.isInteger(bit) || bit < 0 || bit >= message.length * 8) {
    throw new RangeError(`No bit ${bit} in a ${message.length}-byte message`);
  }
  const out = Uint8Array.from(message);
  out[bit >> 3] ^= 0x80 >> (bit & 7);
  return out;
}

/** Hash `message` and `message` with one bit flipped, and compare the digests. */
export function avalancheRun(message: Uint8Array, bit: number): SimResult<Sha256Event> {
  const b = flipBit(message, bit);
  const digestA = Array.from(sha256(message));
  const digestB = Array.from(sha256(b));
  let flipped = 0;
  for (let i = 0; i < DIGEST_BYTES; i += 1) {
    let x = digestA[i] ^ digestB[i];
    while (x) {
      flipped += x & 1;
      x >>= 1;
    }
  }
  const base = {
    kind: 'sha256.avalanche' as const,
    a: Array.from(message),
    b: Array.from(b),
    bit,
    digestA,
    digestB,
    flipped,
  };
  const byte = bit >> 3;
  const run = createRun<Sha256Event>();
  run.group(
    'Avalanche',
    () => {
      run.step({
        ...base,
        stage: 'flip',
        id: 'sha256.avalanche.flip',
        label: `Flip one bit: bit ${bit % 8} of byte ${byte + 1}, ${toBinary(message[byte])} → ${toBinary(b[byte])}.`,
        citation: 'webster-tavares1985',
      });
      run.step({
        ...base,
        stage: 'hashA',
        id: 'sha256.avalanche.a',
        label: `SHA-256 of the original: ${bytesToHex(Uint8Array.from(digestA))}.`,
        citation: 'fips180-4.6.2.2',
      });
      run.step({
        ...base,
        stage: 'hashB',
        id: 'sha256.avalanche.b',
        label: `SHA-256 with one bit flipped: ${bytesToHex(Uint8Array.from(digestB))}.`,
        citation: 'fips180-4.6.2.2',
      });
      run.step({
        ...base,
        stage: 'diff',
        id: 'sha256.avalanche.diff',
        label: `${flipped} of 256 output bits changed (${((flipped / 256) * 100).toFixed(1)}%).`,
        detail:
          'A good hash changes each output bit with probability one half when any input bit flips, so about 128 bits change and there is no pattern to which.',
        citation: 'webster-tavares1985',
      });
    },
    {
      id: 'avalanche',
      description: 'One input bit flipped; about half the output flips.',
    },
  );
  return run.finish();
}
