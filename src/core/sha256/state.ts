import * as z from 'zod/mini';

import { utf8Encode } from '../bytes/utf8';
import { defineShareState, intBetween, type ShareStateBase } from '../state/schema';
import { MAX_STEPPED_BYTES } from './sha256';
import { HASHING_CHAPTERS, HASHING_SHARE, MAX_HMAC_KEY_BYTES } from './share';

export {
  HASHING_CHAPTERS,
  HASHING_SHARE,
  MAX_HMAC_KEY_BYTES,
  type HashingChapter,
} from './share';

const text = (maxBytes: number) =>
  z.string().check(
    z.refine((value) => utf8Encode(value).length <= maxBytes, {
      message: `At most ${maxBytes} UTF-8 bytes`,
    }),
  );

const HASHING_INPUT = z.object({
  chapter: z.enum(HASHING_CHAPTERS),
  message: text(MAX_STEPPED_BYTES),
  bit: intBetween(0, MAX_STEPPED_BYTES * 8 - 1),
  key: text(MAX_HMAC_KEY_BYTES),
});

export type HashingShareState = ShareStateBase<'hashing', z.output<typeof HASHING_INPUT>>;

/** `?s=` for /hashing (SHA-256 and HMAC): chapter, message, flipped bit and MAC key. */
export const HASHING_SHARE_STATE = defineShareState({
  m: HASHING_SHARE.m,
  v: HASHING_SHARE.v,
  input: HASHING_INPUT,
  defaults: HASHING_SHARE.defaults,
});
