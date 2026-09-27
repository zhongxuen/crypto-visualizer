'use client';

import { memo, useEffect, useRef } from 'react';

import type { AesPenguinEvent } from '@/core/aes/events';
import type { PenguinImages } from '@/core/aes/penguin';

import { Label } from './parts';

const STAGES = ['original', 'ecb', 'cbc'] as const;
type Stage = (typeof STAGES)[number];

const TITLES: Record<Stage, string> = {
  original: 'Original',
  ecb: 'Encrypted with ECB',
  cbc: 'Encrypted with CBC',
};

const ALT: Record<Stage, string> = {
  original:
    'A cartoon penguin on a pale blue sky: black head and back, white belly, orange beak and feet.',
  ecb: 'The ECB ciphertext drawn as pixels. The colours are scrambled, but the penguin’s outline, belly and feet are still plainly visible.',
  cbc: 'The CBC ciphertext drawn as pixels: uniform coloured noise with no trace of the penguin.',
};

/** One bitmap on a canvas, scaled up with square pixels. */
function Bitmap({
  pixels,
  width,
  height,
  stage,
}: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  stage: Stage;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context) return;
    context.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), width, height),
      0,
      0,
    );
  }, [pixels, width, height]);
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      role="img"
      aria-label={ALT[stage]}
      className="border-border aspect-square w-full max-w-48 rounded border [image-rendering:pixelated]"
    />
  );
}

/**
 * The ECB penguin: the same bitmap as plaintext, ECB ciphertext and CBC ciphertext,
 * revealed one per step. The pixels come from `penguinImages` in core.
 */
export const PenguinView = memo(function PenguinView({
  event,
  images,
}: {
  event: AesPenguinEvent;
  images: PenguinImages;
}) {
  const shown = STAGES.indexOf(event.stage);
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAGES.map((stage, i) => (
          <li key={stage} className="flex flex-col gap-2">
            <Label>{TITLES[stage]}</Label>
            {i <= shown ? (
              <Bitmap
                pixels={images[stage]}
                width={images.width}
                height={images.height}
                stage={stage}
              />
            ) : (
              <p className="border-border text-fg-muted flex aspect-square w-full max-w-48 items-center justify-center rounded border border-dashed p-2 text-center text-sm">
                Next step
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-fg-muted text-sm">
        {images.width}×{images.height} pixels, 4 bytes each, so one 16-byte AES block is 4
        pixels in a row. {event.distinctBlocks} distinct blocks out of {event.blocks}.
      </p>
    </div>
  );
});
