import { utf8Encode } from '@/core/bytes/utf8';
import type { HmacEvent } from '@/core/hmac/events';
import { hmacRun } from '@/core/hmac/hmac';
import type { Sha256Event } from '@/core/sha256/events';
import { avalancheRun, sha256Run } from '@/core/sha256/sha256';
import type { HashingChapter, HashingShareState } from '@/core/sha256/state';
import type { SimResult } from '@/core/sim/result';

import { HASHING_WALKTHROUGH } from './meta';

export type HashingEvent = Sha256Event | HmacEvent;

/**
 * Which core run a chapter shows. Free play's message doubles as the HMAC message.
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
      return sha256Run(utf8Encode(walk ? HASHING_WALKTHROUGH.message : input.message));
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
