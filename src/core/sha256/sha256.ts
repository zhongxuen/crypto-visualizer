/**
 * SHA-256 (FIPS 180-4), one implementation with an emit switch.
 *
 * - `sha256(bytes)` is the fast path: no events, any length. PBKDF2 and HMAC use it.
 * - `sha256Run(bytes)` (`./run`) is the stepped path: the same `hashInto` loop with a
 *   block emitter attached, which turns each padding, block, schedule word, round and
 *   addition into an event. Capped at three blocks (183 bytes), about 350 steps. It lives
 *   in its own file so a page that only needs digests (the passwords table) doesn't ship
 *   the step text. The avalanche run (`./avalanche`) uses the fast path.
 *
 * Because both go through `hashInto` and `compress`, a test that checks the fast path
 * against node:crypto also checks the code a learner steps through, and a separate test
 * checks the two produce the same digest.
 */

import { compress, loadBlock } from './compress';
import { BLOCK_BYTES, DIGEST_BYTES, H0 } from './constants';
import { padMessage, paddedLength, writePadding } from './pad';

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

/**
 * What the stepped path (`./run`) attaches to `hashInto`: it runs `compress` on the block
 * itself, with a trace, and turns what that did into events.
 */
export type BlockEmitter = (
  H: Uint32Array,
  W: Uint32Array,
  padded: Uint8Array,
  block: number,
  blocks: number,
) => void;

/** Compress every block of an already padded message into `H`. */
export function hashInto(
  H: Uint32Array,
  padded: Uint8Array,
  emit: BlockEmitter | null,
): void {
  const W = new Uint32Array(64);
  const blocks = padded.length / BLOCK_BYTES;
  for (let block = 0; block < blocks; block += 1) {
    loadBlock(W, padded, block * BLOCK_BYTES);
    if (!emit) {
      compress(H, W);
      continue;
    }
    emit(H, W, padded, block, blocks);
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
