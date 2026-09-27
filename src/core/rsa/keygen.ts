/**
 * RSA key generation (RFC 8017 §3): two primes, n = p·q, φ(n) = (p − 1)(q − 1), a public
 * exponent e coprime to φ(n), and d = e⁻¹ mod φ(n) by the extended Euclidean algorithm.
 *
 * RFC 8017 allows d modulo λ(n) = lcm(p − 1, q − 1), the smallest exponent that works;
 * the textbook φ(n) gives a d that works too, and is what a hand-worked example uses. The
 * key-pair step says so in its detail.
 */

import { createRun, type RunBuilder } from '../events/builder';
import type { SimResult } from '../sim/result';
import { createRng } from '../sim/rng';
import { bitLength, egcd, gcd, lcm, mod, modInverse, type EgcdResult } from './bigmath';
import type { RsaEvent, RsaMode } from './events';
import {
  MILLER_RABIN_ROUNDS,
  PAPER_PRIME_LIMIT,
  randomPrime,
  randomSmallPrime,
  trialDivision,
} from './primes';

/** Modulus sizes realistic mode offers. RSA in use today is 2048 bits or more. */
export const REALISTIC_BITS = [128, 256, 512] as const;
export type RealisticBits = (typeof REALISTIC_BITS)[number];

export const DEFAULT_E = 65537n;

export interface RsaKeyInput {
  mode: RsaMode;
  /** Paper mode: the user's primes. Generated from the seed when absent. */
  p?: bigint;
  q?: bigint;
  /** The user's e. The default rule applies when absent. */
  e?: bigint;
  /** Realistic mode: bits of n. */
  bits?: number;
  seed: number;
}

export interface RsaKey {
  mode: RsaMode;
  p: bigint;
  q: bigint;
  n: bigint;
  phi: bigint;
  lambda: bigint;
  e: bigint;
  d: bigint;
  /** CRT values (RFC 8017 §3.2): d mod (p − 1), d mod (q − 1), q⁻¹ mod p. */
  dp: bigint;
  dq: bigint;
  qinv: bigint;
  bits: number;
}

export interface PrimeInfo {
  value: bigint;
  test: 'trial' | 'miller-rabin';
  checkedUpTo?: bigint;
  rounds?: number;
  candidates?: number;
}

export interface RsaKeyTrace {
  key: RsaKey;
  primes: [PrimeInfo, PrimeInfo];
  eSource: 'user' | 'default';
  /** The extended Euclid table on (φ(n), e). */
  egcd: EgcdResult;
}

/** Why a paper-mode prime is refused, or `null`. */
export function primeProblem(value: bigint | undefined, name: string): string | null {
  if (value === undefined) return null;
  if (value < 3n) return `${name} must be at least 3.`;
  if (value >= BigInt(PAPER_PRIME_LIMIT)) return `${name} must be below 1,000,000.`;
  const check = trialDivision(value);
  if (!check.prime) {
    return `${name} = ${value} is not prime: ${check.factor} × ${value / check.factor!}.`;
  }
  return null;
}

/** The default e for φ: 65537 when it fits and is coprime, else the smallest odd e ≥ 3. */
export function defaultE(phi: bigint): bigint {
  if (DEFAULT_E < phi && gcd(DEFAULT_E, phi) === 1n) return DEFAULT_E;
  for (let e = 3n; e < phi; e += 2n) if (gcd(e, phi) === 1n) return e;
  throw new RangeError(`No valid e for φ = ${phi}`);
}

/** Why e is refused for φ, or `null`. */
export function eProblem(e: bigint, phi: bigint): string | null {
  if (e <= 1n) return 'e must be greater than 1.';
  if (e >= phi) return `e must be less than φ(n) = ${phi}.`;
  const g = gcd(e, phi);
  if (g !== 1n)
    return `gcd(e, φ(n)) = gcd(${e}, ${phi}) = ${g}, not 1, so e has no inverse.`;
  return null;
}

/** Why this input can't make a key, or `null` if it can. Never throws. */
export function keyProblem(input: RsaKeyInput): string | null {
  if (input.mode === 'realistic') {
    if (!REALISTIC_BITS.includes(input.bits as RealisticBits)) {
      return `Realistic mode takes n of ${REALISTIC_BITS.join(', ')} bits.`;
    }
    if (input.e !== undefined && (input.e < 3n || input.e % 2n === 0n)) {
      return 'In realistic mode e must be odd and at least 3.';
    }
    if (input.e !== undefined && bitLength(input.e) > 32) {
      return 'In realistic mode e can be at most 32 bits.';
    }
    return null;
  }
  const problem = primeProblem(input.p, 'p') ?? primeProblem(input.q, 'q');
  if (problem) return problem;
  if (input.p !== undefined && input.p === input.q) return 'p and q must be different.';
  if (input.e === undefined) return null;
  // Paper primes are cheap to pick, so check e against the φ(n) the key will have.
  const { p, q } = pick(input);
  return eProblem(input.e, (p.value - 1n) * (q.value - 1n));
}

function pick(input: RsaKeyInput): { p: PrimeInfo; q: PrimeInfo } {
  const rng = createRng(input.seed).fork('rsa.primes');
  if (input.mode === 'paper') {
    const p = input.p ?? randomSmallPrime(rng, 11, 1000);
    let q = input.q;
    while (q === undefined || q === p) q = randomSmallPrime(rng, 11, 1000);
    const info = (value: bigint): PrimeInfo => ({
      value,
      test: 'trial',
      checkedUpTo: trialDivision(value).checkedUpTo,
    });
    return { p: info(p), q: info(q) };
  }
  const half = (input.bits ?? 512) / 2;
  const e = input.e ?? DEFAULT_E;
  const accept = (x: bigint) => gcd(e, x - 1n) === 1n;
  const p = randomPrime(rng, half, accept);
  let q = randomPrime(rng, half, accept);
  while (q.value === p.value) q = randomPrime(rng, half, accept);
  const info = ({
    value,
    candidates,
  }: {
    value: bigint;
    candidates: number;
  }): PrimeInfo => ({
    value,
    test: 'miller-rabin',
    rounds: MILLER_RABIN_ROUNDS,
    candidates,
  });
  return { p: info(p), q: info(q) };
}

/** Make a key. Throws a `RangeError` with `keyProblem`'s message on bad input. */
export function generateKey(input: RsaKeyInput): RsaKeyTrace {
  const problem = keyProblem(input);
  if (problem) throw new RangeError(problem);
  const primes = pick(input);
  const p = primes.p.value;
  const q = primes.q.value;
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const e = input.e ?? defaultE(phi);
  const eBad = eProblem(e, phi);
  if (eBad) throw new RangeError(eBad);
  const table = egcd(phi, e);
  const d = mod(table.t, phi);
  const key: RsaKey = {
    mode: input.mode,
    p,
    q,
    n,
    phi,
    lambda: lcm(p - 1n, q - 1n),
    e,
    d,
    dp: d % (p - 1n),
    dq: d % (q - 1n),
    qinv: modInverse(q, p),
    bits: bitLength(n),
  };
  return {
    key,
    primes: [primes.p, primes.q],
    eSource: input.e === undefined ? 'default' : 'user',
    egcd: table,
  };
}

const s = (x: bigint) => x.toString();

/** One step with the whole key: the first step of the encrypt, sign and attack runs. */
export function emitKeyPair(run: RunBuilder<RsaEvent>, key: RsaKey, id: string): void {
  run.step({
    kind: 'rsa.keyPair',
    id,
    label: `Public key (n, e) = (${key.n}, ${key.e}); private key d = ${key.d}.`,
    detail: `n has ${key.bits} bits. Anyone may have n and e; only the key's owner has d (and p, q, φ(n)). Real implementations also keep dP = d mod (p − 1), dQ = d mod (q − 1) and qInv = q⁻¹ mod p, which make decryption about four times faster by the Chinese remainder theorem. RFC 8017 computes d modulo λ(n) = ${key.lambda} rather than φ(n); both give a d that works.`,
    citation: 'rfc8017.3.2',
    mode: key.mode,
    p: s(key.p),
    q: s(key.q),
    n: s(key.n),
    e: s(key.e),
    d: s(key.d),
    phi: s(key.phi),
    bits: key.bits,
    dp: s(key.dp),
    dq: s(key.dq),
    qinv: s(key.qinv),
  });
}

/** Key generation, stepped: primes, n, φ(n), e, the extended Euclid rows, d. */
export function emitKeyGen(run: RunBuilder<RsaEvent>, trace: RsaKeyTrace): void {
  const { key, primes } = trace;
  run.group(
    'Primes',
    () => {
      primes.forEach((prime, i) => {
        const which = i === 0 ? 'p' : 'q';
        const trial = prime.test === 'trial';
        run.step({
          kind: 'rsa.prime',
          id: `rsa.key.${which}`,
          label: trial
            ? `${which} = ${prime.value} is prime: no divisor from 2 to ⌊√${prime.value}⌋ = ${prime.checkedUpTo}.`
            : `${which} is a ${bitLength(prime.value)}-bit probable prime: it passed ${prime.rounds} Miller-Rabin rounds.`,
          detail: trial
            ? 'Trial division tries every candidate divisor up to the square root: a composite number always has a factor no bigger than its square root. It is fine for numbers you can check on paper and hopeless for 1024-bit primes.'
            : `The seeded rng drew ${prime.candidates} odd ${bitLength(prime.value)}-bit candidates before this one passed. Each round picks a random base; a composite fails at least three quarters of bases, so 50 passes leave at most a 2⁻¹⁰⁰ chance of error. The rng is not cryptographic, so this key is for display only.`,
          citation: trial ? 'hac.3.2.1' : 'fips186-5.b.3',
          which,
          value: s(prime.value),
          bits: bitLength(prime.value),
          test: prime.test,
          ...(trial
            ? { checkedUpTo: s(prime.checkedUpTo!) }
            : { rounds: prime.rounds!, candidates: prime.candidates! }),
        });
      });
    },
    { id: 'primes', description: 'Two different primes, p and q, kept secret.' },
  );

  run.group(
    'n and φ(n)',
    () => {
      run.step({
        kind: 'rsa.modulus',
        id: 'rsa.key.n',
        label: `n = p × q = ${key.p} × ${key.q} = ${key.n}.`,
        detail: `n has ${key.bits} bits and is public. Its security rests on nobody being able to factor it back into p and q.`,
        citation: 'rfc8017.3.1',
        p: s(key.p),
        q: s(key.q),
        n: s(key.n),
        bits: key.bits,
      });
      run.step({
        kind: 'rsa.totient',
        id: 'rsa.key.phi',
        label: `φ(n) = (p − 1)(q − 1) = ${key.p - 1n} × ${key.q - 1n} = ${key.phi}.`,
        detail: `φ(n) counts the numbers below n that share no factor with it. Computing it needs p and q, so it stays secret. RFC 8017 uses the smaller λ(n) = lcm(p − 1, q − 1) = ${key.lambda}; any d that works modulo φ(n) also works modulo λ(n).`,
        citation: 'rfc8017.3.2',
        p: s(key.p),
        q: s(key.q),
        phi: s(key.phi),
        lambda: s(key.lambda),
      });
    },
    { id: 'modulus', description: 'The public modulus and the secret totient.' },
  );

  run.group(
    'Choose e',
    () => {
      run.step({
        kind: 'rsa.chooseE',
        id: 'rsa.key.e',
        label: `e = ${key.e}: gcd(${key.e}, ${key.phi}) = 1, so e has an inverse modulo φ(n).`,
        detail:
          trace.eSource === 'user'
            ? 'You picked e. It must be greater than 1, less than φ(n) and share no factor with φ(n).'
            : key.e === DEFAULT_E
              ? 'e = 65537 = 2¹⁶ + 1 is the usual choice: prime, and only two 1 bits, so encrypting is fast.'
              : `65537 doesn't fit below φ(n) = ${key.phi} (or shares a factor), so this takes the smallest odd e that is coprime to φ(n).`,
        citation: 'rfc8017.3.1',
        e: s(key.e),
        phi: s(key.phi),
        gcd: '1',
        source: trace.eSource,
      });
    },
    { id: 'e', description: 'The public exponent.' },
  );

  const rows = trace.egcd.rows.map((row) => ({
    ...(row.q === undefined ? {} : { q: s(row.q) }),
    r: s(row.r),
    s: s(row.s),
    t: s(row.t),
  }));
  run.group(
    'Extended Euclid',
    () => {
      trace.egcd.rows.forEach((row, i) => {
        const prev = trace.egcd.rows[i - 2];
        const above = trace.egcd.rows[i - 1];
        const label =
          i === 0
            ? `Row 0: r = φ(n) = ${row.r}, s = 1, t = 0.`
            : i === 1
              ? `Row 1: r = e = ${row.r}, s = 0, t = 1.`
              : `Row ${i}: q = ${prev.r} div ${above.r} = ${above.q}; r = ${prev.r} − ${above.q} × ${above.r} = ${row.r}, t = ${row.t}.`;
        run.step({
          kind: 'rsa.egcdRow',
          id: `rsa.egcd.${i}`,
          label: row.r === 0n ? `${label} r = 0: stop.` : label,
          detail:
            'Each row is the row two above minus q times the row above, where q is how many times the row above’s r goes into the r two above. Every row keeps r = s·φ(n) + t·e. The last row before r = 0 has r = gcd = 1, so there t·e ≡ 1 (mod φ(n)).',
          citation: 'hac.2.4.2',
          row: i,
          rows,
          a: s(key.phi),
          b: s(key.e),
        });
      });
      const t = trace.egcd.t;
      const ed = key.e * key.d;
      run.step({
        kind: 'rsa.private',
        id: 'rsa.key.d',
        label:
          t < 0n
            ? `d = t mod φ(n) = ${t} + ${key.phi} = ${key.d}. Check: ${key.e} × ${key.d} = ${ed} ≡ 1 (mod ${key.phi}).`
            : `d = t = ${key.d}. Check: ${key.e} × ${key.d} = ${ed} ≡ 1 (mod ${key.phi}).`,
        detail: `${ed} = ${ed / key.phi} × ${key.phi} + 1. Because e·d ≡ 1 (mod φ(n)), raising to e and then to d gets back where you started, for every m below n.`,
        citation: 'rfc8017.3.2',
        e: s(key.e),
        phi: s(key.phi),
        t: s(t),
        d: s(key.d),
        ed: s(ed),
        check: s(ed % key.phi),
      });
    },
    { id: 'egcd', description: 'd = e⁻¹ mod φ(n), row by row.' },
  );

  run.group('Key pair', () => emitKeyPair(run, key, 'rsa.key.pair'), {
    id: 'keypair',
    description: 'What is public and what is private.',
  });
}

/** The key-generation chapter's run. */
export function rsaKeyRun(input: RsaKeyInput): SimResult<RsaEvent> {
  const run = createRun<RsaEvent>();
  emitKeyGen(run, generateKey(input));
  return run.finish();
}
