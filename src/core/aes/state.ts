import { z } from 'zod';

import { defineShareState } from '../state/schema';
import { MAX_MODE_BYTES } from './modes/common';
import { AES_DEFAULT_SEED, AES_EXAMPLES } from './scenarios';

export const AES_CHAPTERS = [
  'block',
  'keys',
  'avalanche',
  'modes',
  'penguin',
  'gcm',
] as const;
export type AesChapter = (typeof AES_CHAPTERS)[number];

export const AES_MODES = ['ecb', 'cbc', 'ctr'] as const;

const hex = (maxBytes: number) =>
  z
    .string()
    .regex(/^(?:[0-9a-f]{2})*$/, 'Lowercase hex, whole bytes')
    .max(2 * maxBytes);

/**
 * `?s=` for /aes. The key is shared as hex: the keys here are for display only (the UI
 * says so) and are not passwords. `ptHex` is the block (16 bytes) or, for the modes, the
 * message; `bit` is the avalanche bit.
 */
export const AES_SHARE_STATE = defineShareState({
  m: 'aes',
  v: 1,
  input: z.object({
    chapter: z.enum(AES_CHAPTERS),
    mode: z.enum(AES_MODES),
    keyHex: hex(16).length(32).optional(),
    ptHex: hex(MAX_MODE_BYTES).optional(),
    bit: z.number().int().min(0).max(127),
  }),
  defaults: {
    seed: AES_DEFAULT_SEED,
    step: 0,
    input: {
      chapter: 'block',
      mode: 'ecb',
      keyHex: AES_EXAMPLES.appendixB.keyHex,
      ptHex: AES_EXAMPLES.appendixB.ptHex,
      bit: 0,
    },
  },
});

export type AesShareState = typeof AES_SHARE_STATE.defaults;
