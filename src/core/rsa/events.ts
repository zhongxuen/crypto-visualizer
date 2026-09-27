import type { EventBase } from '../events/types';

/**
 * The events of module 5, RSA (RFC 8017). Integers are decimal strings, so events stay
 * JSON-safe however large n is; the UI turns them back into `bigint` where it needs to.
 */

/** A decimal integer. */
export type Num = string;

/** 'paper': primes below 10⁶, every step shown. 'realistic': up to 512-bit n, summarised. */
export type RsaMode = 'paper' | 'realistic';

/** One prime, and how it was shown to be prime. */
export type RsaPrimeEvent = EventBase & {
  kind: 'rsa.prime';
  which: 'p' | 'q';
  value: Num;
  bits: number;
  test: 'trial' | 'miller-rabin';
  /** Trial division: divisors checked up to ⌊√p⌋. */
  checkedUpTo?: Num;
  /** Miller-Rabin: rounds passed, and odd candidates drawn to find this prime. */
  rounds?: number;
  candidates?: number;
};

/** n = p·q (RFC 8017 §3.1). */
export type RsaModulusEvent = EventBase & {
  kind: 'rsa.modulus';
  p: Num;
  q: Num;
  n: Num;
  bits: number;
};

/** φ(n) = (p − 1)(q − 1), with λ(n) = lcm(p − 1, q − 1) alongside (RFC 8017 §3.2). */
export type RsaTotientEvent = EventBase & {
  kind: 'rsa.totient';
  p: Num;
  q: Num;
  phi: Num;
  lambda: Num;
};

/** The public exponent e, coprime to φ(n). */
export type RsaChooseEEvent = EventBase & {
  kind: 'rsa.chooseE';
  e: Num;
  phi: Num;
  gcd: Num;
  /** Whether the user picked e or it was the default rule. */
  source: 'user' | 'default';
};

/** A row of the extended Euclid table, as decimal strings. */
export interface EgcdRowView {
  q?: Num;
  r: Num;
  s: Num;
  t: Num;
}

/** One row of the extended Euclidean algorithm on (φ(n), e). */
export type RsaEgcdRowEvent = EventBase & {
  kind: 'rsa.egcdRow';
  /** The row this step adds. */
  row: number;
  /** The whole table (the UI shows rows up to `row`). */
  rows: EgcdRowView[];
  a: Num;
  b: Num;
};

/** d = e⁻¹ mod φ(n), read off the table and checked. */
export type RsaPrivateEvent = EventBase & {
  kind: 'rsa.private';
  e: Num;
  phi: Num;
  /** The table's t in the gcd row, before reducing mod φ. */
  t: Num;
  d: Num;
  /** e·d, and e·d mod φ (which must be 1). */
  ed: Num;
  check: Num;
};

/** The finished key pair (RFC 8017 §3.1, §3.2), with the CRT values in the detail. */
export type RsaKeyPairEvent = EventBase & {
  kind: 'rsa.keyPair';
  mode: RsaMode;
  p: Num;
  q: Num;
  n: Num;
  e: Num;
  d: Num;
  phi: Num;
  bits: number;
  dp: Num;
  dq: Num;
  qinv: Num;
};

export type RsaPowOp = 'encrypt' | 'decrypt' | 'sign' | 'verify';

/** A square-and-multiply row, as decimal strings. */
export interface PowRowView {
  bit: 0 | 1;
  before: Num;
  squared: Num;
  after: Num;
}

/** The message to encrypt, m < n (RFC 8017 §5.1.1 step 1). */
export type RsaMessageEvent = EventBase & {
  kind: 'rsa.message';
  m: Num;
  n: Num;
};

/** One exponent bit of square-and-multiply (paper mode). */
export type RsaPowStepEvent = EventBase & {
  kind: 'rsa.powStep';
  op: RsaPowOp;
  base: Num;
  exp: Num;
  n: Num;
  /** The exponent in binary, most significant bit first. */
  expBits: string;
  row: number;
  rows: PowRowView[];
};

/** The result of base^exp mod n: after the steps (paper) or in one go (realistic). */
export type RsaPowResultEvent = EventBase & {
  kind: 'rsa.powResult';
  op: RsaPowOp;
  base: Num;
  exp: Num;
  n: Num;
  result: Num;
  /** Realistic mode: the whole exponentiation in one event. */
  summary?: {
    squarings: number;
    multiplications: number;
    digits: { base: number; exp: number; n: number; result: number };
  };
  /** Decrypt and verify: the value expected back, and whether it matched. */
  expected?: Num;
  ok?: boolean;
};

/** Hash the message, then reduce it to an integer below n (paper mode's toy shortcut). */
export type RsaHashEvent = EventBase & {
  kind: 'rsa.hash';
  text: string;
  digestHex: string;
  /** The digest as an integer. */
  digest: Num;
  /** What gets signed: the digest, reduced mod n when it doesn't fit. */
  h: Num;
  reduced: boolean;
  n: Num;
};

/** Checking the same signature against a changed message. */
export type RsaTamperEvent = EventBase & {
  kind: 'rsa.tamper';
  text: string;
  h: Num;
  recovered: Num;
  ok: boolean;
};

export type RsaActor = 'sender' | 'attacker' | 'receiver';

/** Malleability: the sender encrypts m. */
export type RsaMallSendEvent = EventBase & {
  kind: 'rsa.mallSend';
  actor: 'sender';
  m: Num;
  c: Num;
};

/** Malleability: the attacker computes kᵉ mod n from the public key alone. */
export type RsaMallFactorEvent = EventBase & {
  kind: 'rsa.mallFactor';
  actor: 'attacker';
  k: Num;
  ke: Num;
};

/** Malleability: the attacker replaces c with c·kᵉ mod n. */
export type RsaMallForgeEvent = EventBase & {
  kind: 'rsa.mallForge';
  actor: 'attacker';
  c: Num;
  ke: Num;
  forged: Num;
};

/** Malleability: the receiver decrypts the forgery and gets k·m. */
export type RsaMallReceiveEvent = EventBase & {
  kind: 'rsa.mallReceive';
  actor: 'receiver';
  forged: Num;
  recovered: Num;
  m: Num;
  /** k·m mod n. */
  km: Num;
  ok: boolean;
};

/** Small e and small m: mᵉ < n, so c is an ordinary power and a root undoes it. */
export type RsaCubeRootEvent = EventBase & {
  kind: 'rsa.cubeRoot';
  actor: 'attacker';
  m: Num;
  e: Num;
  c: Num;
  root: Num;
};

/** OAEP and PSS, described and not computed. */
export type RsaPaddingEvent = EventBase & {
  kind: 'rsa.padding';
  scheme: 'oaep' | 'pss';
};

export type RsaEvent =
  | RsaPrimeEvent
  | RsaModulusEvent
  | RsaTotientEvent
  | RsaChooseEEvent
  | RsaEgcdRowEvent
  | RsaPrivateEvent
  | RsaKeyPairEvent
  | RsaMessageEvent
  | RsaPowStepEvent
  | RsaPowResultEvent
  | RsaHashEvent
  | RsaTamperEvent
  | RsaMallSendEvent
  | RsaMallFactorEvent
  | RsaMallForgeEvent
  | RsaMallReceiveEvent
  | RsaCubeRootEvent
  | RsaPaddingEvent;
