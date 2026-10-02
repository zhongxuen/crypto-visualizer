import { utf8Encode } from '@/core/bytes/utf8';
import type { KdfEvent } from '@/core/kdf/events';
import {
  OWASP_PBKDF2_ITERATIONS,
  pbkdf2Run,
  STEPPED_ITERATIONS,
} from '@/core/kdf/pbkdf2';
import { PBKDF2_EXAMPLES } from '@/core/kdf/share';
import type { PasswordsShareState } from '@/core/kdf/state';
import type { SimResult } from '@/core/sim/result';

import type { Pbkdf2Request } from './pbkdf2.worker';
import { tableRunFor } from './tableRun';

export { EMPTY_RUN } from './tableRun';
// For the page, which loads this file after hydration (`useDeferredImport`): the views of
// the PBKDF2 and cost chapters. They render from the loaded module rather than through
// `next/dynamic`, so nothing suspends while a learner steps.
export { CostView } from './components/CostView';
export { Pbkdf2Chapter } from './components/Pbkdf2Chapter';
export { FreePlayInputs } from './components/Inputs';
// The completion card, shown only at the end of the last chapter.
export { CompletionCard } from '@/components/lesson/CompletionCard';
export { PASSWORDS_LEARNED as LEARNED } from './learned';

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

/** The same inputs as the Worker's request: every iteration, run for real off the page. */
export function pbkdf2Request(
  mode: 'walkthrough' | 'free',
  input: PasswordsShareState['input'],
  typed: string,
): Pbkdf2Request {
  const params = pbkdf2Inputs(mode, input, typed);
  return {
    password: Array.from(params.password),
    salt: Array.from(params.salt),
    iterations: params.iterations,
    dkLen: params.dkLen,
  };
}

export function passwordsRunFor(
  mode: 'walkthrough' | 'free',
  input: PasswordsShareState['input'],
  seed: number,
  typed: string,
): SimResult<KdfEvent> {
  if (input.chapter !== 'pbkdf2') return tableRunFor(mode, input, seed, typed);
  const params = pbkdf2Inputs(mode, input, typed);
  return pbkdf2Run({ ...params, finish: params.iterations <= STEPPED_ITERATIONS });
}
