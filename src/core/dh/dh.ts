/**
 * The Diffie-Hellman exchange (RFC 2631 §2.1.1): Alice and Bob each draw a private
 * exponent, send A = gᵃ mod p and B = gᵇ mod p over a channel everyone can read, check
 * the share they receive (§2.1.5), and each compute the same ZZ = gᵃᵇ mod p.
 *
 * Toy groups step every bit of square-and-multiply; the 2048-bit group shows each
 * exponentiation as one summary step. Private keys come from the seeded mulberry32 rng,
 * which is not cryptographic: they are for display only.
 */

import { createRun, type RunBuilder } from '../events/builder';
import { bitLength, modPow, modPowTrace } from '../rsa/bigmath';
import { randomBetween } from '../rsa/primes';
import type { SimResult } from '../sim/result';
import { createRng } from '../sim/rng';
import type { DhActor, DhEvent, DhParty, PowSummary } from './events';
import {
  CLOCK_LIMIT,
  digits,
  getGroup,
  REAL_GROUPS,
  type DhGroup,
  type DhGroupId,
} from './params';

export interface DhInput {
  group: DhGroupId;
  seed: number;
  /** The user's private exponents. Drawn from the seed when absent. */
  a?: bigint;
  b?: bigint;
}

/**
 * Bits of a private exponent in the 2048-bit group. A 2048-bit group gives about 112 bits
 * of security, and a private exponent needs about twice that; implementations commonly
 * use short exponents like this instead of the full [2, q − 2], which makes each
 * exponentiation about 8 times cheaper.
 */
export const REALISTIC_PRIVATE_BITS = 256;

/**
 * The allowed private exponents: [2, q − 2] (RFC 2631 §2.1.1, from X9.42) in a toy group,
 * [2, 2²⁵⁶ − 1] (a short exponent, well inside that range) in the 2048-bit group.
 */
export function privateRange(group: DhGroup): { min: bigint; max: bigint } {
  if (group.kind === 'realistic') {
    return { min: 2n, max: (1n << BigInt(REALISTIC_PRIVATE_BITS)) - 1n };
  }
  return { min: 2n, max: group.q - 2n };
}

/** Why x can't be a private exponent in this group, or `null`. */
export function privateProblem(x: bigint, group: DhGroup): string | null {
  const { min, max } = privateRange(group);
  if (x < min || x > max) return `A private key must be between ${min} and ${max}.`;
  return null;
}

/** A private exponent from the seeded rng, uniform in [2, q − 2]. */
export function drawPrivate(group: DhGroup, seed: number, label: string): bigint {
  const { min, max } = privateRange(group);
  return randomBetween(createRng(seed).fork(label), min, max);
}

/** y = gˣ mod p. */
export function dhPublic(group: DhGroup, x: bigint): bigint {
  return modPow(group.g, x, group.p);
}

/** ZZ = yˣ mod p, from the other side's share y and one's own private x. */
export function dhSecret(group: DhGroup, y: bigint, x: bigint): bigint {
  return modPow(y, x, group.p);
}

const gqCache = new Map<string, bigint>();

/**
 * g^q mod p, which is 1 for every group here. Cached per group: for the 2048-bit group it
 * is a full-size exponentiation, and it never changes.
 */
export function generatorCheck(group: DhGroup): bigint {
  let gq = gqCache.get(group.id);
  if (gq === undefined) {
    gq = modPow(group.g, group.q, group.p);
    gqCache.set(group.id, gq);
  }
  return gq;
}

/** RFC 2631 §2.1.5: 2 ≤ y ≤ p − 2 and y^q mod p = 1. */
export function validatePublic(group: DhGroup, y: bigint): boolean {
  return y >= 2n && y <= group.p - 2n && modPow(y, group.q, group.p) === 1n;
}

export interface DhExchange {
  group: DhGroup;
  a: bigint;
  b: bigint;
  A: bigint;
  B: bigint;
  /** Alice's secret, Bᵃ mod p. */
  aliceSecret: bigint;
  /** Bob's secret, Aᵇ mod p. */
  bobSecret: bigint;
}

/** The whole exchange as values, without events. */
export function dhExchange(input: DhInput): DhExchange {
  const group = getGroup(input.group);
  const a = input.a ?? drawPrivate(group, input.seed, 'alice');
  const b = input.b ?? drawPrivate(group, input.seed, 'bob');
  for (const x of [a, b]) {
    const problem = privateProblem(x, group);
    if (problem) throw new RangeError(problem);
  }
  const A = dhPublic(group, a);
  const B = dhPublic(group, b);
  return {
    group,
    a,
    b,
    A,
    B,
    aliceSecret: dhSecret(group, B, a),
    bobSecret: dhSecret(group, A, b),
  };
}

export const NAMES: Record<DhParty, string> = { alice: 'Alice', bob: 'Bob' };

/** The parameters step shared by every run. */
export function emitParams(run: RunBuilder<DhEvent>, group: DhGroup, id: string): void {
  const { p, q, g } = group;
  const subgroup: string[] = [];
  if (group.kind === 'toy' && p <= CLOCK_LIMIT) {
    let v = 1n;
    for (let i = 0n; i < q; i += 1n) {
      subgroup.push(String(v));
      v = (v * g) % p;
    }
  }
  const toy = group.kind === 'toy';
  run.step({
    kind: 'dh.params',
    id,
    label: toy
      ? `Public parameters: the prime p = ${p} = 2·${q} + 1 and the generator g = ${g}.`
      : `Public parameters: RFC 3526 group 14, a ${digits(p)}-digit prime p and g = ${g}.`,
    detail: `p is a safe prime: p = 2q + 1 with q = ${toy ? q : `a ${digits(q)}-digit prime`}. g generates the subgroup of order q, so g^q mod p = 1 and the powers of g repeat every q steps. Why the subgroup: the numbers mod p form a group of order p − 1 = 2q, and a value outside the subgroup can have order 2, which would confine a shared secret to just {1, p − 1} and leak a bit of the private key. In a subgroup of prime order q there is no smaller subgroup to fall into. Everyone, Eve included, knows p and g.`,
    citation: group.citation,
    groupId: group.id,
    groupKind: group.kind,
    p: String(p),
    q: String(q),
    g: String(g),
    bits: bitLength(p),
    digits: digits(p),
    gq: String(generatorCheck(group)),
    ...(subgroup.length > 0 ? { subgroup } : {}),
  });
}

function summaryOf(base: bigint, exp: bigint, p: bigint, result: bigint): PowSummary {
  const bits = exp.toString(2);
  return {
    squarings: exp === 0n ? 0 : bits.length,
    multiplications: exp === 0n ? 0 : bits.split('1').length - 1,
    digits: {
      base: digits(base),
      exp: digits(exp),
      p: digits(p),
      result: digits(result),
    },
  };
}

/**
 * base^exp mod p as steps: one per exponent bit for a toy group, nothing for the
 * realistic one (whose result event carries a summary). Returns the result and, for the
 * realistic group, the summary.
 */
export function emitPow(
  run: RunBuilder<DhEvent>,
  {
    id,
    actor,
    purpose,
    base,
    exp,
    group,
    stepped = group.kind === 'toy',
  }: {
    id: string;
    actor: DhParty;
    purpose: 'public' | 'shared';
    base: bigint;
    exp: bigint;
    group: DhGroup;
    /** Step every bit. Defaults to toy groups only. */
    stepped?: boolean;
  },
): { result: bigint; summary?: PowSummary } {
  const { p } = group;
  if (group.kind === 'realistic') {
    const result = modPow(base, exp, p);
    return { result, summary: summaryOf(base, exp, p, result) };
  }
  if (!stepped) return { result: modPow(base, exp, p) };
  const { result, rows } = modPowTrace(base, exp, p);
  const expBits = exp.toString(2);
  const view = rows.map((r) => ({
    bit: r.bit,
    before: String(r.before),
    squared: String(r.squared),
    after: String(r.after),
  }));
  const formula = purpose === 'public' ? 'gˣ mod p' : 'yˣ mod p';
  rows.forEach((row, i) => {
    const square = `${row.before}² mod ${p} = ${row.squared}`;
    run.step({
      kind: 'dh.powStep',
      id: `${id}.bit${i}`,
      label: row.bit
        ? `${NAMES[actor]}, bit ${i + 1} of ${rows.length} is 1: square, ${square}, then × ${base} mod ${p} = ${row.after}.`
        : `${NAMES[actor]}, bit ${i + 1} of ${rows.length} is 0: square only, ${square}.`,
      detail: `${formula} with exponent ${exp} = ${expBits} in binary. Square-and-multiply reads the exponent from the top bit: square the running value for every bit, and multiply by ${base} when the bit is 1. Every value is reduced mod ${p}, so nothing grows past ${p}².`,
      citation: 'hac.14.6.1',
      actor,
      purpose,
      base: String(base),
      exp: String(exp),
      p: String(p),
      expBits,
      row: i,
      rows: view,
    });
  });
  return { result };
}

/** A private exponent step. */
export function emitPrivate(
  run: RunBuilder<DhEvent>,
  {
    id,
    actor,
    name,
    value,
    group,
    source,
  }: {
    id: string;
    actor: DhParty | 'mallory';
    name: string;
    value: bigint;
    group: DhGroup;
    source: 'seed' | 'user';
  },
): void {
  const { min, max } = privateRange(group);
  const who = actor === 'mallory' ? 'Mallory' : NAMES[actor];
  const shown =
    group.kind === 'toy' ? `${name} = ${value}` : `${name}, ${digits(value)} digits`;
  run.step({
    kind: 'dh.private',
    id,
    label: `${who} picks a private number ${shown} and tells no one.`,
    detail: `${source === 'user' ? 'Chosen by you' : 'Drawn from the seeded rng'}, ${group.kind === 'toy' ? `in [${min}, ${max}] = [2, q − 2] as RFC 2631 asks` : `a ${REALISTIC_PRIVATE_BITS}-bit number: RFC 2631 allows anything in [2, q − 2], and a short exponent like this is common in practice because the group's own strength (about 112 bits) is the limit anyway`}. The rng here is not cryptographic, so this is for display only: a real private key comes from a secure random source.`,
    citation: 'rfc2631.2.1.1',
    actor,
    name,
    value: String(value),
    min: String(min),
    max: String(max),
    source,
  });
}

/** Both of a party's public-key steps: the bits, then the value. */
export function emitPublic(
  run: RunBuilder<DhEvent>,
  {
    id,
    actor,
    name,
    exp,
    expName,
    group,
    stepped,
  }: {
    id: string;
    actor: DhParty;
    name: string;
    exp: bigint;
    expName: string;
    group: DhGroup;
    stepped?: boolean;
  },
): bigint {
  const { result, summary } = emitPow(run, {
    id,
    actor,
    purpose: 'public',
    base: group.g,
    exp,
    group,
    stepped,
  });
  const toy = group.kind === 'toy';
  run.step({
    kind: 'dh.publicKey',
    id: `${id}.value`,
    label: toy
      ? `${NAMES[actor]}'s public share ${name} = ${group.g}^${exp} mod ${group.p} = ${result}.`
      : `${NAMES[actor]}'s public share ${name} = g^${expName} mod p, a ${digits(result)}-digit number.`,
    detail: toy
      ? `${name} is safe to send: getting ${expName} back from ${name} is the discrete logarithm problem, which is only easy here because p is tiny.`
      : `Computed in one go: ${summary?.squarings} squarings and ${summary?.multiplications} multiplications of ${digits(group.p)}-digit numbers, the same steps as in a toy group, just too many to show.`,
    citation: 'rfc2631.2.1.1',
    actor,
    name,
    g: String(group.g),
    exp: String(exp),
    p: String(group.p),
    value: String(result),
    ...(summary ? { summary } : {}),
  });
  return result;
}

/** A share crossing the public channel. */
export function emitSend(
  run: RunBuilder<DhEvent>,
  id: string,
  from: DhParty,
  name: string,
  value: bigint,
  group: DhGroup,
): void {
  const to: DhParty = from === 'alice' ? 'bob' : 'alice';
  run.step({
    kind: 'dh.send',
    id,
    label: `${NAMES[from]} sends ${name} = ${group.kind === 'toy' ? value : `(${digits(value)} digits)`} to ${NAMES[to]}, in the open.`,
    detail: 'Anyone on the channel can read this, and in this module Eve does.',
    citation: 'rfc2631.2.1.1',
    actor: 'public',
    from,
    to,
    name,
    value: String(value),
  });
}

/** Public key validation of the share a party received. */
export function emitValidate(
  run: RunBuilder<DhEvent>,
  id: string,
  actor: DhParty,
  name: string,
  y: bigint,
  group: DhGroup,
): void {
  const check = modPow(y, group.q, group.p);
  const ok = y >= 2n && y <= group.p - 2n && check === 1n;
  const toy = group.kind === 'toy';
  run.step({
    kind: 'dh.validate',
    id,
    label: toy
      ? `${NAMES[actor]} checks ${name}: ${y}^${group.q} mod ${group.p} = ${check}${ok ? ', so it is in the subgroup.' : ', so it is rejected.'}`
      : `${NAMES[actor]} checks ${name}: ${name}^q mod p = ${check}${ok ? ', so it is in the subgroup.' : ', so it is rejected.'}`,
    detail:
      'RFC 2631 §2.1.5: a share must lie in 2 ≤ y ≤ p − 2 and satisfy y^q mod p = 1. A share outside the order-q subgroup could force the secret into a tiny set of values.',
    citation: 'rfc2631.2.1.5',
    actor,
    name,
    value: String(y),
    q: String(group.q),
    p: String(group.p),
    check: String(check),
    ok,
  });
}

/** One side's shared secret: the bits, then the value. */
export function emitShared(
  run: RunBuilder<DhEvent>,
  {
    id,
    actor,
    withActor,
    y,
    yName,
    yExpName,
    x,
    xName,
    group,
    stepped,
  }: {
    id: string;
    actor: DhParty;
    withActor: DhActor;
    y: bigint;
    yName: string;
    /** The private exponent inside y, e.g. `'b'` for B = gᵇ. */
    yExpName: string;
    x: bigint;
    xName: string;
    group: DhGroup;
    stepped?: boolean;
  },
): bigint {
  const { result, summary } = emitPow(run, {
    id,
    actor,
    purpose: 'shared',
    base: y,
    exp: x,
    group,
    stepped,
  });
  const toy = group.kind === 'toy';
  run.step({
    kind: 'dh.shared',
    id: `${id}.value`,
    label: toy
      ? `${NAMES[actor]}'s secret = ${yName}^${xName} mod p = ${y}^${x} mod ${group.p} = ${result}.`
      : `${NAMES[actor]}'s secret = ${yName}^${xName} mod p, a ${digits(result)}-digit number.`,
    detail: `${yName}^${xName} = (g^${yExpName})^${xName} = g^(${yExpName}·${xName}) mod p. Exponents multiply, and multiplication doesn't care about order. In real use this number is not a key yet: it goes through a key derivation function (HKDF in TLS 1.3) first.`,
    citation: 'rfc2631.2.1.1',
    actor,
    with: withActor,
    base: String(y),
    exp: String(x),
    p: String(group.p),
    value: String(result),
    ...(summary ? { summary } : {}),
  });
  return result;
}

/** The real groups and X25519, both described. */
function emitInPractice(run: RunBuilder<DhEvent>): void {
  run.step({
    kind: 'dh.realGroups',
    id: 'dh.ex.realGroups',
    label: `Real finite-field groups have primes of ${REAL_GROUPS[0].digits} digits (2048 bits) or more.`,
    detail:
      'RFC 3526 group 14 and RFC 7919 ffdhe2048 are both 2048-bit safe primes with g = 2. The steps are exactly the ones above; only the numbers are longer.',
    citation: 'rfc7919.a.1',
    groups: [...REAL_GROUPS],
  });
  run.step({
    kind: 'dh.x25519',
    id: 'dh.ex.x25519',
    label:
      'Most TLS today uses X25519: the same exchange on an elliptic curve, with 32-byte keys.',
    detail:
      'Instead of g multiplied by itself a times mod p, X25519 adds a curve point to itself a times. Private keys, public keys and the shared secret are each 32 bytes, and the discrete log on the curve is hard at a far smaller size than 2048 bits. Described here, stepped in phase 2 with the TLS 1.3 module.',
    citation: 'rfc7748.6.1',
    keyBytes: 32,
    sharedBytes: 32,
  });
}

/** The exchange chapter: parameters, private keys, shares, validation, secrets. */
export function dhExchangeRun(input: DhInput): SimResult<DhEvent> {
  const ex = dhExchange(input);
  const { group, a, b } = ex;
  const run = createRun<DhEvent>();

  run.group('Parameters', () => emitParams(run, group, 'dh.ex.params'), {
    id: 'params',
    description: 'The public prime p and generator g.',
  });

  run.group(
    'Private keys',
    () => {
      emitPrivate(run, {
        id: 'dh.ex.a',
        actor: 'alice',
        name: 'a',
        value: a,
        group,
        source: input.a === undefined ? 'seed' : 'user',
      });
      emitPrivate(run, {
        id: 'dh.ex.b',
        actor: 'bob',
        name: 'b',
        value: b,
        group,
        source: input.b === undefined ? 'seed' : 'user',
      });
    },
    { id: 'private', description: 'Each side picks a secret exponent.' },
  );

  let A = 0n;
  let B = 0n;
  run.group(
    'Alice computes A',
    () => {
      A = emitPublic(run, {
        id: 'dh.ex.A',
        actor: 'alice',
        name: 'A',
        exp: a,
        expName: 'a',
        group,
      });
    },
    { id: 'alice-public', description: 'A = gᵃ mod p by square-and-multiply.' },
  );
  run.group(
    'Bob computes B',
    () => {
      B = emitPublic(run, {
        id: 'dh.ex.B',
        actor: 'bob',
        name: 'B',
        exp: b,
        expName: 'b',
        group,
      });
    },
    { id: 'bob-public', description: 'B = gᵇ mod p by square-and-multiply.' },
  );

  run.group(
    'Exchange',
    () => {
      emitSend(run, 'dh.ex.sendA', 'alice', 'A', A, group);
      emitSend(run, 'dh.ex.sendB', 'bob', 'B', B, group);
      emitValidate(run, 'dh.ex.checkB', 'alice', 'B', B, group);
      emitValidate(run, 'dh.ex.checkA', 'bob', 'A', A, group);
    },
    {
      id: 'exchange',
      description:
        'A and B cross the public channel, and each side checks the one it got.',
    },
  );

  let aliceSecret = 0n;
  let bobSecret = 0n;
  run.group(
    'Shared secret',
    () => {
      aliceSecret = emitShared(run, {
        id: 'dh.ex.sA',
        actor: 'alice',
        withActor: 'bob',
        y: B,
        yName: 'B',
        yExpName: 'b',
        x: a,
        xName: 'a',
        group,
      });
      bobSecret = emitShared(run, {
        id: 'dh.ex.sB',
        actor: 'bob',
        withActor: 'alice',
        y: A,
        yName: 'A',
        yExpName: 'a',
        x: b,
        xName: 'b',
        group,
      });
      const same = aliceSecret === bobSecret;
      run.step({
        kind: 'dh.agree',
        id: 'dh.ex.agree',
        label: same
          ? `Both sides hold the same secret${group.kind === 'toy' ? `, ${aliceSecret}` : ''}, and it never crossed the channel.`
          : 'The two secrets differ.',
        detail:
          'Bᵃ = (gᵇ)ᵃ = gᵃᵇ = (gᵃ)ᵇ = Aᵇ mod p. The channel carried p, g, A and B; the secret itself was never sent.',
        citation: 'rfc2631.2.1.1',
        alice: String(aliceSecret),
        bob: String(bobSecret),
        same,
      });
    },
    {
      id: 'shared',
      description: 'Each side raises the other’s share to its own private key.',
    },
  );

  run.group('In practice', () => emitInPractice(run), {
    id: 'practice',
    description: 'The real groups, and X25519.',
  });

  return run.finish();
}
