import { MAX_MODE_BYTES } from '@/core/aes/modes/common';
import type { AesShareState } from '@/core/aes/state';

import { blockProblem } from './blockRun';

/** What's wrong with free play's input for this chapter, or `null` if it will run. */
export function inputProblem(
  chapter: AesShareState['input']['chapter'],
  input: AesShareState['input'],
): string | null {
  const problem = blockProblem(chapter, input);
  if (problem) return problem;
  if (chapter === 'modes' && (input.ptHex?.length ?? 0) / 2 > MAX_MODE_BYTES) {
    return `The message can be at most ${MAX_MODE_BYTES} bytes.`;
  }
  return null;
}
