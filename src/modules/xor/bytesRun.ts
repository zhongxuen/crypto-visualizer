import { encodeRun } from '@/core/xor/encode';
import type { XorEvent } from '@/core/xor/events';
import type { XorShareState } from '@/core/xor/state';
import type { SimResult } from '@/core/sim/result';

/**
 * The first chapter's run, in the route's first-load JS. The other chapters' runs load
 * after hydration (`./runs.ts`).
 *
 * The example text is `XOR_EXAMPLE_TEXT` from `src/core/xor/scenarios.ts`, copied here
 * because that file also builds every other chapter's run and Turbopack ships a file
 * whole. `XorModule.test.tsx` checks the two agree.
 */
export const BYTES_EXAMPLE_TEXT = 'Hi é 🔐';

export function bytesRunFor(
  mode: 'walkthrough' | 'free',
  state: Pick<XorShareState, 'input'>,
): SimResult<XorEvent> {
  return encodeRun(mode === 'walkthrough' ? BYTES_EXAMPLE_TEXT : state.input.a);
}
