/**
 * HMAC-SHA-256 (RFC 2104 §2):
 *
 *   HMAC(K, m) = H((K0 ⊕ opad) ‖ H((K0 ⊕ ipad) ‖ m))
 *
 * where K0 is the key hashed if it is longer than a 64-byte block, then zero-padded to
 * 64 bytes, ipad is 0x36 repeated and opad is 0x5c repeated.
 *
 * One implementation: `hmacCompute` does the work and, given a run, records each step.
 * `hmac` is the fast path; `hmacKeyState` precomputes the two keyed blocks so PBKDF2 can
 * run hundreds of thousands of HMACs without rehashing the key each time.
 */

import { bytesToHex } from '../bytes/hex';
import { createRun, type RunBuilder } from '../events/builder';
import { BLOCK_BYTES } from '../sha256/constants';
import { padMessage } from '../sha256/pad';
import { initialState, sha256, sha256Block, sha256Finish } from '../sha256/sha256';
import type { SimResult } from '../sim/result';
import type { HmacEvent } from './events';

export const IPAD = 0x36;
export const OPAD = 0x5c;

/** K0: the key made exactly one block long (RFC 2104 §2 step 1, §3). */
export function hmacKey(key: Uint8Array): Uint8Array {
  const k0 = new Uint8Array(BLOCK_BYTES);
  k0.set(key.length > BLOCK_BYTES ? sha256(key) : key);
  return k0;
}

function xorPad(k0: Uint8Array, pad: number): Uint8Array {
  const out = new Uint8Array(BLOCK_BYTES);
  for (let i = 0; i < BLOCK_BYTES; i += 1) out[i] = k0[i] ^ pad;
  return out;
}

/** SHA-256 states after compressing K0 ⊕ ipad and K0 ⊕ opad. Reusable per key. */
export interface HmacKeyState {
  inner: Uint32Array;
  outer: Uint32Array;
}

export function hmacKeyState(key: Uint8Array): HmacKeyState {
  const k0 = hmacKey(key);
  const inner = initialState();
  sha256Block(inner, xorPad(k0, IPAD));
  const outer = initialState();
  sha256Block(outer, xorPad(k0, OPAD));
  return { inner, outer };
}

/** HMAC of `message` under a precomputed key state. The state isn't modified. */
export function hmacWithState(state: HmacKeyState, message: Uint8Array): Uint8Array {
  const innerDigest = sha256Finish(Uint32Array.from(state.inner), BLOCK_BYTES, message);
  return sha256Finish(Uint32Array.from(state.outer), BLOCK_BYTES, innerDigest);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/** The whole computation. With `run`, every step is also recorded. */
function hmacCompute(
  key: Uint8Array,
  message: Uint8Array,
  run: RunBuilder<HmacEvent> | null,
): Uint8Array {
  const state = hmacKeyState(key);
  const tag = hmacWithState(state, message);
  if (!run) return tag;

  // The stepped path records the same values the fast path computed, laid out step by
  // step. Each recorded digest is recomputed from its full input, and the test suite
  // checks it equals the fast path's.
  const k0 = hmacKey(key);
  const inPadded = xorPad(k0, IPAD);
  const outPadded = xorPad(k0, OPAD);
  const innerInput = concat(inPadded, message);
  const innerDigest = sha256(innerInput);
  const outerInput = concat(outPadded, innerDigest);
  const outerDigest = sha256(outerInput);

  const keyAndMessage = concat(key, message);
  const naiveTag = sha256(keyAndMessage);
  const glue = padMessage(keyAndMessage).subarray(keyAndMessage.length);

  run.group(
    'Why not just hash key ‖ message?',
    () => {
      run.step({
        kind: 'hmac.naive',
        id: 'hmac.naive',
        label: `SHA-256(key ‖ message) = ${bytesToHex(naiveTag).slice(0, 16)}…, and it can be forged.`,
        detail:
          'SHA-256’s output is its whole internal state after the last block. An attacker who sees this tag can load it as the state and keep hashing: they get a valid tag for key ‖ message ‖ padding ‖ anything, without ever knowing the key. That is a length-extension attack.',
        citation: 'fips180-4.5.1.1',
        key: Array.from(key),
        message: Array.from(message),
        naiveTag: Array.from(naiveTag),
        glue: Array.from(glue),
      });
    },
    { id: 'naive', description: 'The obvious MAC, and why it fails.' },
  );

  run.group(
    'Key',
    () => {
      const hashed = key.length > BLOCK_BYTES;
      run.step({
        kind: 'hmac.key',
        id: 'hmac.key',
        label: hashed
          ? `The key is ${key.length} bytes, longer than a block, so it is hashed to 32 bytes and then padded with zeros to 64.`
          : `The key is ${key.length} bytes, so it is padded with ${BLOCK_BYTES - key.length} zero bytes to fill one 64-byte block: K0.`,
        citation: hashed ? 'rfc2104.3' : 'rfc2104.2',
        key: Array.from(key),
        k0: Array.from(k0),
        hashed,
      });
    },
    { id: 'key', description: 'Make the key exactly one block long.' },
  );

  run.group(
    'Inner hash',
    () => {
      run.step({
        kind: 'hmac.pad',
        id: 'hmac.ipad',
        label: 'K0 ⊕ ipad: every key byte XORed with 0x36.',
        citation: 'rfc2104.2',
        which: 'ipad',
        pad: IPAD,
        k0: Array.from(k0),
        padded: Array.from(inPadded),
      });
      run.step({
        kind: 'hmac.hash',
        id: 'hmac.inner',
        label: `Inner hash: SHA-256((K0 ⊕ ipad) ‖ message) = ${bytesToHex(innerDigest).slice(0, 16)}…`,
        detail: `${innerInput.length} bytes in, 32 bytes out. This is the full SHA-256 from earlier, collapsed to one step.`,
        citation: 'rfc2104.2',
        which: 'inner',
        input: Array.from(innerInput),
        digest: Array.from(innerDigest),
      });
    },
    { id: 'inner', description: 'Hash the message under the inner key.' },
  );

  run.group(
    'Outer hash',
    () => {
      run.step({
        kind: 'hmac.pad',
        id: 'hmac.opad',
        label: 'K0 ⊕ opad: every key byte XORed with 0x5c.',
        citation: 'rfc2104.2',
        which: 'opad',
        pad: OPAD,
        k0: Array.from(k0),
        padded: Array.from(outPadded),
      });
      run.step({
        kind: 'hmac.hash',
        id: 'hmac.outer',
        label: `Outer hash: SHA-256((K0 ⊕ opad) ‖ inner hash) = ${bytesToHex(outerDigest).slice(0, 16)}…`,
        detail: '96 bytes in: the outer key block and the 32-byte inner hash.',
        citation: 'rfc2104.2',
        which: 'outer',
        input: Array.from(outerInput),
        digest: Array.from(outerDigest),
      });
    },
    { id: 'outer', description: 'Hash the inner result under the outer key.' },
  );

  run.group(
    'Tag',
    () => {
      run.step({
        kind: 'hmac.tag',
        id: 'hmac.tag',
        label: `HMAC-SHA-256 = ${bytesToHex(tag)}.`,
        detail:
          'The tag is the outer hash. Extending it would only extend the outer hash’s input, which is (K0 ⊕ opad) ‖ a 32-byte digest, not the message, and the attacker can’t compute a new inner hash without the key.',
        citation: 'rfc2104.6',
        tag: Array.from(tag),
        naiveTag: Array.from(naiveTag),
      });
    },
    { id: 'tag', description: 'The tag, and why length extension no longer works.' },
  );

  return tag;
}

/** Fast path: the HMAC-SHA-256 tag. */
export function hmac(key: Uint8Array, message: Uint8Array): Uint8Array {
  return hmacCompute(key, message, null);
}

/** Stepped path. */
export function hmacRun(key: Uint8Array, message: Uint8Array): SimResult<HmacEvent> {
  const run = createRun<HmacEvent>();
  hmacCompute(key, message, run);
  return run.finish();
}
