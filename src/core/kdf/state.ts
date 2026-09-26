import { z } from 'zod';

import { defineShareState } from '../state/schema';

/**
 * `?s=` for /passwords.
 *
 * RULE: no free-text password is ever put in a link. The link names a built-in example
 * by id (`exampleId`), and `findSecretKeys` refuses any key that looks like a password
 * field. A password typed into the page stays in page memory only.
 */

/** Built-in PBKDF2 examples a link can name. `rfc7914` is RFC 7914 §11's first vector. */
export const PBKDF2_EXAMPLES = [
  {
    id: 'rfc7914',
    password: 'passwd',
    salt: 'salt',
    label: '“passwd” with salt “salt” (RFC 7914)',
  },
  {
    id: 'sunshine',
    password: 'sunshine',
    salt: 'alice',
    label: '“sunshine” with salt “alice”',
  },
  { id: 'letmein', password: 'letmein', salt: 'bob', label: '“letmein” with salt “bob”' },
] as const;

export type Pbkdf2ExampleId = (typeof PBKDF2_EXAMPLES)[number]['id'];

export const PASSWORDS_CHAPTERS = ['lookup', 'salt', 'pbkdf2', 'cost'] as const;
export type PasswordsChapter = (typeof PASSWORDS_CHAPTERS)[number];

export const PASSWORDS_SHARE_STATE = defineShareState({
  m: 'passwords',
  v: 1,
  input: z.object({
    chapter: z.enum(PASSWORDS_CHAPTERS),
    exampleId: z.enum(['rfc7914', 'sunshine', 'letmein']),
    iterations: z.number().int().min(1).max(10_000_000),
    gpus: z.number().int().min(1).max(1_000_000),
    bcryptCost: z.number().int().min(4).max(20),
    argon2MemoryMiB: z.number().int().min(1).max(4096),
    space: z.enum(['common', 'lower8', 'print8', 'words4', 'print12']),
  }),
  defaults: {
    seed: 1,
    step: 0,
    input: {
      chapter: 'lookup',
      exampleId: 'rfc7914',
      iterations: 600_000,
      gpus: 1,
      bcryptCost: 12,
      argon2MemoryMiB: 64,
      space: 'lower8',
    },
  },
});

export type PasswordsShareState = typeof PASSWORDS_SHARE_STATE.defaults;
