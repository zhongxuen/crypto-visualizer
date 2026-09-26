import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bytesToHex } from '@/core/bytes/hex';
import { utf8Encode } from '@/core/bytes/utf8';
import { H0, K } from '@/core/sha256/constants';
import type { Sha256Event } from '@/core/sha256/events';
import { padMessage, zeroPadLength } from '@/core/sha256/pad';
import {
  avalancheRun,
  flipBit,
  initialState,
  MAX_STEPPED_BYTES,
  sha256,
  sha256Block,
  sha256Finish,
  sha256Run,
  sha256Stepped,
} from '@/core/sha256/sha256';
import { createRng } from '@/core/sim/rng';

/** SHA-256 in src/core/sha256 against FIPS 180-4's examples and node:crypto. */

const node = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const hex = (bytes: Uint8Array) => bytesToHex(bytes);

function randomBytes(rng: ReturnType<typeof createRng>, length: number): Uint8Array {
  return Uint8Array.from({ length }, () => rng.int(256));
}

describe('FIPS 180-4 examples', () => {
  // NIST, "Cryptographic Standards and Guidelines: Examples with Intermediate Values",
  // SHA256.pdf (the examples FIPS 180-4 refers to).
  it('"abc" (one block)', () => {
    expect(hex(sha256(utf8Encode('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('the 448-bit message (two blocks)', () => {
    expect(
      hex(sha256(utf8Encode('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))),
    ).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  it('one million "a" (fast path)', () => {
    expect(hex(sha256(new Uint8Array(1_000_000).fill(0x61)))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('the empty message', () => {
    expect(hex(sha256(new Uint8Array(0)))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('constants are the nothing-up-my-sleeve numbers', () => {
  const primes: bigint[] = [];
  for (let n = 2n; primes.length < 64; n += 1n) {
    if (primes.every((p) => n % p !== 0n)) primes.push(n);
  }
  const iroot = (x: bigint, k: bigint): bigint => {
    // Newton's method for floor(x^(1/k)).
    let r = 1n << (BigInt(x.toString(2).length) / k + 1n);
    for (;;) {
      const next = ((k - 1n) * r + x / r ** (k - 1n)) / k;
      if (next >= r) return r;
      r = next;
    }
  };

  it('K is the fractional part of the cube roots of the first 64 primes (§4.2.2)', () => {
    expect(K.map((_, i) => Number(iroot(primes[i] << 96n, 3n) & 0xffffffffn))).toEqual(K);
  });

  it('H0 is the fractional part of the square roots of the first 8 primes (§5.3.3)', () => {
    expect(H0.map((_, i) => Number(iroot(primes[i] << 64n, 2n) & 0xffffffffn))).toEqual(
      H0,
    );
  });
});

describe('against node:crypto', () => {
  it('matches createHash on 1,000 seeded random inputs of length 0–300', () => {
    const rng = createRng('sha256-differential');
    for (let i = 0; i < 1000; i += 1) {
      const input = randomBytes(rng, rng.int(301));
      expect(hex(sha256(input)), `length ${input.length}`).toBe(node(input));
    }
  });

  it('covers every padding edge case: lengths 0–130, including 55, 56 and 64', () => {
    const rng = createRng('sha256-edges');
    for (let length = 0; length <= 130; length += 1) {
      const input = randomBytes(rng, length);
      expect(hex(sha256(input)), `length ${length}`).toBe(node(input));
      expect(padMessage(input).length % 64).toBe(0);
    }
    // 55 bytes fit in one block with padding; 56 need a second.
    expect(padMessage(new Uint8Array(55)).length).toBe(64);
    expect(padMessage(new Uint8Array(56)).length).toBe(128);
    expect(padMessage(new Uint8Array(64)).length).toBe(128);
    expect(zeroPadLength(55)).toBe(0);
    expect(zeroPadLength(56)).toBe(63);
  });

  it('finishes from a precomputed state (as HMAC and PBKDF2 use it)', () => {
    const rng = createRng('sha256-finish');
    for (let i = 0; i < 100; i += 1) {
      const prefix = randomBytes(rng, 64 * (1 + rng.int(2)));
      const rest = randomBytes(rng, rng.int(200));
      const H = initialState();
      for (let at = 0; at < prefix.length; at += 64) sha256Block(H, prefix, at);
      const all = new Uint8Array(prefix.length + rest.length);
      all.set(prefix);
      all.set(rest, prefix.length);
      expect(hex(sha256Finish(H, prefix.length, rest))).toBe(node(all));
    }
    expect(() => sha256Finish(initialState(), 10, new Uint8Array(0))).toThrow(RangeError);
  });
});

describe('stepped path', () => {
  it('produces the same digest as the fast path and node:crypto', () => {
    const rng = createRng('sha256-stepped');
    for (let i = 0; i < 40; i += 1) {
      const input = randomBytes(rng, rng.int(MAX_STEPPED_BYTES + 1));
      const { result, digest } = sha256Stepped(input);
      const last = result.events.at(-1) as Extract<
        Sha256Event,
        { kind: 'sha256.digest' }
      >;
      expect(hex(Uint8Array.from(last.digest))).toBe(node(input));
      expect(hex(digest)).toBe(hex(sha256(input)));
    }
  });

  it('emits pad, block, 48 schedule words, 64 rounds and add per block', () => {
    const result = sha256Run(utf8Encode('abc'));
    const count = (kind: Sha256Event['kind']) =>
      result.events.filter((e) => e.kind === kind).length;
    expect(count('sha256.pad')).toBe(1);
    expect(count('sha256.block')).toBe(1);
    expect(count('sha256.schedule')).toBe(48);
    expect(count('sha256.round')).toBe(64);
    expect(count('sha256.add')).toBe(1);
    expect(count('sha256.digest')).toBe(1);
    expect(result.events).toHaveLength(116);
  });

  it('shows FIPS 180-4’s intermediate values for "abc"', () => {
    const events = sha256Run(utf8Encode('abc')).events;
    const round = (t: number) =>
      events.find((e) => e.kind === 'sha256.round' && e.t === t) as Extract<
        Sha256Event,
        { kind: 'sha256.round' }
      >;
    // NIST SHA256.pdf, "abc": a–h after t = 0 and t = 63.
    expect(round(0).after.map((w) => w.toString(16).padStart(8, '0'))).toEqual([
      '5d6aebcd',
      '6a09e667',
      'bb67ae85',
      '3c6ef372',
      'fa2a4622',
      '510e527f',
      '9b05688c',
      '1f83d9ab',
    ]);
    expect(round(63).after[0].toString(16)).toBe('506e3058');
    expect(round(12).group).toBe('Block 1 · Round 13');
  });

  it('stays under ~350 steps at the three-block cap and refuses more', () => {
    expect(
      sha256Run(new Uint8Array(MAX_STEPPED_BYTES)).events.length,
    ).toBeLessThanOrEqual(350);
    expect(() => sha256Run(new Uint8Array(MAX_STEPPED_BYTES + 1))).toThrow(RangeError);
  });
});

describe('avalanche', () => {
  it('flips exactly one input bit and reports the digest difference', () => {
    const message = utf8Encode('hello');
    const b = flipBit(message, 7);
    expect(b[0] ^ message[0]).toBe(1);
    const events = avalancheRun(message, 7).events;
    const diff = events.at(-1) as Extract<Sha256Event, { kind: 'sha256.avalanche' }>;
    expect(hex(Uint8Array.from(diff.digestB))).toBe(node(b));
    let bits = 0;
    for (let i = 0; i < 32; i += 1) {
      bits += (diff.digestA[i] ^ diff.digestB[i]).toString(2).replace(/0/g, '').length;
    }
    expect(diff.flipped).toBe(bits);
    expect(bits).toBeGreaterThan(90);
    expect(bits).toBeLessThan(166);
  });

  it('rejects a bit outside the message', () => {
    expect(() => flipBit(new Uint8Array(1), 8)).toThrow(RangeError);
  });
});
