import { utf8Encode } from '@/core/bytes/utf8';
import type { Sha256Event } from '@/core/sha256/events';
import { sha256Run } from '@/core/sha256/run';
import type { HashingShareState } from '@/core/sha256/state';
import type { SimResult } from '@/core/sim/result';

import { HASHING_WALKTHROUGH } from './meta';

/**
 * The SHA-256 chapter's run. It's the first screen, so it's in the route's first load;
 * the avalanche and HMAC chapters' runs (`./runs`) load right after hydration
 * (`useDeferredImport`).
 */
export function sha256RunFor(
  mode: 'walkthrough' | 'free',
  input: HashingShareState['input'],
): SimResult<Sha256Event> {
  return sha256Run(
    utf8Encode(mode === 'walkthrough' ? HASHING_WALKTHROUGH.message : input.message),
  );
}
