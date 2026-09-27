import { describe, expect, it } from 'vitest';

import {
  bitLength,
  egcd,
  gcd,
  generateKey,
  iroot,
  keyProblem,
  millerRabin,
  modInverse,
  modPow,
  modPowTrace,
  REALISTIC_BITS,
  RSA_EXAMPLE,
  RSA_PAPER_INPUT,
  RSA_SHARE_STATE,
  rsaDecrypt,
  rsaEncrypt,
  rsaEncryptRun,
  rsaKeyRun,
  rsaMalleabilityRun,
  rsaSign,
  rsaSignRun,
  rsaVerify,
  tamperedText,
  trialDivision,
  type RsaEvent,
  type RsaKeyInput,
} from '@/core/rsa';
import { createRng } from '@/core/sim/rng';

/**
 * RSA core (module 5): the key identities over 500 seeds in both modes, Miller-Rabin
 * against trial division, Carmichael numbers, and the hand-worked example
 * p = 61, q = 53, e = 17 → d = 2753.
 */

const of = <K extends RsaEvent['kind']>(events: readonly RsaEvent[], kind: K) =>
  events.filter((e): e is Extract<RsaEvent, { kind: K }> => e.kind === kind);

describe('the hand-worked example (p = 61, q = 53, e = 17)', () => {
  const { key, egcd: table } = generateKey(RSA_PAPER_INPUT);

  it('gives n = 3233, φ = 3120, d = 2753', () => {
    expect(key.n).toBe(3233n);
    expect(key.phi).toBe(3120n);
    expect(key.d).toBe(2753n);
    expect(key.lambda).toBe(780n);
  });

  it('builds the extended Euclid table a learner writes by hand', () => {
    // 3120 = 183·17 + 9, 17 = 1·9 + 8, 9 = 1·8 + 1, 8 = 8·1 + 0.
    expect(table.rows).toEqual([
      { r: 3120n, s: 1n, t: 0n },
      { q: 183n, r: 17n, s: 0n, t: 1n },
      { q: 1n, r: 9n, s: 1n, t: -183n },
      { q: 1n, r: 8n, s: -1n, t: 184n },
      { q: 8n, r: 1n, s: 2n, t: -367n },
      { r: 0n, s: -17n, t: 3120n },
    ]);
    expect(table.t + key.phi).toBe(2753n);
  });

  it('emits one event per row and ends on d with the check', () => {
    const { events } = rsaKeyRun(RSA_PAPER_INPUT);
    expect(of(events, 'rsa.egcdRow')).toHaveLength(6);
    const [priv] = of(events, 'rsa.private');
    expect(priv).toMatchObject({ d: '2753', t: '-367', ed: '46801', check: '1' });
    expect(priv.label).toContain('d = t mod φ(n) = -367 + 3120 = 2753');
  });

  it('encrypts 65 to 2790 with one step per exponent bit, and decrypts back', () => {
    const { events } = rsaEncryptRun(RSA_PAPER_INPUT, 65n);
    const steps = of(events, 'rsa.powStep');
    expect(steps.filter((s) => s.op === 'encrypt')).toHaveLength(5); // 17 = 10001
    expect(steps.filter((s) => s.op === 'decrypt')).toHaveLength(12); // 2753 = 101011000001
    const results = of(events, 'rsa.powResult');
    expect(results.map((r) => r.result)).toEqual(['2790', '65']);
    expect(results[1].ok).toBe(true);
  });

  it('signs and verifies, and a changed message fails', () => {
    const { events } = rsaSignRun(RSA_PAPER_INPUT, RSA_EXAMPLE.text);
    const [hash] = of(events, 'rsa.hash');
    expect(hash.reduced).toBe(true);
    expect(BigInt(hash.h)).toBe(BigInt(hash.digest) % 3233n);
    const verify = of(events, 'rsa.powResult').find((r) => r.op === 'verify')!;
    expect(verify.ok).toBe(true);
    expect(of(events, 'rsa.tamper')[0].ok).toBe(false);
  });

  it('shows the malleability attack decrypting to 2m', () => {
    const { events } = rsaMalleabilityRun(RSA_PAPER_INPUT, 65n);
    const [receive] = of(events, 'rsa.mallReceive');
    expect(receive).toMatchObject({ recovered: '130', km: '130', ok: true });
    expect(of(events, 'rsa.cubeRoot')[0]).toMatchObject({ c: '74088', root: '42' });
    expect(of(events, 'rsa.padding').map((e) => e.scheme)).toEqual(['oaep', 'pss']);
  });
});

describe('bigmath', () => {
  it('modPow and its trace agree with repeated multiplication', () => {
    const rng = createRng('modpow');
    for (let i = 0; i < 300; i += 1) {
      const n = BigInt(2 + rng.int(5000));
      const base = BigInt(rng.int(10000));
      const exp = BigInt(rng.int(300));
      let slow = 1n % n;
      for (let k = 0n; k < exp; k += 1n) slow = (slow * base) % n;
      expect(modPow(base, exp, n)).toBe(slow);
      expect(modPowTrace(base, exp, n).result).toBe(slow);
      expect(modPowTrace(base, exp, n).rows).toHaveLength(bitLength(exp));
    }
  });

  it('the windowed fast path equals the traced one on 512-bit numbers', () => {
    const rng = createRng('window');
    const big = () =>
      BigInt(`0x${Array.from({ length: 128 }, () => rng.int(16).toString(16)).join('')}`);
    for (let i = 0; i < 50; i += 1) {
      const n = big() | 1n;
      const [base, exp] = [big(), big()];
      expect(modPow(base, exp, n)).toBe(modPowTrace(base, exp, n).result);
    }
  });

  it('egcd satisfies Bézout, and modInverse inverts', () => {
    const rng = createRng('egcd');
    for (let i = 0; i < 500; i += 1) {
      const a = BigInt(1 + rng.int(1e9));
      const b = BigInt(1 + rng.int(1e9));
      const { g, s, t } = egcd(a, b);
      expect(g).toBe(gcd(a, b));
      expect(s * a + t * b).toBe(g);
      if (g === 1n) expect((modInverse(b, a) * b) % a).toBe(a === 1n ? 0n : 1n);
    }
    expect(() => modInverse(6n, 9n)).toThrow(RangeError);
  });

  it('iroot finds integer roots', () => {
    expect(iroot(74088n, 3)).toBe(42n);
    expect(iroot(74087n, 3)).toBe(41n);
    expect(iroot(10n ** 60n, 3)).toBe(10n ** 20n);
  });
});

describe('primality', () => {
  it('Miller-Rabin agrees with trial division on every n < 10⁶', () => {
    const rng = createRng('mr-vs-trial');
    // A sieve is the independent oracle for trial division; both must match it.
    const limit = 1_000_000;
    const composite = new Uint8Array(limit);
    composite[0] = composite[1] = 1;
    for (let i = 2; i * i < limit; i += 1) {
      if (!composite[i]) for (let j = i * i; j < limit; j += i) composite[j] = 1;
    }
    const mismatches: number[] = [];
    for (let n = 0; n < limit; n += 1) {
      const prime = composite[n] === 0;
      if (millerRabin(BigInt(n), rng, 4) !== prime) mismatches.push(n);
      if (n < 20_000 && trialDivision(BigInt(n)).prime !== prime) mismatches.push(-n);
    }
    expect(mismatches).toEqual([]);
  }, 120_000);

  it('rejects Carmichael numbers, which fool the Fermat test', () => {
    const rng = createRng('carmichael');
    const carmichael = [
      561n,
      1105n,
      1729n,
      2465n,
      2821n,
      6601n,
      8911n,
      10585n,
      15841n,
      29341n,
      41041n,
      46657n,
      52633n,
      62745n,
      63973n,
      75361n,
      101101n,
      115921n,
      126217n,
      162401n,
      172081n,
      188461n,
      252601n,
      278545n,
      294409n,
      314821n,
      334153n,
      340561n,
      399001n,
      410041n,
      449065n,
      488881n,
      512461n,
    ];
    for (const n of carmichael) {
      expect(modPow(2n, n - 1n, n) === 1n || gcd(2n, n) !== 1n).toBe(true);
      expect(millerRabin(n, rng), String(n)).toBe(false);
      expect(trialDivision(n).prime).toBe(false);
    }
  });

  it('trial division names the smallest factor', () => {
    expect(trialDivision(91n)).toMatchObject({ prime: false, factor: 7n });
    expect(trialDivision(61n)).toMatchObject({ prime: true, checkedUpTo: 7n });
  });
});

describe('key identities over 500 seeds', () => {
  const check = (input: RsaKeyInput) => {
    const { key } = generateKey(input);
    expect((key.e * key.d) % key.phi, `seed ${input.seed}`).toBe(1n);
    expect(key.n).toBe(key.p * key.q);
    expect(key.p).not.toBe(key.q);
    const rng = createRng(input.seed).fork('message');
    for (let i = 0; i < 3; i += 1) {
      const m = BigInt(rng.int(0x7fffffff)) % key.n;
      expect(rsaDecrypt(key, rsaEncrypt(key, m))).toBe(m);
    }
    return key;
  };

  it('paper mode', () => {
    for (let seed = 0; seed < 500; seed += 1) check({ mode: 'paper', seed });
  });

  it('realistic mode, every size', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const bits = REALISTIC_BITS[seed % REALISTIC_BITS.length];
      const key = check({ mode: 'realistic', bits, seed });
      expect(key.bits).toBe(bits);
      expect(key.e).toBe(65537n);
    }
  }, 120_000);

  it('the same seed gives the same key', () => {
    const a = generateKey({ mode: 'realistic', bits: 512, seed: 9 }).key;
    expect(generateKey({ mode: 'realistic', bits: 512, seed: 9 }).key).toEqual(a);
    expect(generateKey({ mode: 'realistic', bits: 512, seed: 10 }).key.n).not.toBe(a.n);
  }, 30_000);
});

describe('sign and verify', () => {
  it('verifies its own signatures and rejects others, in both modes', () => {
    for (const input of [
      RSA_PAPER_INPUT,
      { mode: 'realistic', bits: 512, seed: 3 } as const,
    ]) {
      const { key } = generateKey(input);
      const s = rsaSign(key, 'hello');
      expect(rsaVerify(key, 'hello', s)).toBe(true);
      expect(rsaVerify(key, 'hello', (s + 1n) % key.n)).toBe(false);
    }
    const { key } = generateKey({ mode: 'realistic', bits: 512, seed: 3 });
    expect(rsaVerify(key, tamperedText('hello'), rsaSign(key, 'hello'))).toBe(false);
  }, 30_000);

  it('only reduces the digest when n is too small for it', () => {
    const big = rsaSignRun({ mode: 'realistic', bits: 512, seed: 1 }, 'x').events;
    expect(of(big, 'rsa.hash')[0].reduced).toBe(false);
    expect(of(big, 'rsa.powStep')).toHaveLength(0);
    expect(of(big, 'rsa.powResult')[0].summary).toBeDefined();
  }, 30_000);
});

describe('input problems', () => {
  it('names what is wrong', () => {
    expect(keyProblem({ mode: 'paper', p: 91n, q: 53n, seed: 0 })).toBe(
      'p = 91 is not prime: 7 × 13.',
    );
    expect(keyProblem({ mode: 'paper', p: 53n, q: 53n, seed: 0 })).toBe(
      'p and q must be different.',
    );
    expect(keyProblem({ mode: 'paper', p: 61n, q: 53n, e: 15n, seed: 0 })).toContain(
      'gcd(e, φ(n)) = gcd(15, 3120) = 15',
    );
    expect(keyProblem({ mode: 'realistic', bits: 100, seed: 0 })).toContain('bits');
    expect(() => rsaEncryptRun(RSA_PAPER_INPUT, 3233n)).toThrow('less than n');
  });

  it('the share-state defaults are the worked example', () => {
    expect(RSA_SHARE_STATE.defaults.input).toMatchObject({ p: 61, q: 53, e: 17 });
  });
});
