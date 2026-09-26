/**
 * PBKDF2-HMAC-SHA-256 (RFC 8018 §5.2).
 *
 *   DK = T1 ‖ T2 ‖ … ‖ Tl, cut to dkLen bytes
 *   Ti = U1 ⊕ U2 ⊕ … ⊕ Uc
 *   U1 = HMAC(P, S ‖ INT(i)),   Uj = HMAC(P, Uj−1)
 *
 * The iteration count c is the point: every guess an attacker makes costs c HMACs, just
 * as it does for the server. The default is 600,000, OWASP's recommendation for
 * PBKDF2-HMAC-SHA256.
 *
 * One implementation. `pbkdf2` is the fast path. Each iteration reuses the HMAC key
 * state (the key block compressed once) and runs exactly two SHA-256 compressions on
 * 32-bit words, with no allocation, through the same `compress` the stepped SHA-256
 * uses. `pbkdf2Run` steps the first iterations of block 1 through the same functions and
 * summarises the rest. The core stays synchronous and pure: the UI runs the full count
 * in a Web Worker.
 */

import { bytesToHex } from '../bytes/hex';
import { createRun } from '../events/builder';
import { hmacKeyState, hmacWithState, type HmacKeyState } from '../hmac/hmac';
import { compress } from '../sha256/compress';
import { DIGEST_BYTES } from '../sha256/constants';
import { stateToBytes } from '../sha256/sha256';
import type { SimResult } from '../sim/result';
import type { KdfEvent } from './events';

/** OWASP Password Storage Cheat Sheet: PBKDF2-HMAC-SHA256, 600,000 iterations. */
export const OWASP_PBKDF2_ITERATIONS = 600_000;

/** Iterations of block 1 shown one at a time. */
export const STEPPED_ITERATIONS = 3;

/** Largest key RFC 8018 allows: (2^32 − 1) × hLen. Capped far lower here. */
export const MAX_DK_LEN = 1024;

function assertParams(iterations: number, dkLen: number): void {
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new RangeError(
      `PBKDF2 needs a positive whole iteration count, got ${iterations}`,
    );
  }
  if (!Number.isInteger(dkLen) || dkLen < 1 || dkLen > MAX_DK_LEN) {
    throw new RangeError(`PBKDF2 key length must be 1–${MAX_DK_LEN} bytes, got ${dkLen}`);
  }
}

/** S ‖ INT(i): the salt and the block index as a 32-bit big-endian number. */
export function saltBlock(salt: Uint8Array, index: number): Uint8Array {
  const out = new Uint8Array(salt.length + 4);
  out.set(salt);
  out[salt.length] = index >>> 24;
  out[salt.length + 1] = (index >>> 16) & 0xff;
  out[salt.length + 2] = (index >>> 8) & 0xff;
  out[salt.length + 3] = index & 0xff;
  return out;
}

function toWords(bytes: Uint8Array): Uint32Array {
  const out = new Uint32Array(8);
  for (let i = 0; i < 8; i += 1) {
    out[i] =
      (bytes[4 * i] << 24) |
      (bytes[4 * i + 1] << 16) |
      (bytes[4 * i + 2] << 8) |
      bytes[4 * i + 3];
  }
  return out;
}

/** Bits in one HMAC input after the key block: 64 bytes of key block + 32 of U. */
const TAIL_BITS = (64 + DIGEST_BYTES) * 8;

/**
 * Run `count` more iterations from `u`, XORing each new U into `t`. Both are 8-word
 * arrays and are updated in place. `onTick` is called every `every` iterations.
 *
 * Each HMAC(P, U) here is two single-block compressions: the inner hash finishes
 * (K0 ⊕ ipad) ‖ U, the outer finishes (K0 ⊕ opad) ‖ inner. U is always 32 bytes, so the
 * padding for both is fixed: 0x80, zeros, and a length of 96 bytes (768 bits).
 */
export function iterate(
  state: HmacKeyState,
  u: Uint32Array,
  t: Uint32Array,
  count: number,
  onTick?: (done: number) => void,
  every = 10_000,
): void {
  const W = new Uint32Array(64);
  const inner = new Uint32Array(8);
  const outer = new Uint32Array(8);
  for (let n = 1; n <= count; n += 1) {
    inner.set(state.inner);
    W.set(u, 0);
    W[8] = 0x80000000;
    W.fill(0, 9, 15);
    W[15] = TAIL_BITS;
    compress(inner, W);

    outer.set(state.outer);
    W.set(inner, 0);
    W[8] = 0x80000000;
    W.fill(0, 9, 15);
    W[15] = TAIL_BITS;
    compress(outer, W);

    u.set(outer);
    for (let i = 0; i < 8; i += 1) t[i] ^= outer[i];
    if (onTick && n % every === 0) onTick(n);
  }
}

export interface Pbkdf2Options {
  /** Called with iterations done so far across all blocks, and the total. */
  onProgress?: (done: number, total: number) => void;
  /** How often to call `onProgress`, in iterations. */
  progressEvery?: number;
}

/** Fast path: the derived key. */
export function pbkdf2(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  dkLen: number,
  { onProgress, progressEvery = 10_000 }: Pbkdf2Options = {},
): Uint8Array {
  assertParams(iterations, dkLen);
  const state = hmacKeyState(password);
  const blocks = Math.ceil(dkLen / DIGEST_BYTES);
  const out = new Uint8Array(blocks * DIGEST_BYTES);
  const total = blocks * iterations;

  for (let i = 1; i <= blocks; i += 1) {
    const u1 = hmacWithState(state, saltBlock(salt, i));
    const u = toWords(u1);
    const t = Uint32Array.from(u);
    const before = (i - 1) * iterations;
    iterate(
      state,
      u,
      t,
      iterations - 1,
      onProgress ? (done) => onProgress(before + 1 + done, total) : undefined,
      progressEvery,
    );
    out.set(stateToBytes(t), (i - 1) * DIGEST_BYTES);
  }
  onProgress?.(total, total);
  return out.slice(0, dkLen);
}

export interface Pbkdf2RunInput {
  password: Uint8Array;
  salt: Uint8Array;
  iterations: number;
  dkLen: number;
  /** Compute past the stepped iterations. `false` leaves the rest pending, for a Worker. */
  finish?: boolean;
}

/** `600000` → `'600,000'`, without Intl, so the text is the same everywhere. */
export function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const short = (bytes: ArrayLike<number>) =>
  `${bytesToHex(Uint8Array.from(bytes)).slice(0, 16)}…`;

/** Stepped path: block 1's first iterations one at a time, then summaries. */
export function pbkdf2Run({
  password,
  salt,
  iterations,
  dkLen,
  finish = true,
}: Pbkdf2RunInput): SimResult<KdfEvent> {
  assertParams(iterations, dkLen);
  const run = createRun<KdfEvent>();
  const state = hmacKeyState(password);
  const blocks = Math.ceil(dkLen / DIGEST_BYTES);
  const lastBlockBytes = dkLen - (blocks - 1) * DIGEST_BYTES;
  const stepped = Math.min(STEPPED_ITERATIONS, iterations);
  const blockOutputs: Uint8Array[] = [];

  run.group(
    'Setup',
    () => {
      run.step({
        kind: 'kdf.pbkdfSetup',
        id: 'kdf.pbkdf2.setup',
        label: `${groupDigits(iterations)} iterations of HMAC-SHA-256 for each of ${blocks} block${blocks === 1 ? '' : 's'}, to make a ${dkLen}-byte key.`,
        detail:
          'Each block Ti is 32 bytes. The password is the HMAC key throughout; the salt goes into the first HMAC of every block, with the block number after it.',
        citation: 'rfc8018.5.2',
        passwordLength: password.length,
        salt: Array.from(salt),
        iterations,
        dkLen,
        blocks,
        lastBlockBytes,
      });
    },
    { id: 'pbkdf2-setup', description: 'How many blocks, and how many iterations each.' },
  );

  run.group(
    'Block 1',
    () => {
      const first = saltBlock(salt, 1);
      let previous: Uint8Array = first;
      let t: Uint8Array = new Uint8Array(DIGEST_BYTES);
      for (let j = 1; j <= stepped; j += 1) {
        const u = hmacWithState(state, previous);
        const next = new Uint8Array(DIGEST_BYTES);
        for (let i = 0; i < DIGEST_BYTES; i += 1) next[i] = t[i] ^ u[i];
        t = next;
        run.step({
          kind: 'kdf.pbkdfU',
          id: `kdf.pbkdf2.b1.u${j}`,
          label:
            j === 1
              ? `U1 = HMAC(password, salt ‖ 00000001) = ${short(u)}`
              : `U${j} = HMAC(password, U${j - 1}) = ${short(u)}; T = ${short(t)}`,
          detail:
            j === 1
              ? 'The first HMAC takes the salt and the block number. T starts as U1.'
              : `Each U feeds the next HMAC, and T collects them all by XOR: T = U1 ⊕ … ⊕ U${j}.`,
          citation: 'rfc8018.5.2',
          block: 1,
          iteration: j,
          input: Array.from(previous),
          u: Array.from(u),
          t: Array.from(t),
        });
        previous = u;
      }

      if (iterations > stepped) {
        let finalT: Uint8Array | undefined;
        if (finish) {
          const u = toWords(previous);
          const tw = toWords(t);
          iterate(state, u, tw, iterations - stepped);
          finalT = stateToBytes(tw);
        }
        run.step({
          kind: 'kdf.pbkdfRest',
          id: 'kdf.pbkdf2.b1.rest',
          label: `U${stepped + 1} to U${groupDigits(iterations)}: the same step, ${groupDigits(iterations - stepped)} more times.`,
          detail:
            'This is the cost. The server pays it once per login; an attacker pays it for every single guess.',
          citation: 'rfc8018.4.2',
          block: 1,
          from: stepped + 1,
          to: iterations,
          pending: !finish,
          ...(finalT ? { t: Array.from(finalT) } : {}),
        });
        if (finalT) t = finalT;
      }

      if (finish || iterations <= stepped) {
        blockOutputs.push(t);
        run.step({
          kind: 'kdf.pbkdfBlock',
          id: 'kdf.pbkdf2.b1.t',
          label: `T1 = ${short(t)}`,
          citation: 'rfc8018.5.2',
          block: 1,
          t: Array.from(t),
        });
      }
    },
    { id: 'pbkdf2-block-1', description: 'The first iterations, one at a time.' },
  );

  if (!finish && iterations > stepped) return run.finish();

  for (let i = 2; i <= blocks; i += 1) {
    run.group(
      `Block ${i}`,
      () => {
        const u = toWords(hmacWithState(state, saltBlock(salt, i)));
        const t = Uint32Array.from(u);
        iterate(state, u, t, iterations - 1);
        const bytes = stateToBytes(t);
        blockOutputs.push(bytes);
        run.step({
          kind: 'kdf.pbkdfBlock',
          id: `kdf.pbkdf2.b${i}.t`,
          label: `T${i} = ${short(bytes)}, from salt ‖ ${i.toString(16).padStart(8, '0')} after ${groupDigits(iterations)} iterations.`,
          citation: 'rfc8018.5.2',
          block: i,
          t: Array.from(bytes),
        });
      },
      { id: `pbkdf2-block-${i}`, description: 'Another block, the same way.' },
    );
  }

  run.group(
    'Derived key',
    () => {
      const all = new Uint8Array(blocks * DIGEST_BYTES);
      blockOutputs.forEach((block, index) => all.set(block, index * DIGEST_BYTES));
      const dk = all.slice(0, dkLen);
      run.step({
        kind: 'kdf.pbkdfKey',
        id: 'kdf.pbkdf2.dk',
        label: `DK = ${blocks === 1 ? 'T1' : `T1 ‖ … ‖ T${blocks}`}${lastBlockBytes < DIGEST_BYTES ? `, cut to ${dkLen} bytes` : ''}: ${short(dk)}`,
        citation: 'rfc8018.5.2',
        dk: Array.from(dk),
      });
    },
    { id: 'pbkdf2-key', description: 'The blocks joined into the key.' },
  );

  return run.finish();
}
