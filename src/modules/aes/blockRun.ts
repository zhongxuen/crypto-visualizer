import { encryptBlock } from '@/core/aes/aes128';
import type { AesEvent } from '@/core/aes/events';
import { AES_DEFAULT_SEED, AES_EXAMPLES } from '@/core/aes/examples';
import { MAX_MODE_BYTES } from '@/core/aes/modes/common';
import type { AesShareState } from '@/core/aes/state';
import { hexToBytes } from '@/core/bytes/hex';
import { utf8Encode } from '@/core/bytes/utf8';
import type { SimResult } from '@/core/sim/result';

/*
 * The "One block" chapter and the input helpers every chapter shares. The block is the
 * first screen, so it's in the route's first load; the other chapters' runs (`./runs`)
 * load right after hydration (`useDeferredImport`).
 */

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

/** The block chapter's run, or `null` when free play's input can't make one. */
export function blockRunFor(
  mode: 'walkthrough' | 'free',
  state: AesShareState,
): SimResult<AesEvent> | null {
  if (mode === 'free' && inputProblem('block', state.input)) return null;
  const { key, block } = aesInputs('block', mode, state);
  return encryptBlock(key, block, { emit: true }).result;
}
