import { createRun } from '@/core/events/builder';
import type { KdfEvent } from '@/core/kdf/events';
import { EXAMPLE_USERS, passwordTableRun } from '@/core/kdf/lookupTable';
import type { PasswordsShareState } from '@/core/kdf/state';
import type { SimResult } from '@/core/sim/result';

/**
 * The users-table chapters (unsalted and salted) and the cost chapter, which has no run.
 * The first screen is one of these, so they're in the route's first load; PBKDF2's run
 * (`./runs`) loads right after hydration (`useDeferredImport`).
 */

export const EMPTY_RUN: SimResult<KdfEvent> = createRun<KdfEvent>().finish();

export function tableRunFor(
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
    default:
      return EMPTY_RUN;
  }
}
