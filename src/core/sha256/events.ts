import type { EventBase } from '../events/types';

/**
 * The events of SHA-256 (FIPS 180-4). Words are unsigned 32-bit `number`s; byte arrays
 * are `number[]`. Blocks are numbered from 0 here and from 1 in labels.
 */

/** Padding the message (§5.1.1). */
export type Sha256PadEvent = EventBase & {
  kind: 'sha256.pad';
  message: number[];
  padded: number[];
  /** Zero bytes between `0x80` and the length. */
  zeros: number;
  bitLength: number;
};

/** One 512-bit block, parsed into sixteen words (§5.2.1), which are W0–W15. */
export type Sha256BlockEvent = EventBase & {
  kind: 'sha256.block';
  block: number;
  blocks: number;
  bytes: number[];
  words: number[];
  /** The hash value going into this block. */
  H: number[];
};

/** One schedule word, W16–W63 (§6.2.2 step 1). */
export type Sha256ScheduleEvent = EventBase & {
  kind: 'sha256.schedule';
  block: number;
  t: number;
  w: number;
  s0: number;
  s1: number;
  /** The four words it's made from: Wt−2, Wt−7, Wt−15, Wt−16. */
  inputs: [number, number, number, number];
  /** W0 to Wt: the schedule so far. */
  W: number[];
};

/** One compression round (§6.2.2 step 3). */
export type Sha256RoundEvent = EventBase & {
  kind: 'sha256.round';
  block: number;
  t: number;
  /** a–h before and after. */
  before: number[];
  after: number[];
  T1: number;
  T2: number;
  ch: number;
  maj: number;
  S0: number;
  S1: number;
  K: number;
  W: number;
};

/** Adding the working variables into the hash value (§6.2.2 step 4). */
export type Sha256AddEvent = EventBase & {
  kind: 'sha256.add';
  block: number;
  previous: number[];
  working: number[];
  H: number[];
};

/** The final hash value as 32 bytes. */
export type Sha256DigestEvent = EventBase & {
  kind: 'sha256.digest';
  H: number[];
  digest: number[];
};

/** Flip one input bit, hash both, compare. */
export type Sha256AvalancheEvent = EventBase & {
  kind: 'sha256.avalanche';
  stage: 'flip' | 'hashA' | 'hashB' | 'diff';
  a: number[];
  b: number[];
  /** The flipped bit, numbered from the most significant bit of byte 0. */
  bit: number;
  digestA: number[];
  digestB: number[];
  /** How many of the 256 digest bits differ. */
  flipped: number;
};

export type Sha256Event =
  | Sha256PadEvent
  | Sha256BlockEvent
  | Sha256ScheduleEvent
  | Sha256RoundEvent
  | Sha256AddEvent
  | Sha256DigestEvent
  | Sha256AvalancheEvent;
