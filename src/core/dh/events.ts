import type { EventBase } from '../events/types';

/**
 * The events of module 6, Diffie-Hellman (RFC 2631, RFC 3526, RFC 7919, RFC 7748).
 * Integers are decimal strings, so events stay JSON-safe however large p is; the UI turns
 * them back into `bigint` where it needs to. Colours are `#rrggbb`.
 */

/** A decimal integer. */
export type Num = string;

/** Who does a step. `public` is the channel everyone can read. */
export type DhActor = 'alice' | 'bob' | 'eve' | 'mallory' | 'public';

/** Which of the two people a value belongs to. */
export type DhParty = 'alice' | 'bob';

/** A named group's size, for "why real p is huge". */
export type DhGroupKind = 'toy' | 'realistic';

// ---------------------------------------------------------------------------------------
// The paint analogy
// ---------------------------------------------------------------------------------------

/** One pot in a mixture: which base paint, how many parts, and its colour. */
export interface PaintPart {
  name: string;
  colour: string;
  parts: number;
}

/** A pot of base paint: the public common colour or someone's secret colour. */
export type DhPaintPotEvent = EventBase & {
  kind: 'dh.paintPot';
  actor: DhActor;
  name: string;
  colour: string;
  role: 'public' | 'secret';
};

/** Mixing paints: the colour is the part-weighted average in OKLab. */
export type DhPaintMixEvent = EventBase & {
  kind: 'dh.paintMix';
  actor: DhActor;
  /** The colours poured together, in the order poured. */
  inputs: string[];
  colour: string;
  /** What is in the pot now, sorted by name. */
  recipe: PaintPart[];
};

/** A mixture sent across the public channel. */
export type DhPaintSendEvent = EventBase & {
  kind: 'dh.paintSend';
  actor: 'public';
  from: DhParty;
  to: DhParty;
  colour: string;
};

/** Both final pots, which hold the same recipe and so the same colour. */
export type DhPaintSharedEvent = EventBase & {
  kind: 'dh.paintShared';
  alice: string;
  bob: string;
  same: boolean;
  recipe: PaintPart[];
};

/** Eve mixes everything she saw, and gets the wrong proportions. */
export type DhPaintEveEvent = EventBase & {
  kind: 'dh.paintEve';
  actor: 'eve';
  colour: string;
  recipe: PaintPart[];
  shared: string;
  /** OKLab distance from the shared colour (0 would be a match). */
  distance: number;
};

/** Where the analogy breaks: paint can be un-mixed, exponentiation mod p can't. */
export type DhPaintLimitEvent = EventBase & {
  kind: 'dh.paintLimit';
};

// ---------------------------------------------------------------------------------------
// The exchange
// ---------------------------------------------------------------------------------------

/** The group: p = 2q + 1 and a generator g of the order-q subgroup (RFC 2631 §2.2.1). */
export type DhParamsEvent = EventBase & {
  kind: 'dh.params';
  /** The group's id in `DH_GROUPS` (not `group`, which is the phase name). */
  groupId: string;
  groupKind: DhGroupKind;
  p: Num;
  q: Num;
  g: Num;
  bits: number;
  digits: number;
  /** g^q mod p, which must be 1. */
  gq: Num;
  /** Toy groups with p ≤ 60: g⁰, g¹, …, g^(q−1) mod p, for the modular clock. */
  subgroup?: Num[];
};

/** A private exponent, drawn from the seeded rng in [2, q − 2] (RFC 2631 §2.1.1). */
export type DhPrivateEvent = EventBase & {
  kind: 'dh.private';
  actor: DhParty | 'mallory';
  name: string;
  value: Num;
  min: Num;
  max: Num;
  source: 'seed' | 'user';
};

/** A square-and-multiply row, as decimal strings. */
export interface PowRowView {
  bit: 0 | 1;
  before: Num;
  squared: Num;
  after: Num;
}

/** One exponent bit of square-and-multiply (toy groups only). */
export type DhPowStepEvent = EventBase & {
  kind: 'dh.powStep';
  actor: DhParty;
  purpose: 'public' | 'shared';
  base: Num;
  exp: Num;
  p: Num;
  /** The exponent in binary, most significant bit first. */
  expBits: string;
  row: number;
  rows: PowRowView[];
};

/** How big a realistic-group exponentiation was, when it is shown as one step. */
export interface PowSummary {
  squarings: number;
  multiplications: number;
  digits: { base: number; exp: number; p: number; result: number };
}

/** A public key share: A = gᵃ mod p or B = gᵇ mod p. */
export type DhPublicKeyEvent = EventBase & {
  kind: 'dh.publicKey';
  actor: DhParty | 'mallory';
  name: string;
  g: Num;
  exp: Num;
  p: Num;
  value: Num;
  summary?: PowSummary;
};

/** A value crossing the public channel. */
export type DhSendEvent = EventBase & {
  kind: 'dh.send';
  actor: 'public';
  from: DhParty;
  to: DhParty;
  name: string;
  value: Num;
};

/** Public key validation (RFC 2631 §2.1.5): 2 ≤ y ≤ p − 2 and y^q mod p = 1. */
export type DhValidateEvent = EventBase & {
  kind: 'dh.validate';
  actor: DhParty;
  name: string;
  value: Num;
  q: Num;
  p: Num;
  /** y^q mod p. */
  check: Num;
  ok: boolean;
};

/** A shared secret ZZ = (other's share)^(own private) mod p (RFC 2631 §2.1.1). */
export type DhSharedEvent = EventBase & {
  kind: 'dh.shared';
  actor: DhParty | 'mallory' | 'eve';
  /** Who the secret is shared with. */
  with: DhActor;
  base: Num;
  exp: Num;
  p: Num;
  value: Num;
  summary?: PowSummary;
};

/** Alice's and Bob's secrets side by side. */
export type DhAgreeEvent = EventBase & {
  kind: 'dh.agree';
  alice: Num;
  bob: Num;
  same: boolean;
};

/** Named real groups, described by size only. */
export interface RealGroupView {
  name: string;
  doc: string;
  bits: number;
  digits: number;
}

/** The standard groups real systems use (RFC 3526, RFC 7919), by digit count. */
export type DhRealGroupsEvent = EventBase & {
  kind: 'dh.realGroups';
  groups: RealGroupView[];
};

/** X25519 (RFC 7748): the same idea on an elliptic curve. Described, not stepped. */
export type DhX25519Event = EventBase & {
  kind: 'dh.x25519';
  keyBytes: number;
  sharedBytes: number;
};

// ---------------------------------------------------------------------------------------
// Eve
// ---------------------------------------------------------------------------------------

/** Everything on the public channel, and nothing else. */
export type DhEveViewEvent = EventBase & {
  kind: 'dh.eveView';
  actor: 'eve';
  p: Num;
  g: Num;
  A: Num;
  B: Num;
};

/** One brute-force guess: is g^x mod p equal to A? */
export type DhEveTryEvent = EventBase & {
  kind: 'dh.eveTry';
  actor: 'eve';
  x: Num;
  /** g^x mod p, from the previous try times g. */
  value: Num;
  target: Num;
  match: boolean;
};

/** A run of guesses shown as one step. */
export type DhEveSkipEvent = EventBase & {
  kind: 'dh.eveSkip';
  actor: 'eve';
  from: Num;
  to: Num;
  count: Num;
};

/** Eve has found a, and computes the shared secret from B. */
export type DhEveFoundEvent = EventBase & {
  kind: 'dh.eveFound';
  actor: 'eve';
  x: Num;
  tries: Num;
  B: Num;
  p: Num;
  shared: Num;
  /** Whether Eve's secret equals Alice's and Bob's. */
  ok: boolean;
};

/** One row of the growth table. */
export interface EveGrowthRow {
  group: string;
  groupKind: DhGroupKind;
  bits: number;
  pDigits: number;
  /** Worst case: every exponent in the subgroup, q − 1 tries. */
  worstCase: Num;
  worstCaseDigits: number;
  /** Worst case at 10⁹ tries a second, in whole years. */
  years: Num;
  yearsDigits: number;
}

/** How brute force grows with p. */
export type DhEveGrowthEvent = EventBase & {
  kind: 'dh.eveGrowth';
  actor: 'eve';
  rows: EveGrowthRow[];
};

// ---------------------------------------------------------------------------------------
// Mallory in the middle
// ---------------------------------------------------------------------------------------

/** Mallory catches a key share and forwards her own instead. */
export type DhMitmInterceptEvent = EventBase & {
  kind: 'dh.mitmIntercept';
  actor: 'mallory';
  from: DhParty;
  to: DhParty;
  name: string;
  original: Num;
  replacement: Num;
  replacementName: string;
};

/** The two secrets: Alice–Mallory and Mallory–Bob. */
export type DhMitmKeysEvent = EventBase & {
  kind: 'dh.mitmKeys';
  alice: Num;
  bob: Num;
  malloryWithAlice: Num;
  malloryWithBob: Num;
  same: boolean;
};

/** The toy cipher c = m·s mod p (ElGamal-style), and its inverse m = c·s⁻¹ mod p. */
export type DhMitmMessageEvent = EventBase & {
  kind: 'dh.mitmMessage';
  actor: DhParty | 'mallory';
  action: 'encrypt' | 'decrypt';
  key: Num;
  input: Num;
  output: Num;
  p: Num;
};

/** The fix: authenticate the key shares. Described, points at modules 5 and 7. */
export type DhMitmFixEvent = EventBase & {
  kind: 'dh.mitmFix';
};

export type DhEvent =
  | DhPaintPotEvent
  | DhPaintMixEvent
  | DhPaintSendEvent
  | DhPaintSharedEvent
  | DhPaintEveEvent
  | DhPaintLimitEvent
  | DhParamsEvent
  | DhPrivateEvent
  | DhPowStepEvent
  | DhPublicKeyEvent
  | DhSendEvent
  | DhValidateEvent
  | DhSharedEvent
  | DhAgreeEvent
  | DhRealGroupsEvent
  | DhX25519Event
  | DhEveViewEvent
  | DhEveTryEvent
  | DhEveSkipEvent
  | DhEveFoundEvent
  | DhEveGrowthEvent
  | DhMitmInterceptEvent
  | DhMitmKeysEvent
  | DhMitmMessageEvent
  | DhMitmFixEvent;
