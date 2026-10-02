'use client';

import { GripHorizontal } from 'lucide-react';
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { formatByte } from '@/components/blocks';
import { Reveal } from '@/components/motion';
import type { XorCribEvent } from '@/core/xor/events';
import { cn } from '@/lib/cn';

import { printable } from './ByteTape';

/**
 * The two-time pad's crib drag (UIUX §2.2 and §7.2 module 1): the guessed word is a chip
 * the learner drags along `c1 ⊕ c2`, and under it the other message's letters appear.
 *
 * The view computes nothing. Every offset is already a step of core's run (one
 * `xor.crib` event per offset, with the revealed bytes and whether they read as text),
 * so moving the chip is a seek to that step: dragging, the arrow keys, Home and End all
 * land on the same frames the timeline does, and a share link keeps the position.
 */

/** Cell pitch in rem: every row of the strip uses it, so the chip lines up by offset. */
const PITCH = 1.5;

function shown(byte: number): string {
  const char = printable(byte);
  return char === '' ? '?' : char;
}

export function CribDrag({
  event,
  steps,
  onSeekStep,
}: {
  event: XorCribEvent;
  /** The run's step index for each crib offset, in offset order. */
  steps: readonly number[];
  onSeekStep: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const grab = useRef<number | null>(null);
  const { offset, cribBytes, xored, revealed, readable } = event;
  const max = Math.max(0, steps.length - 1);
  const width = cribBytes.length;

  const moveTo = (next: number) => {
    const clamped = Math.min(max, Math.max(0, next));
    if (clamped !== offset && steps[clamped] !== undefined) onSeekStep(steps[clamped]);
  };

  /** The offset under a pointer at `clientX`, keeping the grab point under the finger. */
  const offsetAt = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.width === 0) return offset;
    const pitch = box.width / xored.length;
    return Math.round((clientX - box.left - (grab.current ?? 0)) / pitch);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const box = chip.current?.getBoundingClientRect();
    grab.current = box ? e.clientX - box.left : 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    chip.current?.focus();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (grab.current !== null) moveTo(offsetAt(e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    grab.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: offset - 1,
      ArrowDown: offset - 1,
      ArrowRight: offset + 1,
      ArrowUp: offset + 1,
      PageDown: offset - 5,
      PageUp: offset + 5,
      Home: 0,
      End: max,
    };
    if (!(e.key in moves) || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    // Handled here, so the page's playback keys leave it alone.
    e.preventDefault();
    moveTo(moves[e.key]);
  };

  // On a narrow screen the strip scrolls sideways: keep the chip in view.
  useLayoutEffect(() => {
    const box = scroller.current;
    const strip = track.current;
    if (!box || !strip || box.scrollWidth <= box.clientWidth) return;
    // From the offset, not the chip's box: its `left` may still be mid-transition.
    const pitch = strip.offsetWidth / xored.length;
    const left = offset * pitch;
    const right = left + width * pitch;
    if (left < box.scrollLeft) box.scrollLeft = left - 16;
    else if (right > box.scrollLeft + box.clientWidth)
      box.scrollLeft = right - box.clientWidth + 16;
  }, [offset, width, xored.length]);

  const at = (n: number) => ({ left: `${n * PITCH}rem` }) as CSSProperties;
  const cell = 'inline-flex shrink-0 items-center justify-center font-mono tabular-nums';
  const strip = { width: `${xored.length * PITCH}rem` } as CSSProperties;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-fg-secondary text-sm">
        Drag the crib along <span className="font-mono">c1 ⊕ c2</span>, or focus it and
        press ← or →. Where the guess is right, the other message shows through.
      </p>
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex flex-col gap-1.5" style={strip}>
          <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
            c1 ⊕ c2 = p1 ⊕ p2 (hex)
          </span>
          <div aria-hidden="true" className="flex">
            {xored.map((byte, i) => (
              <span
                key={i}
                data-under-crib={(i >= offset && i < offset + width) || undefined}
                className={cn(
                  cell,
                  'border-border h-8 w-6 border-y border-r text-xs first:rounded-l-md first:border-l last:rounded-r-md',
                  i >= offset && i < offset + width ? 'bg-highlight' : 'bg-surface',
                )}
              >
                {formatByte(byte, 'hex')}
              </span>
            ))}
          </div>

          <div ref={track} className="relative h-12">
            <div
              aria-hidden="true"
              className="border-border-strong absolute inset-x-0 top-1/2 border-t border-dashed"
            />
            <div
              ref={chip}
              role="slider"
              tabIndex={0}
              aria-label={`Crib “${event.crib}”: position along c1 ⊕ c2`}
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={offset}
              aria-valuetext={`Offset ${offset}: ${readable ? `reads “${event.revealedText}”` : 'gibberish'}`}
              data-own-arrows=""
              data-crib-chip=""
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={at(offset)}
              className="ring-accent bg-surface focus-visible:outline-focus absolute top-1 flex h-10 cursor-grab touch-none items-stretch rounded-md shadow-sm ring-2 transition-[left] duration-(--dur-quick) ease-(--ease-out) select-none focus-visible:outline-2 focus-visible:outline-offset-4 active:cursor-grabbing"
            >
              {cribBytes.map((byte, i) => (
                <span key={i} className={cn(cell, 'text-accent w-6 text-base')}>
                  {shown(byte)}
                </span>
              ))}
              <GripHorizontal
                aria-hidden="true"
                className="text-fg-muted absolute -top-3.5 left-1/2 size-4 -translate-x-1/2"
              />
            </div>
          </div>

          <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
            Revealed: crib ⊕ (p1 ⊕ p2)
          </span>
          <div className="relative h-9" aria-hidden="true">
            <div
              style={at(offset)}
              className="absolute top-0 flex transition-[left] duration-(--dur-quick) ease-(--ease-out)"
            >
              {revealed.map((byte, i) => (
                <span
                  key={i}
                  data-revealed=""
                  className={cn(
                    cell,
                    'h-9 w-6 text-lg',
                    readable ? 'highlighter text-fg font-semibold' : 'text-fg-muted',
                  )}
                >
                  {shown(byte)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Reveal trigger={offset}>
        <p
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-md border px-3 py-2',
            readable ? 'border-ok' : 'border-border',
          )}
        >
          <span className="text-fg-muted text-sm">At offset {offset}, revealed:</span>
          <span
            className={cn('font-mono text-lg whitespace-pre', readable && 'highlighter')}
          >
            “{event.revealedText}”
          </span>
          <span
            className={cn('text-sm font-medium', readable ? 'text-ok' : 'text-fg-muted')}
          >
            {readable ? '✓ reads as text' : '✗ gibberish'}
          </span>
        </p>
      </Reveal>
    </div>
  );
}
