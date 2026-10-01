import { describe, expect, it } from 'vitest';

import { createRng } from '../sim/rng';
import {
  bitLength,
  defaultE,
  egcd,
  eProblem,
  gcd,
  generateKey,
  iroot,
  isqrt,
  keyProblem,
  lcm,
  MAX_SIGN_TEXT_BYTES,
  messageProblem,
  modInverse,
  modPow,
  modPowTrace,
  primeProblem,
  randomBetween,
  randomPrime,
  RSA_PAPER_INPUT,
  rsaDecrypt,
  rsaEncrypt,
  rsaKeyRun,
  rsaMalleabilityRun,
  rsaSignRun,
  rsaVerify,
  toBytes,
  trialDivision,
  type RsaEvent,
} from '.';

/**
 * The RSA guards and the less common branches: what each function refuses and the
 * message it gives, the edge values (0, 1, n = 1), and the labels a run writes only for
 * unusual keys. `tests/rsa.test.ts` covers the identities on the usual inputs.
 */

const of = <K extends RsaEvent['kind']>(events: readonly RsaEvent[], kind: K) =>
  events.filter((e): e is Extract<RsaEvent, { kind: K }> => e.kind === kind);

const KEY = generateKey(RSA_PAPER_INPUT).key; // n = 3233, e = 17, d = 2753

describe('bigmath edge cases', () => {
  it('gcd ignores signs and lcm of 0 is 0', () => {
    expect(gcd(-12n, 18n)).toBe(6n);
    expect(gcd(12n, -18n)).toBe(6n);
    expect(lcm(0n, 5n)).toBe(0n);
    expect(lcm(4n, 0n)).toBe(0n);
    expect(lcm(4n, 6n)).toBe(12n);
  });

  it('refuses negative egcd inputs and a modulus of 1 or less for modInverse', () => {
    expect(() => egcd(-1n, 2n)).toThrow('egcd takes non-negative integers');
    expect(() => egcd(2n, -1n)).toThrow(RangeError);
    expect(() => modInverse(3n, 1n)).toThrow('modInverse needs a modulus above 1');
  });

  it('modPow and modPowTrace refuse a non-positive modulus or a negative exponent', () => {
    for (const pow of [
      modPow,
      (b: bigint, e: bigint, n: bigint) => modPowTrace(b, e, n),
    ]) {
      expect(() => pow(2n, 3n, 0n)).toThrow('modPow needs a positive modulus');
      expect(() => pow(2n, -1n, 5n)).toThrow('modPow needs a non-negative exponent');
    }
  });

  it('anything mod 1 is 0, and x⁰ is 1 with no square-and-multiply rows', () => {
    expect(modPow(5n, 3n, 1n)).toBe(0n);
    expect(modPowTrace(5n, 0n, 7n)).toEqual({ result: 1n, rows: [] });
    expect(modPow(5n, 0n, 7n)).toBe(1n);
  });

  it('bitLength of 0 is 0', () => {
    expect(bitLength(0n)).toBe(0);
    expect(bitLength(1n)).toBe(1);
  });

  it('iroot refuses x < 0 and k < 1, and returns 0 and 1 unchanged', () => {
    expect(() => iroot(-1n, 2)).toThrow('iroot takes x ≥ 0 and k ≥ 1');
    expect(() => iroot(8n, 0)).toThrow(RangeError);
    expect(iroot(0n, 3)).toBe(0n);
    expect(iroot(1n, 3)).toBe(1n);
  });

  it('toBytes refuses negatives and a length too short for the value', () => {
    expect(() => toBytes(-1n)).toThrow('toBytes takes a non-negative integer');
    expect(() => toBytes(256n, 1)).toThrow('256 does not fit in 1 bytes');
    expect(Array.from(toBytes(0n))).toEqual([0]);
  });
});

describe('prime helpers', () => {
  it('isqrt refuses negatives and returns 0 and 1 unchanged', () => {
    expect(() => isqrt(-1n)).toThrow('isqrt takes n ≥ 0');
    expect(isqrt(0n)).toBe(0n);
    expect(isqrt(1n)).toBe(1n);
    expect(isqrt(99n)).toBe(9n);
  });

  it('randomBetween refuses an empty range', () => {
    expect(() => randomBetween(createRng(1), 5n, 4n)).toThrow(
      'randomBetween: empty range',
    );
  });

  it('randomPrime refuses under 8 bits, sets the top two bits and honours accept', () => {
    expect(() => randomPrime(createRng(1), 7)).toThrow(
      'randomPrime needs at least 8 bits',
    );
    const plain = randomPrime(createRng(2), 16);
    expect(bitLength(plain.value)).toBe(16);
    expect(plain.value >> 14n).toBe(3n);
    expect(trialDivision(plain.value).prime).toBe(true);
    // Refuse every prime that is 1 mod 4: each one found is 3 mod 4.
    for (let seed = 0; seed < 10; seed += 1) {
      const p = randomPrime(createRng(seed), 16, (x) => x % 4n === 3n);
      expect(p.value % 4n).toBe(3n);
      expect(trialDivision(p.value).prime).toBe(true);
    }
  });
});

describe('key validation messages', () => {
  it('names the bad paper prime', () => {
    expect(primeProblem(2n, 'p')).toBe('p must be at least 3.');
    expect(primeProblem(1_000_003n, 'q')).toBe('q must be below 1,000,000.');
    expect(primeProblem(91n, 'q')).toBe('q = 91 is not prime: 7 × 13.');
    expect(keyProblem({ mode: 'paper', p: 61n, q: 2n, seed: 1 })).toBe(
      'q must be at least 3.',
    );
  });

  it('names the bad e', () => {
    expect(eProblem(1n, 3120n)).toBe('e must be greater than 1.');
    expect(eProblem(3120n, 3120n)).toBe('e must be less than φ(n) = 3120.');
    expect(eProblem(4n, 3120n)).toBe(
      'gcd(e, φ(n)) = gcd(4, 3120) = 4, not 1, so e has no inverse.',
    );
  });

  it('checks e in realistic mode without making primes', () => {
    const base = { mode: 'realistic', bits: 128, seed: 1 } as const;
    expect(keyProblem({ ...base, bits: 100 })).toBe(
      'Realistic mode takes n of 128, 256, 512 bits.',
    );
    expect(keyProblem({ ...base, e: 1n })).toBe(
      'In realistic mode e must be odd and at least 3.',
    );
    expect(keyProblem({ ...base, e: 4n })).toBe(
      'In realistic mode e must be odd and at least 3.',
    );
    expect(keyProblem({ ...base, e: (1n << 32n) + 1n })).toBe(
      'In realistic mode e can be at most 32 bits.',
    );
    expect(keyProblem({ ...base, e: 3n })).toBeNull();
  });

  it('generateKey throws keyProblem’s message', () => {
    expect(() => generateKey({ mode: 'paper', p: 4n, q: 53n, seed: 1 })).toThrow(
      'p = 4 is not prime: 2 × 2.',
    );
    expect(() => generateKey({ ...RSA_PAPER_INPUT, e: 3120n })).toThrow(
      'e must be less than φ(n) = 3120.',
    );
  });

  it('has no default e when φ(n) leaves no odd e to pick', () => {
    expect(() => defaultE(2n)).toThrow('No valid e for φ = 2');
  });

  it('explains a default e other than 65537 when φ(n) is too small for it', () => {
    // p = 5, q = 7: φ = 24, 3 shares a factor with it, so e = 5.
    const run = rsaKeyRun({ mode: 'paper', p: 5n, q: 7n, seed: 1 });
    const [chosen] = of(run.events, 'rsa.chooseE');
    expect(chosen.e).toBe('5');
    expect(chosen.source).toBe('default');
    expect(chosen.detail).toContain("65537 doesn't fit below φ(n) = 24");
  });
});

describe('encrypt, decrypt and malleability guards', () => {
  it('RSAEP and RSADP refuse representatives outside [0, n)', () => {
    expect(() => rsaEncrypt(KEY, -1n)).toThrow('message representative out of range');
    expect(() => rsaEncrypt(KEY, KEY.n)).toThrow('message representative out of range');
    expect(() => rsaDecrypt(KEY, -1n)).toThrow('ciphertext representative out of range');
    expect(() => rsaDecrypt(KEY, KEY.n)).toThrow(
      'ciphertext representative out of range',
    );
  });

  it('messageProblem asks for a number, then a non-negative one', () => {
    expect(messageProblem(undefined, 3233n)).toBe('Type a whole number to encrypt.');
    expect(messageProblem(-1n, 3233n)).toBe('The message must be 0 or more.');
    expect(messageProblem(3233n, 3233n)).toBe('The message must be less than n = 3233.');
  });

  it('the malleability run refuses a message that is too big', () => {
    expect(() => rsaMalleabilityRun(RSA_PAPER_INPUT, 5000n)).toThrow(
      'The message must be less than n = 3233.',
    );
  });

  it('says "mod n" when k·m wraps past n', () => {
    const run = rsaMalleabilityRun(RSA_PAPER_INPUT, 2000n);
    const [receive] = of(run.events, 'rsa.mallReceive');
    expect(receive.recovered).toBe(String((2n * 2000n) % 3233n));
    expect(receive.label).toContain('2 × 2000 mod 3233');
    expect(receive.ok).toBe(true);
  });
});

describe('signature guards', () => {
  it('rejects a signature outside [0, n) without computing', () => {
    expect(rsaVerify(KEY, 'hello', -1n)).toBe(false);
    expect(rsaVerify(KEY, 'hello', KEY.n)).toBe(false);
  });

  it('refuses a message over the byte limit, counting UTF-8 bytes', () => {
    expect(() =>
      rsaSignRun(RSA_PAPER_INPUT, 'a'.repeat(MAX_SIGN_TEXT_BYTES + 1)),
    ).toThrow(`The message can be at most ${MAX_SIGN_TEXT_BYTES} bytes.`);
    // 61 two-byte characters: 122 bytes although only 61 characters.
    expect(() => rsaSignRun(RSA_PAPER_INPUT, 'é'.repeat(61))).toThrow(RangeError);
    expect(() =>
      rsaSignRun(RSA_PAPER_INPUT, 'a'.repeat(MAX_SIGN_TEXT_BYTES)),
    ).not.toThrow();
  });

  it('says so when the changed message collides, and when h needs no reduction', () => {
    // A "hash" that ignores its input: every message has h = 0, so the tamper check
    // passes, and 0 < n so nothing is reduced.
    const run = rsaSignRun(RSA_PAPER_INPUT, 'hi', () => new Uint8Array(32));
    const [hash] = of(run.events, 'rsa.hash');
    expect(hash.reduced).toBe(false);
    expect(hash.label).toBe('h = SHA-256("hi") = 0.');
    const [tamper] = of(run.events, 'rsa.tamper');
    expect(tamper.ok).toBe(true);
    expect(tamper.label).toContain('happens to hash to the same h mod n');
    expect(tamper.detail).toContain('finding a second message with the same hash');
  });
});
