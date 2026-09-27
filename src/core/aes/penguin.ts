/**
 * The ECB penguin: encrypt a bitmap's bytes with ECB and with CBC, and draw each
 * ciphertext as pixels again.
 *
 * Pixels are 4 bytes (RGBA), so one AES block is 4 pixels in a row. Wherever 4 pixels in
 * a row are one flat colour, ECB turns them into the same 16 bytes of ciphertext every
 * time, so the outline survives encryption. CBC chains every block into the next and the
 * picture becomes noise. The ciphertext is drawn with its first three bytes of each pixel
 * as RGB and the alpha forced opaque, so nothing is hidden by transparency.
 */

import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import {
  PENGUIN_HEIGHT,
  PENGUIN_PALETTE,
  PENGUIN_ROWS,
  PENGUIN_WIDTH,
} from './data/penguin';
import type { AesEvent } from './events';
import { cbcEncrypt } from './modes/cbc';
import { distinctBlocks, seededIv } from './modes/common';
import { ecbEncrypt } from './modes/ecb';
import { BLOCK_BYTES } from './round';

export interface PenguinImages {
  width: number;
  height: number;
  /** RGBA, row-major, 4 bytes per pixel: ready for `ImageData`. */
  original: Uint8ClampedArray;
  ecb: Uint8ClampedArray;
  cbc: Uint8ClampedArray;
  /** The raw ciphertexts, before alpha is forced opaque. */
  ecbCiphertext: Uint8Array;
  cbcCiphertext: Uint8Array;
}

/** The penguin as RGBA bytes, which is what gets encrypted. */
export function penguinBytes(): Uint8Array {
  const out = new Uint8Array(PENGUIN_WIDTH * PENGUIN_HEIGHT * 4);
  PENGUIN_ROWS.forEach((row, y) => {
    for (let x = 0; x < PENGUIN_WIDTH; x += 1) {
      const [r, g, b] = PENGUIN_PALETTE[row[x]];
      out.set([r, g, b, 0xff], 4 * (y * PENGUIN_WIDTH + x));
    }
  });
  return out;
}

function toPixels(bytes: Uint8Array): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(bytes);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 0xff;
  return pixels;
}

/** Encrypt the penguin with ECB and with CBC (IV from `seed`) under `key`. */
export function penguinImages(key: Uint8Array, seed: number): PenguinImages {
  const plain = penguinBytes();
  // Whole blocks already (64 × 64 × 4 bytes), so no padding: the picture keeps its size.
  const ecbCiphertext = ecbEncrypt(key, plain, { padding: false });
  const cbcCiphertext = cbcEncrypt(key, seededIv(seed), plain, { padding: false });
  return {
    width: PENGUIN_WIDTH,
    height: PENGUIN_HEIGHT,
    original: new Uint8ClampedArray(plain),
    ecb: toPixels(ecbCiphertext),
    cbc: toPixels(cbcCiphertext),
    ecbCiphertext,
    cbcCiphertext,
  };
}

/** The penguin as a three-step run: original, ECB, CBC, with block counts. */
export function penguinRun(key: Uint8Array, seed: number): SimResult<AesEvent> {
  const images = penguinImages(key, seed);
  const plain = penguinBytes();
  const blocks = plain.length / BLOCK_BYTES;
  const base = {
    kind: 'aes.penguin' as const,
    width: images.width,
    height: images.height,
    blocks,
  };
  const original = distinctBlocks(plain);
  const ecb = distinctBlocks(images.ecbCiphertext);
  const cbc = distinctBlocks(images.cbcCiphertext);
  const run = createRun<AesEvent>();
  run.group(
    'Penguin',
    () => {
      run.step({
        ...base,
        stage: 'original',
        id: 'aes.penguin.original',
        label: `The picture: ${blocks} blocks of 4 pixels, but only ${original} different blocks.`,
        detail: 'Large areas of flat colour mean the same 16 bytes over and over.',
        citation: 'sp800-38a.6.1',
        distinctBlocks: original,
      });
      run.step({
        ...base,
        stage: 'ecb',
        id: 'aes.penguin.ecb',
        label: `ECB: still ${ecb} different blocks, so the penguin is still there.`,
        detail:
          'Each distinct plaintext block becomes one fixed ciphertext block. The colours change; the shapes do not.',
        citation: 'sp800-38a.6.1',
        distinctBlocks: ecb,
      });
      run.step({
        ...base,
        stage: 'cbc',
        id: 'aes.penguin.cbc',
        label: `CBC: ${cbc} different blocks out of ${blocks}. Noise.`,
        detail:
          'Chaining makes every ciphertext block depend on everything before it, so repeats vanish.',
        citation: 'sp800-38a.6.2',
        distinctBlocks: cbc,
      });
    },
    { id: 'penguin', description: 'The same bitmap under ECB and under CBC.' },
  );
  return run.finish();
}
