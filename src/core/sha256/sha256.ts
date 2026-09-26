/**
 * SHA-256 (FIPS 180-4), one implementation with an emit switch.
 *
 * - `sha256(bytes)` is the fast path: no events, any length. PBKDF2 and HMAC use it.
 * - `sha256Run(bytes)` is the stepped path: the same `hashInto` loop with a `Run`
 *   attached, which turns each padding, block, schedule word, round and addition into an
 *   event. Capped at three blocks (183 bytes), about 350 steps.
 *
 * Because both go through `hashInto` and `compress`, a test that checks the fast path
 * against node:crypto also checks the code a learner steps through, and a separate test
 * checks the two produce the same digest.
 */

import { toBinary } from '../bytes/bits';
import { bytesToHex } from '../bytes/hex';
import { createRun, type RunBuilder } from '../events/builder';
import type { SimResult } from '../sim/result';
import { compress, loadBlock, type RoundParts } from './compress';
import { BLOCK_BYTES, DIGEST_BYTES, H0 } from './constants';
import type { Sha256Event } from './events';
import { padMessage, paddedLength, writePadding, zeroPadLength } from './pad';

/** Longest message the stepped path takes: three blocks, less 9 bytes of padding. */
export const MAX_STEPPED_BYTES = 3 * BLOCK_BYTES - 9;

/** Rounds per phase in a stepped run, so Shift + arrow jumps a readable distance. */
export const ROUNDS_PER_GROUP = 8;

/** A fresh copy of the initial hash value H(0) (§5.3.3). */
export function initialState(): Uint32Array {
  return Uint32Array.from(H0);
}

/** The hash value as 32 big-endian bytes. */
export function stateToBytes(H: Uint32Array): Uint8Array {
  const out = new Uint8Array(DIGEST_BYTES);
  for (let i = 0; i < 8; i += 1) {
    out[4 * i] = H[i] >>> 24;
    out[4 * i + 1] = (H[i] >>> 16) & 0xff;
    out[4 * i + 2] = (H[i] >>> 8) & 0xff;
    out[4 * i + 3] = H[i] & 0xff;
  }
  return out;
}

const hex32 = (word: number) => word.toString(16).padStart(8, '0');

/** Compress every block of an already padded message into `H`. */
function hashInto(
  H: Uint32Array,
  padded: Uint8Array,
  run: RunBuilder<Sha256Event> | null,
): void {
  const W = new Uint32Array(64);
  const blocks = padded.length / BLOCK_BYTES;
  for (let block = 0; block < blocks; block += 1) {
    loadBlock(W, padded, block * BLOCK_BYTES);
    if (!run) {
      compress(H, W);
      continue;
    }
    emitBlock(run, H, W, padded, block, blocks);
  }
}

/** Fast path: the digest of `message`. Any length. */
export function sha256(message: Uint8Array): Uint8Array {
  const H = initialState();
  hashInto(H, padMessage(message), null);
  return stateToBytes(H);
}

/**
 * Finish a hash whose first `prefixLength` bytes (a multiple of 64) are already
 * compressed into `H`: process `rest`, then pad for the total length. `H` is updated.
 * HMAC and PBKDF2 use this to reuse the hashed key block.
 */
export function sha256Finish(
  H: Uint32Array,
  prefixLength: number,
  rest: Uint8Array,
): Uint8Array {
  if (prefixLength % BLOCK_BYTES !== 0) {
    throw new RangeError('sha256Finish: the prefix must be whole blocks');
  }
  const total = prefixLength + rest.length;
  const tail = new Uint8Array(paddedLength(total) - prefixLength);
  tail.set(rest);
  writePadding(tail, rest.length, total);
  hashInto(H, tail, null);
  return stateToBytes(H);
}

/** Compress exactly one 64-byte block into `H`. */
export function sha256Block(H: Uint32Array, block: Uint8Array, offset = 0): void {
  const W = new Uint32Array(64);
  loadBlock(W, block, offset);
  compress(H, W);
}

function emitBlock(
  run: RunBuilder<Sha256Event>,
  H: Uint32Array,
  W: Uint32Array,
  padded: Uint8Array,
  block: number,
  blocks: number,
): void {
  const n = block + 1;
  const previous = Array.from(H);
  const bytes = Array.from(
    padded.subarray(block * BLOCK_BYTES, (block + 1) * BLOCK_BYTES),
  );
  const words = Array.from(W.subarray(0, 16));
  let working: number[] = previous;
  const rounds: [number, number[], number[], RoundParts][] = [];
  const schedule: [number, number, number, number, number[]][] = [];

  // Compute first, then emit, so groups can be laid out cleanly. The work is the same
  // `compress` the fast path runs; the trace only records what it did.
  compress(H, W, {
    schedule: (t, w, s0, s1) => {
      schedule.push([t, w, s0, s1, Array.from(W.subarray(0, t + 1))]);
    },
    round: (t, before, after, parts) => {
      rounds.push([t, before, after, parts]);
      working = after;
    },
  });

  run.group(
    `Block ${n}`,
    () => {
      run.step({
        kind: 'sha256.block',
        id: `sha256.b${n}.block`,
        label: `Block ${n} of ${blocks}: 64 bytes read as sixteen 32-bit words, W0 to W15.`,
        detail:
          block === 0
            ? 'The working variables a–h start from H(0), the first 32 bits of the fractional parts of the square roots of the first eight primes.'
            : `The working variables start from the hash value block ${block} left behind.`,
        citation: 'fips180-4.5.2.1',
        block,
        blocks,
        bytes,
        words,
        H: previous,
      });
    },
    { id: `block-${n}`, description: 'Split the block into sixteen words.' },
  );

  run.group(
    `Block ${n} · Schedule`,
    () => {
      for (const [t, w, s0, s1, soFar] of schedule) {
        run.step({
          kind: 'sha256.schedule',
          id: `sha256.b${n}.w${t}`,
          label: `W${t} = σ1(W${t - 2}) + W${t - 7} + σ0(W${t - 15}) + W${t - 16} = ${hex32(w)}.`,
          detail:
            'σ0 and σ1 rotate and shift a word three ways and XOR the results, so every bit of the block reaches every later word.',
          citation: 'fips180-4.6.2.2-1',
          block,
          t,
          w,
          s0,
          s1,
          inputs: [soFar[t - 2], soFar[t - 7], soFar[t - 15], soFar[t - 16]],
          W: soFar,
        });
      }
    },
    { id: `block-${n}-schedule`, description: 'Stretch 16 words into 64: W16 to W63.' },
  );

  for (let start = 0; start < 64; start += ROUNDS_PER_GROUP) {
    const end = start + ROUNDS_PER_GROUP;
    run.group(
      `Block ${n} · Rounds ${start + 1}–${end}`,
      () => {
        for (const [t, before, after, parts] of rounds.slice(start, end)) {
          run.step({
            kind: 'sha256.round',
            id: `sha256.b${n}.r${t}`,
            group: `Block ${n} · Round ${t + 1}`,
            label: `Round ${t + 1}: a becomes ${hex32(after[0])}, e becomes ${hex32(after[4])}; the rest shift down.`,
            detail:
              'T1 = h + Σ1(e) + Ch(e,f,g) + Kt + Wt and T2 = Σ0(a) + Maj(a,b,c). The new a is T1 + T2, the new e is d + T1, and b, c, d, f, g, h each take the value of the letter before.',
            citation: 'fips180-4.6.2.2-3',
            block,
            t,
            before,
            after,
            ...parts,
          });
        }
      },
      {
        id: `block-${n}-rounds-${start + 1}`,
        description: `Rounds ${start + 1} to ${end} of 64.`,
      },
    );
  }

  run.group(
    `Block ${n} · Add`,
    () => {
      run.step({
        kind: 'sha256.add',
        id: `sha256.b${n}.add`,
        label: 'Add a–h into the hash value: H0–H7 += a–h.',
        detail:
          'Adding the input back in (a Davies–Meyer feed-forward) is what makes the rounds impossible to run backwards to the message.',
        citation: 'fips180-4.6.2.2-4',
        block,
        previous,
        working,
        H: Array.from(H),
      });
    },
    { id: `block-${n}-add`, description: 'Fold the rounds into the running hash value.' },
  );
}

export interface Sha256RunResult {
  result: SimResult<Sha256Event>;
  digest: Uint8Array;
}

/** Stepped path. Throws `RangeError` above `MAX_STEPPED_BYTES`. */
export function sha256Run(message: Uint8Array): SimResult<Sha256Event> {
  return sha256Stepped(message).result;
}

export function sha256Stepped(message: Uint8Array): Sha256RunResult {
  if (message.length > MAX_STEPPED_BYTES) {
    throw new RangeError(
      `Stepped SHA-256 takes at most ${MAX_STEPPED_BYTES} bytes (three blocks), got ${message.length}`,
    );
  }
  const run = createRun<Sha256Event>();
  const padded = padMessage(message);
  const zeros = zeroPadLength(message.length);

  run.group(
    'Padding',
    () => {
      run.step({
        kind: 'sha256.pad',
        id: 'sha256.pad',
        label: `Append 0x80, ${zeros} zero byte${zeros === 1 ? '' : 's'}, then the length: ${message.length * 8} bits.`,
        detail: `The padded message is ${padded.length} bytes: ${padded.length / BLOCK_BYTES} block${padded.length === BLOCK_BYTES ? '' : 's'} of 64. The length at the end means two different messages never pad to the same thing.`,
        citation: 'fips180-4.5.1.1',
        message: Array.from(message),
        padded: Array.from(padded),
        zeros,
        bitLength: message.length * 8,
      });
    },
    { id: 'padding', description: 'Make the message a whole number of 512-bit blocks.' },
  );

  const H = initialState();
  hashInto(H, padded, run);
  const digest = stateToBytes(H);

  run.group(
    'Digest',
    () => {
      run.step({
        kind: 'sha256.digest',
        id: 'sha256.digest',
        label: `The digest: ${bytesToHex(digest)}.`,
        detail: 'H0 to H7 written out as 32 bytes, big-endian.',
        citation: 'fips180-4.6.2.2',
        H: Array.from(H),
        digest: Array.from(digest),
      });
    },
    { id: 'digest', description: 'The final hash value.' },
  );

  return { result: run.finish(), digest };
}

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
