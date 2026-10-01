import type { RsaEvent } from '@/core/rsa/events';
import { rsaMalleabilityRun } from '@/core/rsa/malleability';
import { rsaEncryptRun } from '@/core/rsa/rsa';
import { rsaSignRun } from '@/core/rsa/sign';
import type { RsaChapter, RsaShareState } from '@/core/rsa/state';
import type { SimResult } from '@/core/sim/result';

import {
  keyInputFor,
  keysRunFor,
  RSA_WALKTHROUGH,
  runOrProblem,
  type Mode,
} from './keysRun';

export { keyInputFor, RSA_WALKTHROUGH } from './keysRun';
// For the page, which loads this file after hydration (`useDeferredImport`): the views of
// the encrypt, sign and malleability chapters. They render from the loaded module rather
// than through `next/dynamic`, so nothing suspends while a learner steps.
export { RSA_PAGE_CITATIONS } from './citations';
export { ChapterPicture } from './components/ChapterViews';
export { MalleabilityStrip } from './components/MalleabilityStrip';
export { FreePlayInputs } from './components/Inputs';

export interface RsaRun {
  result: SimResult<RsaEvent> | null;
  /** Why free play's input can't make this chapter's run. */
  problem: string | null;
}

/**
 * The core run a chapter shows. Loaded after hydration (`useDeferredImport`); the keys
 * chapter's run is also in `./keysRun`, which the first screen uses.
 */
export function rsaRunFor(chapter: RsaChapter, mode: Mode, state: RsaShareState): RsaRun {
  if (chapter === 'keys') return keysRunFor(mode, state);
  const key = keyInputFor(mode, state);
  const m = mode === 'walkthrough' ? RSA_WALKTHROUGH.m : BigInt(state.input.msg || '0');
  const text = mode === 'walkthrough' ? RSA_WALKTHROUGH.text : state.input.text;
  return runOrProblem(() =>
    chapter === 'encrypt'
      ? rsaEncryptRun(key, m)
      : chapter === 'sign'
        ? rsaSignRun(key, text)
        : rsaMalleabilityRun(key, m),
  );
}
