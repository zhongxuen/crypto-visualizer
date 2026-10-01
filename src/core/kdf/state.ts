import * as z from 'zod/mini';

import { defineShareState, intBetween, type ShareStateBase } from '../state/schema';
import { PASSWORDS_CHAPTERS, PASSWORDS_SHARE } from './share';

export {
  PASSWORDS_CHAPTERS,
  PASSWORDS_SHARE,
  PBKDF2_EXAMPLES,
  type PasswordsChapter,
  type Pbkdf2ExampleId,
} from './share';

const PASSWORDS_INPUT = z.object({
  chapter: z.enum(PASSWORDS_CHAPTERS),
  exampleId: z.enum(['rfc7914', 'sunshine', 'letmein']),
  iterations: intBetween(1, 10_000_000),
  gpus: intBetween(1, 1_000_000),
  bcryptCost: intBetween(4, 20),
  argon2MemoryMiB: intBetween(1, 4096),
  space: z.enum(['common', 'lower8', 'print8', 'words4', 'print12']),
});

export type PasswordsShareState = ShareStateBase<
  'passwords',
  z.output<typeof PASSWORDS_INPUT>
>;

/** `?s=` for /passwords. It carries an example's id, never password text: see `./share.ts`. */
export const PASSWORDS_SHARE_STATE = defineShareState({
  m: PASSWORDS_SHARE.m,
  v: PASSWORDS_SHARE.v,
  input: PASSWORDS_INPUT,
  defaults: PASSWORDS_SHARE.defaults,
});
