import * as z from 'zod/mini';

import { defineShareState, intBetween, type ShareStateBase } from '../state/schema';
import { MAX_MODE_BYTES } from './modes/common';
import { AES_CHAPTERS, AES_MODES, AES_SHARE } from './share';

export { AES_CHAPTERS, AES_MODES, AES_SHARE, type AesChapter } from './share';

const hex = (maxBytes: number) =>
  z
    .string()
    .check(
      z.regex(/^(?:[0-9a-f]{2})*$/, 'Lowercase hex, whole bytes'),
      z.maxLength(2 * maxBytes),
    );

const AES_INPUT = z.object({
  chapter: z.enum(AES_CHAPTERS),
  mode: z.enum(AES_MODES),
  keyHex: z.optional(hex(16).check(z.length(32))),
  ptHex: z.optional(hex(MAX_MODE_BYTES)),
  bit: intBetween(0, 127),
});

export type AesShareState = ShareStateBase<'aes', z.output<typeof AES_INPUT>>;

/**
 * `?s=` for /aes. The key is shared as hex: the keys here are for display only (the UI
 * says so) and are not passwords. `ptHex` is the block (16 bytes) or, for the modes, the
 * message; `bit` is the avalanche bit.
 */
export const AES_SHARE_STATE = defineShareState({
  m: AES_SHARE.m,
  v: AES_SHARE.v,
  input: AES_INPUT,
  defaults: AES_SHARE.defaults,
});
