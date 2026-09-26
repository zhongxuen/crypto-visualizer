import { z } from 'zod';

import { utf8Encode } from '../bytes/utf8';
import { defineShareState } from '../state/schema';
import { MAX_STEPPED_BYTES } from './sha256';

const text = (maxBytes: number) =>
  z.string().refine((value) => utf8Encode(value).length <= maxBytes, {
    message: `At most ${maxBytes} UTF-8 bytes`,
  });

export const HASHING_CHAPTERS = ['sha256', 'avalanche', 'hmac'] as const;
export type HashingChapter = (typeof HASHING_CHAPTERS)[number];

/** Longest HMAC key a link carries: enough for a key longer than one block. */
export const MAX_HMAC_KEY_BYTES = 131;

/** `?s=` for /hashing (SHA-256 and HMAC): chapter, message, flipped bit and MAC key. */
export const HASHING_SHARE_STATE = defineShareState({
  m: 'hashing',
  v: 1,
  input: z.object({
    chapter: z.enum(HASHING_CHAPTERS),
    message: text(MAX_STEPPED_BYTES),
    bit: z
      .number()
      .int()
      .min(0)
      .max(MAX_STEPPED_BYTES * 8 - 1),
    key: text(MAX_HMAC_KEY_BYTES),
  }),
  defaults: {
    seed: 0,
    step: 0,
    input: { chapter: 'sha256', message: 'abc', bit: 0, key: 'Jefe' },
  },
});

export type HashingShareState = typeof HASHING_SHARE_STATE.defaults;
