import { avalancheRun, encryptBlock, keyExpansionRun } from '@/core/aes/aes128';
import type { AesEvent } from '@/core/aes/events';
import { cbcRun } from '@/core/aes/modes/cbc';
import { MAX_MODE_BYTES } from '@/core/aes/modes/common';
import { ctrRun } from '@/core/aes/modes/ctr';
import { ecbRun } from '@/core/aes/modes/ecb';
import { gcmExplanationRun } from '@/core/aes/modes/gcm';
import { penguinRun } from '@/core/aes/penguin';
import { AES_DEFAULT_SEED, AES_EXAMPLES } from '@/core/aes/scenarios';
import type { AesShareState } from '@/core/aes/state';
import { hexToBytes } from '@/core/bytes/hex';
import { utf8Encode } from '@/core/bytes/utf8';
import type { SimResult } from '@/core/sim/result';

/**
 * The walkthrough's inputs. The block is FIPS 197 Appendix C.1, so the ciphertext at the
 * end is the one printed in the standard. The key schedule is Appendix A.1's key.
 */
export const AES_WALKTHROUGH = {
  block: AES_EXAMPLES.c1,
  keyHex: AES_EXAMPLES.appendixB.keyHex,
  ptHex: AES_EXAMPLES.appendixB.ptHex,
  bit: 0,
  modesText: AES_EXAMPLES.modesText,
  seed: AES_DEFAULT_SEED,
} as const;

/** The inputs a chapter's run is made from, after walkthrough/free play is resolved. */
export interface AesInputs {
  key: Uint8Array;
  block: Uint8Array;
  message: Uint8Array;
  bit: number;
  seed: number;
  mode: AesShareState['input']['mode'];
}

/** What's wrong with free play's input for this chapter, or `null` if it will run. */
export function inputProblem(
  chapter: AesShareState['input']['chapter'],
  input: AesShareState['input'],
): string | null {
  if (chapter === 'gcm') return null;
  if (input.keyHex?.length !== 32) return 'The key must be 16 bytes (32 hex digits).';
  if (chapter === 'block' || chapter === 'avalanche') {
    if (input.ptHex?.length !== 32) return 'The block must be 16 bytes (32 hex digits).';
  }
  if (chapter === 'modes' && (input.ptHex?.length ?? 0) / 2 > MAX_MODE_BYTES) {
    return `The message can be at most ${MAX_MODE_BYTES} bytes.`;
  }
  return null;
}

export function aesInputs(
  chapter: AesShareState['input']['chapter'],
  mode: 'walkthrough' | 'free',
  state: AesShareState,
): AesInputs {
  const input = state.input;
  if (mode === 'walkthrough') {
    const block = chapter === 'block' ? AES_WALKTHROUGH.block : AES_WALKTHROUGH;
    return {
      key: hexToBytes(block.keyHex),
      block: hexToBytes(block.ptHex),
      message: utf8Encode(AES_WALKTHROUGH.modesText),
      bit: AES_WALKTHROUGH.bit,
      seed: AES_WALKTHROUGH.seed,
      mode: input.mode,
    };
  }
  const plain = hexToBytes(input.ptHex ?? '');
  return {
    key: hexToBytes(input.keyHex ?? ''),
    block: plain,
    message: plain,
    bit: input.bit,
    seed: state.seed,
    mode: input.mode,
  };
}

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
      return encryptBlock(key, block, { emit: true }).result;
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
