import * as z from 'zod/mini';

import { utf8Encode } from '../bytes/utf8';
import { defineShareState, intBetween, type ShareStateBase } from '../state/schema';
import { REALISTIC_BITS } from './keygen';
import { PAPER_PRIME_LIMIT } from './primes';
import { MAX_MESSAGE_DIGITS, RSA_CHAPTERS, RSA_MODES, RSA_SHARE } from './share';
import { MAX_SIGN_TEXT_BYTES } from './sign';

export {
  MAX_MESSAGE_DIGITS,
  RSA_CHAPTERS,
  RSA_MODES,
  RSA_SHARE,
  type RsaChapter,
} from './share';

const RSA_INPUT = z.object({
  chapter: z.enum(RSA_CHAPTERS),
  mode: z.enum(RSA_MODES),
  p: z.optional(intBetween(2, PAPER_PRIME_LIMIT)),
  q: z.optional(intBetween(2, PAPER_PRIME_LIMIT)),
  e: z.optional(intBetween(2, Number.MAX_SAFE_INTEGER)),
  msg: z
    .string()
    .check(z.regex(/^\d+$/, 'A whole number'), z.maxLength(MAX_MESSAGE_DIGITS)),
  text: z.string().check(
    z.refine((value) => utf8Encode(value).length <= MAX_SIGN_TEXT_BYTES, {
      message: `At most ${MAX_SIGN_TEXT_BYTES} UTF-8 bytes`,
    }),
  ),
  bits: z.union(REALISTIC_BITS.map((b) => z.literal(b))),
});

export type RsaShareState = ShareStateBase<'rsa', z.output<typeof RSA_INPUT>>;

/**
 * `?s=` for /rsa: `{ m: 'rsa', v: 1, seed, step, input: { p?, q?, e?, msg, mode, … } }`.
 * `p`, `q` and `e` are paper mode's picks; realistic mode draws its primes from `seed`.
 * `msg` is the number to encrypt (decimal), `text` the message to sign. Neither is a
 * password, and the keys are for display only.
 */
export const RSA_SHARE_STATE = defineShareState({
  m: RSA_SHARE.m,
  v: RSA_SHARE.v,
  input: RSA_INPUT,
  defaults: RSA_SHARE.defaults,
});
