import {
  constants,
  createHash,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  privateEncrypt,
  publicEncrypt,
  type KeyObject,
} from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  fromBytes,
  generateKey,
  REALISTIC_BITS,
  rsaDecrypt,
  rsaEncrypt,
  rsaSign,
  toBytes,
  type RsaKey,
} from '@/core/rsa';
import { createRng } from '@/core/sim/rng';

/**
 * Raw RSA in src/core/rsa against node:crypto (OpenSSL). Each realistic-mode key is
 * imported into Node as a JWK (RFC 7518 §6.3: n, e, d, p, q, dp, dq, qi), then
 * RSA_NO_PADDING publicEncrypt / privateDecrypt / privateEncrypt must agree with the
 * core's RSAEP, RSADP and RSASP1 (RFC 8017 §5.1.1, §5.1.2, §5.2.1) on seeded messages.
 * OpenSSL decrypts with the CRT values, so this also checks dP, dQ and qInv.
 */

const b64u = (x: bigint) => Buffer.from(toBytes(x)).toString('base64url');

function nodeKeys(key: RsaKey): { pub: KeyObject; priv: KeyObject } {
  const jwk = {
    kty: 'RSA',
    n: b64u(key.n),
    e: b64u(key.e),
    d: b64u(key.d),
    p: b64u(key.p),
    q: b64u(key.q),
    dp: b64u(key.dp),
    dq: b64u(key.dq),
    qi: b64u(key.qinv),
  };
  return {
    pub: createPublicKey({ key: jwk, format: 'jwk' }),
    priv: createPrivateKey({ key: jwk, format: 'jwk' }),
  };
}

function randomBelow(rng: ReturnType<typeof createRng>, n: bigint): bigint {
  let x = 0n;
  for (let i = 0; i < n.toString(16).length; i += 1) x = (x << 4n) | BigInt(rng.int(16));
  return x % n;
}

const SIZES = REALISTIC_BITS;

describe('raw RSA vs node:crypto (RSA_NO_PADDING)', () => {
  for (const bits of SIZES) {
    it(`${bits}-bit keys over 8 seeds`, () => {
      for (let seed = 0; seed < 8; seed += 1) {
        const { key } = generateKey({ mode: 'realistic', bits, seed });
        const k = Math.ceil(key.bits / 8);
        const { pub, priv } = nodeKeys(key);
        const rng = createRng(seed).fork('differential');
        for (let i = 0; i < 5; i += 1) {
          const m = randomBelow(rng, key.n);
          const mBytes = Buffer.from(toBytes(m, k));

          const c = rsaEncrypt(key, m);
          const nodeC = publicEncrypt(
            { key: pub, padding: constants.RSA_NO_PADDING },
            mBytes,
          );
          expect(fromBytes(nodeC), `seed ${seed}`).toBe(c);

          const nodeM = privateDecrypt(
            { key: priv, padding: constants.RSA_NO_PADDING },
            Buffer.from(toBytes(c, k)),
          );
          expect(fromBytes(nodeM)).toBe(m);
          expect(rsaDecrypt(key, c)).toBe(m);
        }
      }
    }, 60_000);
  }

  it('hash-then-sign matches OpenSSL’s raw private operation on the SHA-256 integer', () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const { key } = generateKey({ mode: 'realistic', bits: 512, seed });
      const k = Math.ceil(key.bits / 8);
      const { priv } = nodeKeys(key);
      const text = `message ${seed}`;
      // A 512-bit n is larger than any 256-bit digest, so nothing is reduced here.
      const h = fromBytes(createHash('sha256').update(text, 'utf8').digest());
      const nodeS = privateEncrypt(
        { key: priv, padding: constants.RSA_NO_PADDING },
        Buffer.from(toBytes(h, k)),
      );
      expect(fromBytes(nodeS)).toBe(rsaSign(key, text));
    }
  }, 60_000);

  it('the core’s key is one OpenSSL accepts as consistent', () => {
    const { key } = generateKey({ mode: 'realistic', bits: 512, seed: 1 });
    const exported = nodeKeys(key).priv.export({ format: 'jwk' });
    expect(exported.n).toBe(b64u(key.n));
    expect(exported.d).toBe(b64u(key.d));
  }, 30_000);
});
