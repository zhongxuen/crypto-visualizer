/**
 * Cipher Block Chaining mode (SP 800-38A §6.2): C_1 = CIPH_K(P_1 ⊕ IV) and
 * C_j = CIPH_K(P_j ⊕ C_(j−1)). Decryption: P_j = CIPH⁻¹_K(C_j) ⊕ C_(j−1).
 */

import { createRun } from '../../events/builder';
import type { SimResult } from '../../sim/result';
import { decryptWithRoundKeys, encryptWithRoundKeys } from '../aes128';
import type { AesEvent } from '../events';
import { expandKeyBytes } from '../keyExpansion';
import { pkcs7Pad, pkcs7Unpad } from '../padding';
import { BLOCK_BYTES } from '../round';
import {
  assertIv,
  assertStepped,
  assertWholeBlocks,
  blockHex,
  emitModeResult,
  emitPadding,
  seededIv,
  type ModeBlock,
  type OnBlock,
  type PaddingOption,
} from './common';

export function cbcEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  { padding = true }: PaddingOption = {},
  onBlock?: OnBlock,
): Uint8Array {
  assertIv(iv);
  const input = padding ? pkcs7Pad(plaintext) : plaintext;
  assertWholeBlocks(input, 'CBC plaintext');
  const roundKeys = expandKeyBytes(key);
  const out = new Uint8Array(input.length);
  let chain: Uint8Array = iv.slice();
  for (let at = 0; at < input.length; at += BLOCK_BYTES) {
    const block = input.subarray(at, at + BLOCK_BYTES);
    const mixed = new Uint8Array(BLOCK_BYTES);
    for (let i = 0; i < BLOCK_BYTES; i += 1) mixed[i] = block[i] ^ chain[i];
    const c = encryptWithRoundKeys(roundKeys, mixed);
    out.set(c, at);
    onBlock?.({
      plaintext: block.slice(),
      cipherInput: mixed,
      cipherOutput: c,
      ciphertext: c,
      chain,
    });
    chain = c;
  }
  return out;
}

export function cbcDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  { padding = true }: PaddingOption = {},
): Uint8Array {
  assertIv(iv);
  assertWholeBlocks(ciphertext, 'CBC ciphertext');
  const roundKeys = expandKeyBytes(key);
  const out = new Uint8Array(ciphertext.length);
  let chain: Uint8Array = iv;
  for (let at = 0; at < ciphertext.length; at += BLOCK_BYTES) {
    const c = ciphertext.subarray(at, at + BLOCK_BYTES);
    const d = decryptWithRoundKeys(roundKeys, c);
    for (let i = 0; i < BLOCK_BYTES; i += 1) out[at + i] = d[i] ^ chain[i];
    chain = c;
  }
  return padding ? pkcs7Unpad(out) : out;
}

/** CBC, stepped: padding, the seeded IV, one event per block, then the ciphertext. */
export function cbcRun(
  key: Uint8Array,
  plaintext: Uint8Array,
  seed: number,
): SimResult<AesEvent> {
  assertStepped(plaintext, true);
  const run = createRun<AesEvent>();
  const padded = emitPadding(run, 'cbc', plaintext);
  const iv = seededIv(seed);
  const records: ModeBlock[] = [];
  const ciphertext = cbcEncrypt(key, iv, padded, { padding: false }, (b) =>
    records.push(b),
  );
  const blocks = records.length;

  run.group(
    'IV',
    () => {
      run.step({
        kind: 'aes.modeSetup',
        id: 'aes.cbc.iv',
        label: `Pick a fresh IV: ${blockHex(iv)}.`,
        detail:
          'CBC needs an IV that an attacker cannot predict, new for every message. It is sent in the clear with the ciphertext. This one comes from the seeded (non-cryptographic) rng, so it is for display only.',
        citation: 'sp800-38a.c',
        mode: 'cbc',
        iv: Array.from(iv),
        blocks,
      });
    },
    { id: 'iv', description: 'Choose the initialization vector.' },
  );

  run.group(
    'Blocks',
    () => {
      records.forEach((b, block) => {
        const previous = block === 0 ? 'IV' : `C${block}`;
        run.step({
          kind: 'aes.modeBlock',
          id: `aes.cbc.b${block}`,
          label: `Block ${block + 1}: C${block + 1} = AES_K(P${block + 1} ⊕ ${previous}) = ${blockHex(b.ciphertext)}.`,
          detail:
            'XORing in the previous ciphertext block first means equal plaintext blocks encrypt differently, and every block depends on all the blocks before it.',
          citation: 'sp800-38a.6.2',
          mode: 'cbc',
          block,
          blocks,
          plaintext: Array.from(b.plaintext),
          cipherInput: Array.from(b.cipherInput),
          cipherOutput: Array.from(b.cipherOutput),
          ciphertext: Array.from(b.ciphertext),
          chain: Array.from(b.chain ?? []),
        });
      });
    },
    {
      id: 'blocks',
      description: 'Each block XORed with the one before, then encrypted.',
    },
  );

  emitModeResult(run, 'cbc', ciphertext, 'sp800-38a.6.2');
  return run.finish();
}
