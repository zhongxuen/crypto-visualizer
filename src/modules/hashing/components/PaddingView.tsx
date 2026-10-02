'use client';

import type { CSSProperties, ReactNode } from 'react';

import { Reveal } from '@/components/motion/reveal';
import { bytesToHex } from '@/core/bytes/hex';
import type { Sha256PadEvent } from '@/core/sha256/events';
import { cn } from '@/lib/cn';

type ByteFormat = 'hex' | 'binary';

/**
 * The SHA-256 chapter's first step, in the route's first load. It uses only <Reveal>
 * (already on every module page for the step caption), so the other motion primitives
 * load with the later steps' views (`./Sha256View`, through `../runs`).
 */

const formatByte = (byte: number, format: ByteFormat) =>
  format === 'hex'
    ? byte.toString(16).padStart(2, '0')
    : byte.toString(2).padStart(8, '0');

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------------
 * Padding: the message bytes, then 0x80, the zeros and the length fill the block in
 * that order (a <Reveal> per cell, staggered). Each part has its own cell style and caption, not colour
 * alone.
 * -------------------------------------------------------------------------------- */

type Part = 'msg' | 'one' | 'zero' | 'len';

const PART_CELL: Record<Part, string> = {
  msg: 'border-border-strong bg-surface border',
  one: 'border-accent bg-highlight border-2',
  zero: 'border-border text-fg-muted border border-dashed',
  len: 'border-accent bg-surface border-2',
};

const PART_NAME: Record<Part, [string, string]> = {
  msg: ['message byte', 'message bytes'],
  one: ['0x80 byte: a 1 bit, then zeros', ''],
  zero: ['zero byte', 'zero bytes'],
  len: ['length bytes', 'length bytes'],
};

function partOf(event: Sha256PadEvent, index: number): Part {
  if (index < event.message.length) return 'msg';
  if (index === event.message.length) return 'one';
  if (index >= event.padded.length - 8) return 'len';
  return 'zero';
}

function captionOf(part: Part, byte: number): string {
  if (part === 'msg')
    return byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '·';
  if (part === 'one') return '1 bit';
  if (part === 'len') return 'len';
  return ' ';
}

export function PaddingView({
  event,
  format,
}: {
  event: Sha256PadEvent;
  format: ByteFormat;
}) {
  const blocks = event.padded.length / 64;
  const stagger = Math.max(2, Math.round(360 / event.padded.length));
  const cells: ReactNode[] = [];
  event.padded.forEach((byte, i) => {
    if (i % 64 === 0 && blocks > 1) {
      cells.push(
        <span key={`b${i}`} className="text-fg-muted col-span-full pt-1 text-xs">
          Block {i / 64 + 1}
        </span>,
      );
    }
    const part = partOf(event, i);
    cells.push(
      <Reveal key={i} trigger={event.id} index={i}>
        <span
          data-part={part}
          className={cn(
            'rounded-cell flex flex-col items-center px-0.5 py-0.5 font-mono text-xs tabular-nums',
            PART_CELL[part],
          )}
        >
          {formatByte(byte, format)}
          <span className="text-fg-muted text-[0.6rem] leading-tight">
            {captionOf(part, byte)}
          </span>
        </span>
      </Reveal>,
    );
  });

  const counts: [Part, number][] = [
    ['msg', event.message.length],
    ['one', 1],
    ['zero', event.zeros],
    ['len', 8],
  ];

  return (
    <div className="flex flex-col gap-3">
      <Label>
        Padded message: {event.padded.length} bytes, {blocks} block
        {blocks === 1 ? '' : 's'} of 64
      </Label>
      <p className="sr-only">
        Padded message in hex: {bytesToHex(Uint8Array.from(event.padded))}
      </p>
      <div aria-hidden="true" className="w-full max-w-3xl">
        <div
          style={{ '--stagger': `${stagger}ms` } as CSSProperties}
          className={cn(
            'grid gap-1',
            format === 'hex'
              ? 'grid-cols-8 sm:grid-cols-16'
              : 'grid-cols-4 sm:grid-cols-8',
          )}
        >
          {cells}
        </div>
      </div>
      <ul
        aria-label="The parts of the padded message"
        className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
      >
        {counts.map(([part, count]) => (
          <li key={part} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('rounded-cell inline-block size-4', PART_CELL[part])}
            />
            {part === 'one'
              ? PART_NAME.one[0]
              : `${count} ${PART_NAME[part][count === 1 ? 0 : 1]}`}
            {part === 'len' ? `: ${event.bitLength} bits` : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
