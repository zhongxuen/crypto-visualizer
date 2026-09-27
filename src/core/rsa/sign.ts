/**
 * Hash-then-sign (RFC 8017 §5.2.1 RSASP1 and §5.2.2 RSAVP1): s = hᵈ mod n, and the
 * signature verifies when sᵉ mod n = h, where h is SHA-256 of the message.
 *
 * A 256-bit digest doesn't fit below a paper-mode n, so paper mode signs h = digest mod n.
 * That is a toy shortcut and the step says so: real RSA signatures use a modulus of 2048
 * bits or more and encode the digest with EMSA-PKCS1-v1_5 or PSS, never reduce it.
 */

import { bytesToHex } from '../bytes/hex';
import { utf8Encode } from '../bytes/utf8';
import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import { sha256 } from '../sha256/sha256';
import { fromBytes, modPow } from './bigmath';
import type { RsaEvent } from './events';
import { emitKeyPair, generateKey, type RsaKey, type RsaKeyInput } from './keygen';
import { emitPow } from './rsa';

/** Longest message the signing chapter takes, in UTF-8 bytes. */
export const MAX_SIGN_TEXT_BYTES = 120;

export type HashFn = (message: Uint8Array) => Uint8Array;

export interface Hashed {
  digestHex: string;
  digest: bigint;
  /** The integer signed: the digest, reduced mod n if it doesn't fit. */
  h: bigint;
  reduced: boolean;
}

export function hashToInteger(text: string, n: bigint, hash: HashFn = sha256): Hashed {
  const bytes = hash(utf8Encode(text));
  const digest = fromBytes(bytes);
  return { digestHex: bytesToHex(bytes), digest, h: digest % n, reduced: digest >= n };
}

/** RSASP1 on the hash: s = hᵈ mod n. */
export function rsaSign(
  key: Pick<RsaKey, 'n' | 'd'>,
  text: string,
  hash?: HashFn,
): bigint {
  return modPow(hashToInteger(text, key.n, hash).h, key.d, key.n);
}

/** RSAVP1 then compare: sᵉ mod n = h(text). */
export function rsaVerify(
  key: Pick<RsaKey, 'n' | 'e'>,
  text: string,
  s: bigint,
  hash?: HashFn,
): boolean {
  if (s < 0n || s >= key.n) return false;
  return modPow(s, key.e, key.n) === hashToInteger(text, key.n, hash).h;
}

/** The message used for the "someone changed it" check. */
export function tamperedText(text: string): string {
  return `${text}!`;
}

/** The signing chapter: key, hash, s = hᵈ mod n, verify, then verify a changed message. */
export function rsaSignRun(
  input: RsaKeyInput,
  text: string,
  hash: HashFn = sha256,
): SimResult<RsaEvent> {
  if (utf8Encode(text).length > MAX_SIGN_TEXT_BYTES) {
    throw new RangeError(`The message can be at most ${MAX_SIGN_TEXT_BYTES} bytes.`);
  }
  const { key } = generateKey(input);
  const run = createRun<RsaEvent>();
  const hashed = hashToInteger(text, key.n, hash);

  run.group('Key', () => emitKeyPair(run, key, 'rsa.sig.key'), {
    id: 'key',
    description: 'The key pair from the first chapter.',
  });

  run.group(
    'Hash',
    () => {
      run.step({
        kind: 'rsa.hash',
        id: 'rsa.sig.hash',
        label: hashed.reduced
          ? `h = SHA-256("${text}") mod n = ${hashed.h}.`
          : `h = SHA-256("${text}") = ${hashed.h}.`,
        detail: hashed.reduced
          ? `The digest is ${hashed.digestHex}, a 256-bit number, and n has only ${key.bits} bits, so it is reduced mod n. That is a toy shortcut: it throws most of the hash away, so many messages share an h. Real signatures use n of 2048 bits or more and encode the whole digest (EMSA-PKCS1-v1_5 or PSS).`
          : `The digest ${hashed.digestHex} read as a number is already below n, so it is signed as it is. Real signatures still encode it with EMSA-PKCS1-v1_5 or PSS first.`,
        citation: hashed.reduced ? 'rfc8017.9.2' : 'rfc8017.5.2.1',
        text,
        digestHex: hashed.digestHex,
        digest: String(hashed.digest),
        h: String(hashed.h),
        reduced: hashed.reduced,
        n: String(key.n),
      });
    },
    { id: 'hash', description: 'Sign the hash of the message, not the message.' },
  );

  let s = 0n;
  run.group(
    'Sign',
    () => {
      s = emitPow(run, {
        op: 'sign',
        base: hashed.h,
        exp: key.d,
        n: key.n,
        mode: key.mode,
        resultLabel: (r) => `Signature s = ${hashed.h}^${key.d} mod ${key.n} = ${r}.`,
      });
    },
    { id: 'sign', description: 's = hᵈ mod n with the private key.' },
  );

  run.group(
    'Verify',
    () => {
      const recovered = emitPow(run, {
        op: 'verify',
        base: s,
        exp: key.e,
        n: key.n,
        mode: key.mode,
        expected: hashed.h,
        resultLabel: (r) =>
          r === hashed.h
            ? `sᵉ mod n = ${r} = h: the signature is valid.`
            : `sᵉ mod n = ${r} ≠ h = ${hashed.h}: invalid.`,
      });
      const changed = tamperedText(text);
      const other = hashToInteger(changed, key.n, hash);
      const ok = other.h === recovered;
      run.step({
        kind: 'rsa.tamper',
        id: 'rsa.sig.tamper',
        label: ok
          ? `"${changed}" happens to hash to the same h mod n, so the signature still passes: the toy reduction's weakness.`
          : `Change the message to "${changed}": its h = ${other.h} ≠ ${recovered}, so the same signature fails.`,
        detail: ok
          ? 'With a small n many messages share h mod n. With a real 2048-bit key and the whole digest, finding a second message with the same hash is as hard as breaking SHA-256.'
          : 'The signature only fits the hash it was made from. Making one for the new message needs d, which only the key owner has.',
        citation: 'rfc8017.5.2.2',
        text: changed,
        h: String(other.h),
        recovered: String(recovered),
        ok,
      });
    },
    { id: 'verify', description: 'Anyone with (n, e) checks that sᵉ mod n = h.' },
  );

  return run.finish();
}
