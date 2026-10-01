import * as z from 'zod/mini';

import { utf8Encode } from '../bytes/utf8';
import { defineShareState, type ShareStateBase } from '../state/schema';
import { MAX_TEXT_BYTES } from './encode';
import { XOR_CHAPTERS, XOR_SHARE } from './share';

export { XOR_CHAPTERS, XOR_SHARE, type XorChapter } from './share';

const text = (maxBytes: number) =>
  z.string().check(
    z.refine((value) => utf8Encode(value).length <= maxBytes, {
      message: `At most ${maxBytes} UTF-8 bytes`,
    }),
  );

const XOR_INPUT = z.object({
  chapter: z.enum(XOR_CHAPTERS),
  a: text(MAX_TEXT_BYTES),
  b: text(MAX_TEXT_BYTES),
  crib: text(16),
});

export type XorShareState = ShareStateBase<'xor', z.output<typeof XOR_INPUT>>;

/** `?s=` for /xor: which chapter, the two messages and the crib. Defaults: `./share.ts`. */
export const XOR_SHARE_STATE = defineShareState({
  m: XOR_SHARE.m,
  v: XOR_SHARE.v,
  input: XOR_INPUT,
  defaults: XOR_SHARE.defaults,
});
