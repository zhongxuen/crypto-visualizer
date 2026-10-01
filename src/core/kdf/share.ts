/**
 * The /passwords share state without its validator: the chapters, the built-in examples,
 * the defaults, and a `load()` that imports the zod schema in `./state.ts` once a link is
 * read or written (`LazyShareState` in `../state/schema.ts`). Zod-free, so the page's
 * first load is too.
 *
 * RULE: no free-text password is ever put in a link. The link names a built-in example
 * by id (`exampleId`), and `findSecretKeys` refuses any key that looks like a password
 * field. A password typed into the page stays in page memory only.
 */

import type { LazyShareState } from '../state/schema';
import type { PasswordsShareState } from './state';

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

export const PASSWORDS_SHARE: LazyShareState<PasswordsShareState> = {
  m: 'passwords',
  v: 1,
  defaults: {
    m: 'passwords',
    v: 1,
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
  load: () => import('./state').then((module) => module.PASSWORDS_SHARE_STATE),
};
