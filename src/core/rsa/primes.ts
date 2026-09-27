/**
 * Primality for the two RSA modes.
 *
 * - Paper mode (primes below 10⁶): trial division, which a learner can check by hand and
 *   which says *why* a number isn't prime (its smallest factor).
 * - Realistic mode: seeded Miller-Rabin (FIPS 186-5 Appendix B.3.1). The bases come from
 *   the seeded rng, so a seed reproduces the same primes. The rng is mulberry32, which is
 *   not cryptographic: these keys are for display only.
 */

import type { Rng } from '../sim/rng';
import { bitLength, modPow } from './bigmath';

/** Paper-mode primes are below this. */
export const PAPER_PRIME_LIMIT = 1_000_000;

/**
 * Miller-Rabin rounds. FIPS 186-5 Appendix B.3 chooses the number of rounds from the
 * error probability wanted. Here that target is 2⁻¹⁰⁰, reached through Rabin's
 * worst-case bound of 4⁻ᵗ for any odd composite, so t = 50. The standard's tables allow
 * fewer rounds for randomly chosen candidates; this bound needs no table.
 */
export const MILLER_RABIN_ROUNDS = 50;

export interface PrimeCheck {
  prime: boolean;
  /** The smallest factor above 1, when not prime and above 1. */
  factor?: bigint;
  /** Trial division checked divisors up to this (⌊√n⌋). */
  checkedUpTo: bigint;
}

/** Trial division (HAC §3.2.1). Fine for n below about 10¹⁴. */
export function trialDivision(n: bigint): PrimeCheck {
  if (n < 2n) return { prime: false, checkedUpTo: 0n };
  const limit = isqrt(n);
  if (n % 2n === 0n) {
    return n === 2n
      ? { prime: true, checkedUpTo: limit }
      : { prime: false, factor: 2n, checkedUpTo: limit };
  }
  for (let d = 3n; d <= limit; d += 2n) {
    if (n % d === 0n) return { prime: false, factor: d, checkedUpTo: limit };
  }
  return { prime: true, checkedUpTo: limit };
}

/** ⌊√n⌋ for n ≥ 0. */
export function isqrt(n: bigint): bigint {
  if (n < 0n) throw new RangeError('isqrt takes n ≥ 0');
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(bitLength(n) / 2));
  for (;;) {
    const y = (x + n / x) / 2n;
    if (y >= x) return x;
    x = y;
  }
}

/** A uniformly random integer of exactly `bits` bits or fewer, from the seeded rng. */
export function randomBits(rng: Rng, bits: number): bigint {
  let x = 0n;
  let left = bits;
  while (left > 0) {
    const take = Math.min(16, left);
    x = (x << BigInt(take)) | BigInt(rng.int(1 << take));
    left -= take;
  }
  return x;
}

/** A uniformly random integer in `[lo, hi]`, by rejection sampling. */
export function randomBetween(rng: Rng, lo: bigint, hi: bigint): bigint {
  if (hi < lo) throw new RangeError('randomBetween: empty range');
  const span = hi - lo + 1n;
  const bits = bitLength(span);
  for (;;) {
    const x = randomBits(rng, bits);
    if (x < span) return lo + x;
  }
}

/**
 * Miller-Rabin with `rounds` random bases from `rng` (FIPS 186-5 B.3.1): write
 * n − 1 = 2ˢ·d with d odd; n passes a base a if aᵈ ≡ 1 or a^(2ʲ·d) ≡ −1 for some j < s.
 * A prime passes every base; an odd composite fails at least three quarters of them.
 */
export function millerRabin(n: bigint, rng: Rng, rounds = MILLER_RABIN_ROUNDS): boolean {
  if (n < 2n) return false;
  if (n < 4n) return true;
  if (n % 2n === 0n) return false;
  let d = n - 1n;
  let s = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1;
  }
  witness: for (let i = 0; i < rounds; i += 1) {
    const a = n === 5n ? 2n + BigInt(rng.int(2)) : randomBetween(rng, 2n, n - 2n);
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let j = 1; j < s; j += 1) {
      x = (x * x) % n;
      if (x === n - 1n) continue witness;
      if (x === 1n) return false;
    }
    return false;
  }
  return true;
}

const SMALL_PRIMES: readonly bigint[] = (() => {
  const out: bigint[] = [];
  for (let k = 3; k < 1000; k += 2) {
    if (out.every((p) => BigInt(k) % p !== 0n)) out.push(BigInt(k));
  }
  return out;
})();

export interface GeneratedPrime {
  value: bigint;
  /** Odd candidates drawn before this one passed (including it). */
  candidates: number;
}

/**
 * A random prime of exactly `bits` bits with its top two bits set, so the product of two
 * has exactly 2·bits bits. `accept` can reject a prime (RSA needs gcd(e, p − 1) = 1).
 */
export function randomPrime(
  rng: Rng,
  bits: number,
  accept: (p: bigint) => boolean = () => true,
): GeneratedPrime {
  if (bits < 8) throw new RangeError('randomPrime needs at least 8 bits');
  const top = 3n << BigInt(bits - 2);
  let candidates = 0;
  for (;;) {
    candidates += 1;
    const candidate = randomBits(rng, bits) | top | 1n;
    if (SMALL_PRIMES.some((p) => candidate !== p && candidate % p === 0n)) continue;
    if (!accept(candidate)) continue;
    if (millerRabin(candidate, rng)) return { value: candidate, candidates };
  }
}

/** A random paper-mode prime in `[lo, hi)`, by trial division. */
export function randomSmallPrime(rng: Rng, lo: number, hi: number): bigint {
  for (;;) {
    const candidate = BigInt(lo + rng.int(hi - lo));
    if (trialDivision(candidate).prime) return candidate;
  }
}
