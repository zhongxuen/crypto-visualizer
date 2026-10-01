import { utf8Encode } from '@/core/bytes/utf8';
import { createRun } from '@/core/events/builder';
import type { KdfEvent } from '@/core/kdf/events';
import { EXAMPLE_USERS, passwordTableRun } from '@/core/kdf/lookupTable';
import {
  OWASP_PBKDF2_ITERATIONS,
  pbkdf2Run,
  STEPPED_ITERATIONS,
} from '@/core/kdf/pbkdf2';
import { PBKDF2_EXAMPLES } from '@/core/kdf/share';
import type { PasswordsShareState } from '@/core/kdf/state';
import type { SimResult } from '@/core/sim/result';

export const EMPTY_RUN: SimResult<KdfEvent> = createRun<KdfEvent>().finish();

/** Key length the module derives: one SHA-256 block. */
export const DK_LEN = 32;

/**
 * The inputs to a PBKDF2 run. `typed` is the learner's own password: it is used here, in
 * page memory, and never returned into share state.
 */
export function pbkdf2Inputs(
  mode: 'walkthrough' | 'free',
  input: PasswordsShareState['input'],
  typed: string,
) {
  const example =
    PBKDF2_EXAMPLES.find((e) => e.id === input.exampleId) ?? PBKDF2_EXAMPLES[0];
  const own = mode === 'free' && typed.length > 0;
  return {
    password: utf8Encode(own ? typed : example.password),
    salt: utf8Encode(example.salt),
    iterations: mode === 'walkthrough' ? OWASP_PBKDF2_ITERATIONS : input.iterations,
    dkLen: DK_LEN,
  };
}

export function passwordsRunFor(
  mode: 'walkthrough' | 'free',
  input: PasswordsShareState['input'],
  seed: number,
  typed: string,
): SimResult<KdfEvent> {
  const users =
    mode === 'free' && typed.length > 0
      ? [...EXAMPLE_USERS, { name: 'you', password: typed }]
      : EXAMPLE_USERS;
  switch (input.chapter) {
    case 'lookup':
      return passwordTableRun({ users, seed: null });
    case 'salt':
      return passwordTableRun({ users, seed });
    case 'pbkdf2': {
      const params = pbkdf2Inputs(mode, input, typed);
      return pbkdf2Run({ ...params, finish: params.iterations <= STEPPED_ITERATIONS });
    }
    case 'cost':
      return EMPTY_RUN;
  }
}
