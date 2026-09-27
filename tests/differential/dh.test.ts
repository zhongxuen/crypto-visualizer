import { createDiffieHellman, getDiffieHellman } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { dhExchange, getGroup, MODP_2048_P, TOY_GROUPS, type DhGroupId } from '@/core/dh';
import { fromBytes, toBytes } from '@/core/rsa';

/**
 * Diffie-Hellman in src/core/dh against node:crypto (OpenSSL).
 *
 * - RFC 3526 group 14: the core's p and g must equal Node's built-in `modp14`, and for
 *   seeded private keys `createDiffieHellman(p, g)` with `setPrivateKey` must produce the
 *   same public keys and the same shared secret as the core.
 * - Toy groups: OpenSSL 3 refuses to compute with a modulus under 512 bits
 *   (DH_MIN_MODULUS_BITS), so Node can't be the oracle there. The test proves that
 *   refusal, then checks the core against the plainest independent oracle there is:
 *   g multiplied by itself x times, mod p.
 */

const buf = (x: bigint, length?: number) => Buffer.from(toBytes(x, length));
const int = (b: Buffer) => fromBytes(new Uint8Array(b));

describe('RFC 3526 group 14 against node:crypto', () => {
  it('has the same p and g as Node’s modp14', () => {
    const node = getDiffieHellman('modp14');
    expect(int(node.getPrime())).toBe(MODP_2048_P);
    expect(int(node.getGenerator())).toBe(getGroup('modp2048').g);
  });

  it('agrees on public keys and the shared secret for seeded private keys', () => {
    const { p, g } = getGroup('modp2048');
    for (let seed = 0; seed < 4; seed += 1) {
      const ex = dhExchange({ group: 'modp2048', seed });

      const alice = createDiffieHellman(buf(p), buf(g));
      alice.setPrivateKey(buf(ex.a));
      alice.generateKeys(); // keeps the private key it was given, derives the public one
      const bob = createDiffieHellman(buf(p), buf(g));
      bob.setPrivateKey(buf(ex.b));
      bob.generateKeys();

      expect(int(alice.getPrivateKey())).toBe(ex.a);
      expect(int(alice.getPublicKey())).toBe(ex.A);
      expect(int(bob.getPublicKey())).toBe(ex.B);
      expect(int(alice.computeSecret(buf(ex.B)))).toBe(ex.aliceSecret);
      expect(int(bob.computeSecret(buf(ex.A)))).toBe(ex.bobSecret);
    }
  });
});

describe('toy groups', () => {
  it('are refused by OpenSSL, which is why Node is not the oracle here', () => {
    const { p, g } = getGroup('p23');
    const dh = createDiffieHellman(buf(p), buf(g));
    dh.setPrivateKey(buf(6n));
    expect(() => dh.generateKeys()).toThrow();
    // 3^6 mod 23 = 16, but OpenSSL returns zeros rather than compute with a tiny p.
    expect(int(dh.computeSecret(buf(3n)))).toBe(0n);
  });

  /** g^x mod p by x repeated multiplications, sharing no code with the core. */
  function naivePow(g: bigint, x: bigint, p: bigint): bigint {
    let v = 1n;
    for (let i = 0n; i < x; i += 1n) v = (v * g) % p;
    return v;
  }

  it.each(TOY_GROUPS.map((g) => g.id as DhGroupId))(
    'agrees with repeated multiplication in %s over 200 seeds',
    (id) => {
      const { p, g } = getGroup(id);
      for (let seed = 0; seed < 200; seed += 1) {
        const ex = dhExchange({ group: id, seed });
        expect(ex.A).toBe(naivePow(g, ex.a, p));
        expect(ex.B).toBe(naivePow(g, ex.b, p));
        expect(ex.aliceSecret).toBe(naivePow(ex.B, ex.a, p));
        expect(ex.bobSecret).toBe(naivePow(ex.A, ex.b, p));
      }
    },
  );
});
