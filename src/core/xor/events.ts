import type { EventBase } from '../events/types';

/**
 * The events of module 1, "Bits, bytes and XOR". Each variant's `kind` decides the rest
 * of its fields. Byte arrays are plain `number[]` so events stay JSON-friendly.
 */

/** One character of the text becomes one to four UTF-8 bytes (RFC 3629 §3). */
export type XorCharEvent = EventBase & {
  kind: 'xor.char';
  /** The character, as it appears in the text. */
  char: string;
  codePoint: number;
  /** This character's bytes. */
  bytes: number[];
  /** Where they start in the whole encoding. */
  offset: number;
  /** Every byte encoded so far, this character's included. */
  encoded: number[];
};

/** A named byte string enters the story: a message, a ciphertext. */
export type XorMessageEvent = EventBase & {
  kind: 'xor.message';
  name: string;
  text: string;
  bytes: number[];
};

/** A key drawn from the seeded generator: display only, never secret. */
export type XorKeyEvent = EventBase & {
  kind: 'xor.key';
  name: string;
  key: number[];
  seed: number;
};

/** One byte of `a ⊕ b`, with its bit columns. */
export type XorByteEvent = EventBase & {
  kind: 'xor.byte';
  /** Which pass: combining with the key, or combining again to undo it. */
  pass: 'apply' | 'undo';
  index: number;
  a: number;
  b: number;
  out: number;
  /** Names for the rows, e.g. `['plaintext', 'key', 'ciphertext']`. */
  names: [string, string, string];
  /** The full rows. `out` is filled up to and including `index`. */
  aBytes: number[];
  bBytes: number[];
  outBytes: number[];
};

/** A whole-array result: `c = p ⊕ k`, `c1 ⊕ c2 = p1 ⊕ p2`. */
export type XorResultEvent = EventBase & {
  kind: 'xor.result';
  names: [string, string, string];
  a: number[];
  b: number[];
  out: number[];
  /** The output read as text, when it is text. */
  text?: string;
};

/** A guessed word slid along `p1 ⊕ p2` at one offset. */
export type XorCribEvent = EventBase & {
  kind: 'xor.crib';
  crib: string;
  cribBytes: number[];
  offset: number;
  /** `p1 ⊕ p2`, the whole thing. */
  xored: number[];
  /** `crib ⊕ (p1 ⊕ p2)[offset ..]`: the other message's text there, if the guess was right. */
  revealed: number[];
  revealedText: string;
  /** Whether `revealed` looks like English text. */
  readable: boolean;
};

export type XorEvent =
  | XorCharEvent
  | XorMessageEvent
  | XorKeyEvent
  | XorByteEvent
  | XorResultEvent
  | XorCribEvent;
