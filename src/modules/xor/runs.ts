import { utf8Encode } from '@/core/bytes/utf8';
import type { XorEvent } from '@/core/xor/events';
import { truncateUtf8 } from '@/core/xor/encode';
import { otpKey, otpRun } from '@/core/xor/otp';
import { xorExampleRun } from '@/core/xor/scenarios';
import type { XorChapter, XorShareState } from '@/core/xor/state';
import { TWO_TIME_PAD_EXAMPLE, twoTimePadRun } from '@/core/xor/twoTimePad';
import { xorRun } from '@/core/xor/xor';
import type { SimResult } from '@/core/sim/result';

import { bytesRunFor } from './bytesRun';

// For the page, which loads this file after hydration (`useDeferredImport`): every
// chapter's run, the views of every step, and free play's inputs. They render from the
// loaded module rather than through `next/dynamic`, so nothing suspends while a learner
// steps (CLAUDE.md).
export { FreePlayInputs } from './components/Inputs';
export { XorEventView } from './components/XorEventView';

/**
 * Which core run a chapter shows. The walkthrough uses the built-in examples; free play
 * uses the learner's text. The module computes nothing itself: every byte comes from
 * `src/core/xor`.
 */
export function xorRunFor(
  chapter: XorChapter,
  mode: 'walkthrough' | 'free',
  state: Pick<XorShareState, 'seed' | 'input'>,
): SimResult<XorEvent> {
  const { a, b, crib } = state.input;
  const walk = mode === 'walkthrough';
  switch (chapter) {
    case 'bytes':
      return bytesRunFor(mode, state);
    case 'xor': {
      if (walk) return xorExampleRun();
      const bytes = Array.from(utf8Encode(truncateUtf8(a)));
      return xorRun({ a: bytes, b: otpKey(bytes.length, state.seed) });
    }
    case 'otp':
      return otpRun(walk ? 'attack at dawn' : a, walk ? 1 : state.seed);
    case 'ttp':
      return twoTimePadRun(
        walk
          ? { ...TWO_TIME_PAD_EXAMPLE, seed: 1 }
          : { p1: a, p2: b, crib, seed: state.seed },
      );
  }
}
