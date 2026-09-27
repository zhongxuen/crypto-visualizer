/**
 * Counter mode (SP 800-38A §6.5): O_j = CIPH_K(T_j) and C_j = P_j ⊕ O_j, where T_j are
 * successive counter blocks. The last block may be partial: only as many keystream
 * bytes are used as there are plaintext bytes, so there is no padding. Encryption and
 * decryption are the same operation.
 *
 * The counter block is incremented as one 128-bit big-endian integer, wrapping at 2^128
 * (the standard incrementing function of Appendix B.1 with m = 128), as OpenSSL and
 * node:crypto do.
 */

import { createRun } from '../../events/builder';
import type { SimResult } from '../../sim/result';
import { encryptWithRoundKeys } from '../aes128';
import type { AesEvent } from '../events';
import { expandKeyBytes } from '../keyExpansion';
import { BLOCK_BYTES } from '../round';
import {
  assertIv,
  assertStepped,
  blockHex,
  emitModeResult,
  seededCounter,
  type ModeBlock,
  type OnBlock,
} from './common';

/** The next counter block: `counter + 1 mod 2^128`, big-endian. Returns a new array. */
export function incrementCounter(counter: Uint8Array): Uint8Array {
  const next = counter.slice();
  for (let i = next.length - 1; i >= 0; i -= 1) {
    next[i] = (next[i] + 1) & 0xff;
    if (next[i] !== 0) break;
  }
  return next;
}

/** CTR encryption, which is also decryption. `counter` is T_1. */
export function ctrCrypt(
  key: Uint8Array,
  counter: Uint8Array,
  data: Uint8Array,
  onBlock?: OnBlock,
): Uint8Array {
  assertIv(counter, 'initial counter block');
  const roundKeys = expandKeyBytes(key);
  const out = new Uint8Array(data.length);
  let t: Uint8Array = counter.slice();
  for (let at = 0; at < data.length; at += BLOCK_BYTES) {
    const o = encryptWithRoundKeys(roundKeys, t);
    const end = Math.min(at + BLOCK_BYTES, data.length);
    for (let i = at; i < end; i += 1) out[i] = data[i] ^ o[i - at];
    onBlock?.({
      plaintext: data.slice(at, end),
      cipherInput: t,
      cipherOutput: o,
      ciphertext: out.slice(at, end),
      counter: t,
    });
    t = incrementCounter(t);
  }
  return out;
}

export const ctrEncrypt = ctrCrypt;
export const ctrDecrypt = ctrCrypt;

/** CTR, stepped: the seeded counter block, one event per block, then the ciphertext. */
export function ctrRun(
  key: Uint8Array,
  plaintext: Uint8Array,
  seed: number,
): SimResult<AesEvent> {
  assertStepped(plaintext, false);
  const run = createRun<AesEvent>();
  const counter = seededCounter(seed);
  const records: ModeBlock[] = [];
  const ciphertext = ctrCrypt(key, counter, plaintext, (b) => records.push(b));
  const blocks = records.length;

  run.group(
    'Counter',
    () => {
      run.step({
        kind: 'aes.modeSetup',
        id: 'aes.ctr.counter',
        label: `Initial counter block: an 8-byte nonce, then a 64-bit counter from 0: ${blockHex(counter)}.`,
        detail:
          'Every counter block must be unique across every message ever sent under this key. Reusing one gives the same keystream twice, which is the two-time pad.',
        citation: 'sp800-38a.b',
        mode: 'ctr',
        iv: Array.from(counter),
        blocks,
      });
    },
    { id: 'counter', description: 'Choose the nonce and start the counter.' },
  );

  run.group(
    'Blocks',
    () => {
      records.forEach((b, block) => {
        const partial = b.plaintext.length < BLOCK_BYTES;
        run.step({
          kind: 'aes.modeBlock',
          id: `aes.ctr.b${block}`,
          label: `Block ${block + 1}: keystream AES_K(T${block + 1}) ⊕ P${block + 1}${partial ? ` (only ${b.plaintext.length} bytes used)` : ''} = ${blockHex(b.ciphertext)}.`,
          detail:
            'AES never sees the plaintext: it encrypts the counter, and the result is XORed in like a one-time pad. So CTR needs no padding, and blocks can be done in parallel.',
          citation: 'sp800-38a.6.5',
          mode: 'ctr',
          block,
          blocks,
          plaintext: Array.from(b.plaintext),
          cipherInput: Array.from(b.cipherInput),
          cipherOutput: Array.from(b.cipherOutput),
          ciphertext: Array.from(b.ciphertext),
          counter: Array.from(b.counter ?? []),
        });
      });
    },
    { id: 'blocks', description: 'Encrypt each counter block and XOR it in.' },
  );

  emitModeResult(run, 'ctr', ciphertext, 'sp800-38a.6.5');
  return run.finish();
}
