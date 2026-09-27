/**
 * Electronic Codebook mode (SP 800-38A §6.1): C_j = CIPH_K(P_j), each block on its own.
 * Equal plaintext blocks give equal ciphertext blocks, which is the leak the penguin
 * shows.
 */

import { bytesToHex } from '../../bytes/hex';
import { createRun } from '../../events/builder';
import type { SimResult } from '../../sim/result';
import { decryptWithRoundKeys, encryptWithRoundKeys } from '../aes128';
import type { AesEvent } from '../events';
import { expandKeyBytes } from '../keyExpansion';
import { pkcs7Pad, pkcs7Unpad } from '../padding';
import { BLOCK_BYTES } from '../round';
import {
  assertStepped,
  assertWholeBlocks,
  blockHex,
  emitModeResult,
  emitPadding,
  type ModeBlock,
  type OnBlock,
  type PaddingOption,
} from './common';

export function ecbEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  { padding = true }: PaddingOption = {},
  onBlock?: OnBlock,
): Uint8Array {
  const input = padding ? pkcs7Pad(plaintext) : plaintext;
  assertWholeBlocks(input, 'ECB plaintext');
  const roundKeys = expandKeyBytes(key);
  const out = new Uint8Array(input.length);
  for (let at = 0; at < input.length; at += BLOCK_BYTES) {
    const block = input.subarray(at, at + BLOCK_BYTES);
    const c = encryptWithRoundKeys(roundKeys, block);
    out.set(c, at);
    onBlock?.({
      plaintext: block.slice(),
      cipherInput: block.slice(),
      cipherOutput: c,
      ciphertext: c,
    });
  }
  return out;
}

export function ecbDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  { padding = true }: PaddingOption = {},
): Uint8Array {
  assertWholeBlocks(ciphertext, 'ECB ciphertext');
  const roundKeys = expandKeyBytes(key);
  const out = new Uint8Array(ciphertext.length);
  for (let at = 0; at < ciphertext.length; at += BLOCK_BYTES) {
    out.set(
      decryptWithRoundKeys(roundKeys, ciphertext.subarray(at, at + BLOCK_BYTES)),
      at,
    );
  }
  return padding ? pkcs7Unpad(out) : out;
}

/** ECB, stepped: padding, one event per block, then the ciphertext. */
export function ecbRun(key: Uint8Array, plaintext: Uint8Array): SimResult<AesEvent> {
  assertStepped(plaintext, true);
  const run = createRun<AesEvent>();
  const padded = emitPadding(run, 'ecb', plaintext);
  const records: ModeBlock[] = [];
  const ciphertext = ecbEncrypt(key, padded, { padding: false }, (b) => records.push(b));
  const blocks = records.length;
  const firstSeen = new Map<string, number>();

  run.group(
    'Blocks',
    () => {
      records.forEach((b, block) => {
        const hex = bytesToHex(b.ciphertext);
        const repeatOf = firstSeen.get(hex);
        if (repeatOf === undefined) firstSeen.set(hex, block);
        run.step({
          kind: 'aes.modeBlock',
          id: `aes.ecb.b${block}`,
          label:
            repeatOf === undefined
              ? `Block ${block + 1}: C${block + 1} = AES_K(P${block + 1}) = ${blockHex(b.ciphertext)}.`
              : `Block ${block + 1} is the same plaintext as block ${repeatOf + 1}, so it encrypts to the same ciphertext.`,
          detail:
            'ECB encrypts every block on its own with the same key. Anyone watching sees which blocks are equal without knowing the key.',
          citation: 'sp800-38a.6.1',
          mode: 'ecb',
          block,
          blocks,
          plaintext: Array.from(b.plaintext),
          cipherInput: Array.from(b.cipherInput),
          cipherOutput: Array.from(b.cipherOutput),
          ciphertext: Array.from(b.ciphertext),
          ...(repeatOf === undefined ? {} : { repeatOf }),
        });
      });
    },
    { id: 'blocks', description: 'Each block through AES on its own.' },
  );

  emitModeResult(run, 'ecb', ciphertext, 'sp800-38a.6.1');
  return run.finish();
}
