/**
 * Shared pieces of the mode runs (SP 800-38A): the per-block record the fast paths
 * report, the seeded IV and counter blocks, and the steps every run starts and ends with.
 */

import { bytesToHex } from '../../bytes/hex';
import type { RunBuilder } from '../../events/builder';
import { createRng } from '../../sim/rng';
import type { AesEvent, AesMode } from '../events';
import { padLength, pkcs7Pad } from '../padding';
import { BLOCK_BYTES } from '../round';

/** Longest plaintext a stepped mode run takes: 16 blocks, one step each. */
export const MAX_MODE_BLOCKS = 16;
export const MAX_MODE_BYTES = MAX_MODE_BLOCKS * BLOCK_BYTES - 1;

/** What a mode did with one block. The fast paths report it when asked. */
export interface ModeBlock {
  plaintext: Uint8Array;
  cipherInput: Uint8Array;
  cipherOutput: Uint8Array;
  ciphertext: Uint8Array;
  chain?: Uint8Array;
  counter?: Uint8Array;
}

export type OnBlock = (block: ModeBlock) => void;

export interface PaddingOption {
  /** PKCS#7 padding on encrypt, checked and removed on decrypt. Default `true`. */
  padding?: boolean;
}

export function assertWholeBlocks(data: Uint8Array, what: string): void {
  if (data.length % BLOCK_BYTES !== 0) {
    throw new RangeError(
      `${what} must be a whole number of ${BLOCK_BYTES}-byte blocks, got ${data.length} bytes`,
    );
  }
}

export function assertIv(iv: Uint8Array, what = 'IV'): void {
  if (iv.length !== BLOCK_BYTES) {
    throw new RangeError(`The ${what} must be ${BLOCK_BYTES} bytes, got ${iv.length}`);
  }
}

/**
 * A 16-byte CBC IV from the seeded rng. SP 800-38A Appendix C requires it to be
 * unpredictable; mulberry32 is not, which is fine for display and nothing else.
 */
export function seededIv(seed: number): Uint8Array {
  const rng = createRng(seed).fork('aes.iv');
  return Uint8Array.from({ length: BLOCK_BYTES }, () => rng.int(256));
}

/**
 * A CTR initial counter block: an 8-byte seeded nonce, then a 64-bit block counter from
 * zero (one of the constructions in SP 800-38A Appendix B.2).
 */
export function seededCounter(seed: number): Uint8Array {
  const rng = createRng(seed).fork('aes.ctr');
  const block = new Uint8Array(BLOCK_BYTES);
  for (let i = 0; i < 8; i += 1) block[i] = rng.int(256);
  return block;
}

export const blockHex = (bytes: Uint8Array | number[]) =>
  bytesToHex(Uint8Array.from(bytes)).replace(/(.{8})(?!$)/g, '$1 ');

/** The PKCS#7 step at the start of an ECB or CBC run. Returns the padded bytes. */
export function emitPadding(
  run: RunBuilder<AesEvent>,
  mode: AesMode,
  message: Uint8Array,
): Uint8Array {
  const padded = pkcs7Pad(message);
  const n = padLength(message.length);
  run.group(
    'Padding',
    () => {
      run.step({
        kind: 'aes.pad',
        id: `aes.${mode}.pad`,
        label: `Pad with ${n} byte${n === 1 ? '' : 's'} of value ${n}: ${message.length} bytes become ${padded.length}.`,
        detail:
          n === BLOCK_BYTES
            ? 'The message already fills whole blocks, so PKCS#7 adds a whole block of 0x10. Otherwise the receiver could not tell padding from data.'
            : 'PKCS#7 adds n bytes of value n. The receiver reads the last byte and strips that many.',
        citation: 'rfc5652.6.3',
        message: Array.from(message),
        padded: Array.from(padded),
        padLength: n,
      });
    },
    { id: 'padding', description: 'Fill the last block with PKCS#7 padding.' },
  );
  return padded;
}

/** Count distinct 16-byte blocks in `bytes`. */
export function distinctBlocks(bytes: Uint8Array): number {
  const seen = new Set<string>();
  for (let at = 0; at < bytes.length; at += BLOCK_BYTES) {
    seen.add(bytesToHex(bytes.subarray(at, at + BLOCK_BYTES)));
  }
  return seen.size;
}

export function assertStepped(message: Uint8Array, padded: boolean): void {
  const limit = padded ? MAX_MODE_BYTES : MAX_MODE_BLOCKS * BLOCK_BYTES;
  if (message.length > limit) {
    throw new RangeError(
      `A stepped mode run takes at most ${limit} bytes (${MAX_MODE_BLOCKS} blocks), got ${message.length}`,
    );
  }
}

/** The closing step of every mode run. */
export function emitModeResult(
  run: RunBuilder<AesEvent>,
  mode: AesMode,
  ciphertext: Uint8Array,
  citation: string,
): void {
  const blocks = Math.ceil(ciphertext.length / BLOCK_BYTES);
  const distinct = distinctBlocks(ciphertext);
  run.group(
    'Ciphertext',
    () => {
      run.step({
        kind: 'aes.modeResult',
        id: `aes.${mode}.result`,
        label: `${mode.toUpperCase()} ciphertext: ${ciphertext.length} bytes, ${distinct} distinct block${distinct === 1 ? '' : 's'} of ${blocks}.`,
        citation,
        mode,
        ciphertext: Array.from(ciphertext),
        distinctBlocks: distinct,
        blocks,
      });
    },
    { id: 'result', description: 'The whole ciphertext.' },
  );
}
