import type { EventBase } from '../events/types';

/** The events of HMAC-SHA-256 (RFC 2104). Byte arrays are `number[]`. */

/** Why `SHA-256(key ‖ message)` is not a MAC: length extension, explained. */
export type HmacNaiveEvent = EventBase & {
  kind: 'hmac.naive';
  key: number[];
  message: number[];
  /** SHA-256(key ‖ message). */
  naiveTag: number[];
  /** The padding SHA-256 appended to key ‖ message, which an attacker's forgery carries. */
  glue: number[];
};

/** Step 1: the key, hashed if longer than a block, zero-padded to 64 bytes. */
export type HmacKeyEvent = EventBase & {
  kind: 'hmac.key';
  key: number[];
  /** K0: 64 bytes. */
  k0: number[];
  hashed: boolean;
};

/** Steps 2 and 5: K0 ⊕ ipad or K0 ⊕ opad. */
export type HmacPadEvent = EventBase & {
  kind: 'hmac.pad';
  which: 'ipad' | 'opad';
  /** 0x36 or 0x5c, repeated. */
  pad: number;
  k0: number[];
  padded: number[];
};

/**
 * Steps 3–4 and 6–7: one SHA-256, collapsed to a single step (module 2 already steps
 * SHA-256 in full). `input` is what was hashed, so the UI can offer to expand it.
 */
export type HmacHashEvent = EventBase & {
  kind: 'hmac.hash';
  which: 'inner' | 'outer';
  input: number[];
  digest: number[];
};

/** The tag, and why the outer hash stops length extension. */
export type HmacTagEvent = EventBase & {
  kind: 'hmac.tag';
  tag: number[];
  naiveTag: number[];
};

export type HmacEvent =
  HmacNaiveEvent | HmacKeyEvent | HmacPadEvent | HmacHashEvent | HmacTagEvent;
