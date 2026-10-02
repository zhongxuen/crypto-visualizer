import { utf8Encode } from '@/core/bytes/utf8';
import type { HmacEvent } from '@/core/hmac/events';
import { hmacRun } from '@/core/hmac/hmac';
import type { Sha256Event } from '@/core/sha256/events';
import { avalancheRun } from '@/core/sha256/avalanche';
import type { HashingChapter, HashingShareState } from '@/core/sha256/state';
import type { SimResult } from '@/core/sim/result';

import { HASHING_WALKTHROUGH } from './meta';
import { sha256RunFor } from './sha256Run';

// For the page, which loads this file after hydration (`useDeferredImport`): the views of
// SHA-256's later steps (its first, the padding, is in the first load), and of the
// avalanche and HMAC chapters. They render from the loaded module rather than through
// `next/dynamic`, so nothing suspends while a learner steps.
export { HASHING_PAGE_CITATIONS } from './citations';
export { AvalancheView } from './components/AvalancheView';
export { HmacView } from './components/HmacView';
export { Sha256View } from './components/Sha256View';
export { FreePlayInputs } from './components/Inputs';
// The completion card, shown only at the end of the last chapter.
export { CompletionCard } from '@/components/lesson/CompletionCard';
export { HASHING_LEARNED as LEARNED } from './learned';

export type HashingEvent = Sha256Event | HmacEvent;

/**
 * Which core run a chapter shows. Loaded after hydration; the SHA-256 chapter's run is
 * also in `./sha256Run`, which the first screen uses. Free play's message doubles as the HMAC message.
 * Returns `null` when the input can't make a run (an empty message has no bit to flip).
 */
export function hashingRunFor(
  chapter: HashingChapter,
  mode: 'walkthrough' | 'free',
  input: HashingShareState['input'],
): SimResult<HashingEvent> | null {
  const walk = mode === 'walkthrough';
  switch (chapter) {
    case 'sha256':
      return sha256RunFor(mode, input);
    case 'avalanche': {
      const message = utf8Encode(
        walk ? HASHING_WALKTHROUGH.avalancheMessage : input.message,
      );
      const bit = walk ? HASHING_WALKTHROUGH.bit : input.bit;
      if (bit >= message.length * 8) return null;
      return avalancheRun(message, bit);
    }
    case 'hmac':
      return hmacRun(
        utf8Encode(walk ? HASHING_WALKTHROUGH.key : input.key),
        utf8Encode(walk ? HASHING_WALKTHROUGH.hmacMessage : input.message),
      );
  }
}
