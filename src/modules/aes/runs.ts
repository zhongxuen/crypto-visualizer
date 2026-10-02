import { avalancheRun } from '@/core/aes/avalanche';
import { keyExpansionRun } from '@/core/aes/keyScheduleRun';
import type { AesEvent } from '@/core/aes/events';
import { cbcRun } from '@/core/aes/modes/cbc';
import { ctrRun } from '@/core/aes/modes/ctr';
import { ecbRun } from '@/core/aes/modes/ecb';
import { gcmExplanationRun } from '@/core/aes/modes/gcm';
import { penguinRun } from '@/core/aes/penguin';
import type { AesShareState } from '@/core/aes/state';
import type { SimResult } from '@/core/sim/result';

import { aesInputs, blockRunFor } from './blockRun';
import { inputProblem } from './inputProblem';

export { AES_WALKTHROUGH, aesInputs, type AesInputs } from './blockRun';
export { inputProblem } from './inputProblem';
// For the page, which loads this file after hydration (`useDeferredImport`): the penguin's
// pixels and the views of every chapter but the block. They render from the loaded module
// rather than through `next/dynamic`, so nothing suspends while a learner steps.
export { penguinImages } from '@/core/aes/penguin';
export { AES_PAGE_CITATIONS } from './citations';
export { AvalancheView } from './components/AvalancheView';
export { GcmView } from './components/GcmView';
export { KeyScheduleView } from './components/KeyScheduleView';
export { ModeView } from './components/ModeView';
export { ModePicker } from './components/ModePicker';
export { PenguinView } from './components/PenguinView';
export { FreePlayInputs } from './components/Inputs';
// The completion card, shown only at the end of the last chapter.
export { CompletionCard } from '@/components/lesson/CompletionCard';
export { AES_LEARNED as LEARNED } from './learned';

/** Which core run a chapter shows, or `null` when free play's input can't make one. */
export function aesRunFor(
  chapter: AesShareState['input']['chapter'],
  mode: 'walkthrough' | 'free',
  state: AesShareState,
): SimResult<AesEvent> | null {
  if (mode === 'free' && inputProblem(chapter, state.input)) return null;
  const {
    key,
    block,
    message,
    bit,
    seed,
    mode: cipherMode,
  } = aesInputs(chapter, mode, state);
  switch (chapter) {
    case 'block':
      return blockRunFor(mode, state);
    case 'keys':
      return keyExpansionRun(key);
    case 'avalanche':
      return avalancheRun(key, block, bit);
    case 'modes':
      return cipherMode === 'ecb'
        ? ecbRun(key, message)
        : cipherMode === 'cbc'
          ? cbcRun(key, message, seed)
          : ctrRun(key, message, seed);
    case 'penguin':
      return penguinRun(key, seed);
    case 'gcm':
      return gcmExplanationRun();
  }
}
