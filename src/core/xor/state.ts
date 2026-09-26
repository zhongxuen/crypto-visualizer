import { z } from 'zod';

import { utf8Encode } from '../bytes/utf8';
import { defineShareState } from '../state/schema';
import { MAX_TEXT_BYTES } from './encode';
import { TWO_TIME_PAD_EXAMPLE } from './twoTimePad';

const text = (maxBytes: number) =>
  z.string().refine((value) => utf8Encode(value).length <= maxBytes, {
    message: `At most ${maxBytes} UTF-8 bytes`,
  });

export const XOR_CHAPTERS = ['bytes', 'xor', 'otp', 'ttp'] as const;
export type XorChapter = (typeof XOR_CHAPTERS)[number];

/** `?s=` for /xor: which chapter, the two messages and the crib. */
export const XOR_SHARE_STATE = defineShareState({
  m: 'xor',
  v: 1,
  input: z.object({
    chapter: z.enum(XOR_CHAPTERS),
    a: text(MAX_TEXT_BYTES),
    b: text(MAX_TEXT_BYTES),
    crib: text(16),
  }),
  defaults: {
    seed: 1,
    step: 0,
    input: {
      chapter: 'bytes',
      a: TWO_TIME_PAD_EXAMPLE.p1,
      b: TWO_TIME_PAD_EXAMPLE.p2,
      crib: TWO_TIME_PAD_EXAMPLE.crib,
    },
  },
});

export type XorShareState = typeof XOR_SHARE_STATE.defaults;
