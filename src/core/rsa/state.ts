import { z } from 'zod';

import { utf8Encode } from '../bytes/utf8';
import { defineShareState } from '../state/schema';
import { REALISTIC_BITS } from './keygen';
import { PAPER_PRIME_LIMIT } from './primes';
import { RSA_DEFAULT_SEED, RSA_EXAMPLE } from './scenarios';
import { MAX_SIGN_TEXT_BYTES } from './sign';

export const RSA_CHAPTERS = ['keys', 'encrypt', 'sign', 'malleability'] as const;
export type RsaChapter = (typeof RSA_CHAPTERS)[number];

export const RSA_MODES = ['paper', 'realistic'] as const;

/** Digits in the largest message a 512-bit n takes. */
export const MAX_MESSAGE_DIGITS = 155;

/**
 * `?s=` for /rsa: `{ m: 'rsa', v: 1, seed, step, input: { p?, q?, e?, msg, mode, … } }`.
 * `p`, `q` and `e` are paper mode's picks; realistic mode draws its primes from `seed`.
 * `msg` is the number to encrypt (decimal), `text` the message to sign. Neither is a
 * password, and the keys are for display only.
 */
export const RSA_SHARE_STATE = defineShareState({
  m: 'rsa',
  v: 1,
  input: z.object({
    chapter: z.enum(RSA_CHAPTERS),
    mode: z.enum(RSA_MODES),
    p: z.number().int().min(2).max(PAPER_PRIME_LIMIT).optional(),
    q: z.number().int().min(2).max(PAPER_PRIME_LIMIT).optional(),
    e: z.number().int().min(2).max(Number.MAX_SAFE_INTEGER).optional(),
    msg: z.string().regex(/^\d+$/, 'A whole number').max(MAX_MESSAGE_DIGITS),
    text: z.string().refine((value) => utf8Encode(value).length <= MAX_SIGN_TEXT_BYTES, {
      message: `At most ${MAX_SIGN_TEXT_BYTES} UTF-8 bytes`,
    }),
    bits: z.union(REALISTIC_BITS.map((b) => z.literal(b))),
  }),
  defaults: {
    seed: RSA_DEFAULT_SEED,
    step: 0,
    input: {
      chapter: 'keys',
      mode: 'paper',
      p: Number(RSA_EXAMPLE.p),
      q: Number(RSA_EXAMPLE.q),
      e: Number(RSA_EXAMPLE.e),
      msg: String(RSA_EXAMPLE.m),
      text: RSA_EXAMPLE.text,
      bits: 512,
    },
  },
});

export type RsaShareState = typeof RSA_SHARE_STATE.defaults;
