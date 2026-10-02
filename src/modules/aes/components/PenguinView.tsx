'use client';

import { Lock, Maximize2, X } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

import type { AesPenguinEvent } from '@/core/aes/events';
import type { PenguinImages } from '@/core/aes/penguin';
import { cn } from '@/lib/cn';

import styles from './aes.module.css';
import { useStepPlay } from './motion';
import { Label } from './parts';

const STAGES = ['original', 'ecb', 'cbc'] as const;
type Stage = (typeof STAGES)[number];

const TITLES: Record<Stage, string> = {
  original: 'Original',
  ecb: 'ECB',
  cbc: 'CBC',
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
  label,
  className,
}: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  /** The alt text, or `null` for a copy that adds nothing (the picture under a sweep). */
  label: string | null;
  className?: string;
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
      role={label === null ? undefined : 'img'}
      aria-label={label ?? undefined}
      aria-hidden={label === null || undefined}
      className={cn(
        'border-border block aspect-square w-full rounded border [image-rendering:pixelated]',
        className,
      )}
    />
  );
}

/**
 * The ECB penguin: the same bitmap as plaintext, ECB ciphertext and CBC ciphertext,
 * side by side at every width (three small pictures in a row on a phone; tap one to see
 * it large). Each ciphertext appears on its own step: on a forward step it covers the
 * picture block row by block row, in a quick raster sweep. A picture not reached yet is
 * a hatched "locked until step N" card (B12). The pixels come from `penguinImages` in
 * core.
 */
export const PenguinView = memo(function PenguinView({
  event,
  images,
}: {
  event: AesPenguinEvent;
  images: PenguinImages;
}) {
  const shown = STAGES.indexOf(event.stage);
  const { play, fade } = useStepPlay();
  const [large, setLarge] = useState<Stage | null>(null);
  const enlarged = large !== null && STAGES.indexOf(large) <= shown ? large : null;
  const { width, height } = images;

  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label="The penguin, three ways"
        className="grid grid-cols-3 gap-2 sm:gap-4"
      >
        {STAGES.map((stage, i) => {
          const sweep = play && i === shown && i > 0;
          return (
            <li key={stage} className="flex max-w-48 min-w-0 flex-col gap-1.5">
              <Label>{TITLES[stage]}</Label>
              {i <= shown ? (
                <div className={cn('relative', fade && i === shown && 'motion-fade')}>
                  {sweep ? (
                    <Bitmap
                      pixels={images.original}
                      width={width}
                      height={height}
                      label={null}
                      className="absolute inset-0"
                    />
                  ) : null}
                  <Bitmap
                    key={sweep ? event.id : 'still'}
                    pixels={images[stage]}
                    width={width}
                    height={height}
                    label={ALT[stage]}
                    className={cn('relative', sweep && styles.sweep)}
                  />
                  {/* The whole picture is the target, so a small one is easy to tap. */}
                  <button
                    type="button"
                    aria-pressed={enlarged === stage}
                    aria-label={`Show ${TITLES[stage]} large`}
                    onClick={() => setLarge(enlarged === stage ? null : stage)}
                    className="focus-visible:outline-focus absolute inset-0 flex items-end justify-end rounded p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Maximize2
                      aria-hidden="true"
                      className="bg-surface text-fg-secondary size-5 rounded p-0.5"
                    />
                  </button>
                </div>
              ) : (
                <p className="border-border-strong text-fg-secondary flex aspect-square w-full flex-col items-center justify-center gap-1 rounded border border-dashed bg-[repeating-linear-gradient(135deg,var(--grid)_0_4px,transparent_4px_9px)] p-1 text-center text-xs">
                  <Lock aria-hidden="true" className="size-4" />
                  <span>Locked until step {i + 1}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {enlarged ? (
        <figure className="border-border bg-surface flex w-full max-w-sm flex-col gap-2 rounded-(--radius) border p-2">
          <figcaption className="flex items-center justify-between gap-2">
            <Label>{TITLES[enlarged]}, large</Label>
            <button
              type="button"
              onClick={() => setLarge(null)}
              className="focus-visible:outline-focus text-fg-secondary hover:text-fg min-h-target inline-flex items-center gap-1 rounded px-2 text-sm focus-visible:outline-2 md:min-h-8"
            >
              <X aria-hidden="true" className="size-4" />
              Close
            </button>
          </figcaption>
          <Bitmap pixels={images[enlarged]} width={width} height={height} label={null} />
        </figure>
      ) : null}
      <p className="text-fg-muted text-sm">
        {width}×{height} pixels, 4 bytes each, so one 16-byte AES block is 4 pixels in a
        row. {event.distinctBlocks} distinct blocks out of {event.blocks}.
      </p>
    </div>
  );
});
