'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

import {
  FLIP_ATTR,
  measure,
  play as flip,
  type FlipRects,
} from '@/components/motion/flip';
import { cn } from '@/lib/cn';

import styles from './aes.module.css';
import { useStepPlay } from './motion';

/**
 * A row of values rotated left by `shift` (ShiftRows, RotWord). The DOM always holds the
 * rotated order, the end frame. On a forward step the shared FLIP helper
 * (`src/components/motion/flip.ts`) starts each value from the slot it came from, so it
 * slides left into place; the values that fall off the left end don't cross the row but
 * come back in from the right with a short fade. A seek, a step back or reduced motion
 * shows the end frame at once.
 *
 * `cell(from, wrapped)` draws the value that started at position `from`.
 */
export function RotatedRow({
  length,
  shift,
  cell,
  className,
}: {
  length: number;
  shift: number;
  cell: (from: number, wrapped: boolean) => ReactNode;
  className?: string;
}) {
  const { play } = useStepPlay();
  const ref = useRef<HTMLDivElement>(null);
  // Slot i holds the value that started at (i + shift) mod length.
  const order = Array.from({ length }, (_, i) => (i + shift) % length);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!play || !root || shift === 0) return;
    const now = measure(root);
    // Where each value was a step ago: the slot that bears its starting position.
    const slot = [...root.children].map((node) => node.getBoundingClientRect());
    const origin = root.getBoundingClientRect();
    const before: FlipRects = new Map();
    for (const key of now.keys()) {
      const from = slot[Number(key)];
      before.set(key, { x: from.left - origin.left, y: from.top - origin.top });
    }
    flip(root, before, now);
  }, [play, shift]);

  return (
    <div ref={ref} data-flip-root="" className={cn('flex gap-1', className)}>
      {order.map((from) => {
        const wrapped = from < shift;
        return (
          <span
            key={from}
            {...{ [FLIP_ATTR]: wrapped ? undefined : from }}
            className={cn('inline-flex', wrapped && play && styles.wrapIn)}
          >
            {cell(from, wrapped)}
          </span>
        );
      })}
    </div>
  );
}
