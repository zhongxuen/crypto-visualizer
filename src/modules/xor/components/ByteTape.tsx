'use client';

import type { ReactNode } from 'react';

import { formatByte, type ByteFormat } from '@/components/blocks';
import { Travel, useStepTransition } from '@/components/motion';
import { cn } from '@/lib/cn';

/**
 * The byte tape (UIUX §2.2 module 1): a row of bytes with the character each one encodes
 * written above it. A character that takes several bytes (é, 🔐) sits over all of them,
 * bracketed, so the split is the picture. Cells that aren't filled yet are dashed
 * placeholders, so the tape's final length is visible from the first step.
 *
 * `arrive` names bytes that just landed on the tape and where they came from: they fly
 * in from that element (`<Travel>`) on a single forward step. The end frame is the
 * static tape, so a seek or reduced motion shows it at once.
 */

export interface TapeSegment {
  /** What is written above the bytes; empty for bytes that aren't text. */
  char: string;
  start: number;
  length: number;
}

/** A printable ASCII byte as its character (a space as `·`), else nothing. */
export function printable(byte: number): string {
  if (byte === 0x20) return '·';
  return byte > 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '';
}

/** One segment per byte, captioned with the byte's ASCII character when it has one. */
export function byteSegments(bytes: readonly number[], captions = true): TapeSegment[] {
  return bytes.map((byte, start) => ({
    char: captions ? printable(byte) : '',
    start,
    length: 1,
  }));
}

/** Rows that hold text, where a byte's character means something. */
const TEXT_ROWS = new Set(['message', 'plaintext', 'p1', 'p2', 'text']);

function hexList(bytes: readonly number[]): string {
  return bytes.map((byte) => `0x${formatByte(byte, 'hex')}`).join(' ');
}

export function ByteTape({
  name,
  label,
  bytes,
  format,
  segments,
  highlight = [],
  total = bytes.length,
  arrive,
  id,
  className,
}: {
  /** The visible row name. */
  name: ReactNode;
  /** The list's accessible name. */
  label: string;
  bytes: readonly number[];
  format: ByteFormat;
  segments?: readonly TapeSegment[];
  highlight?: readonly number[];
  /** The tape's full length: cells past `bytes.length` are drawn as placeholders. */
  total?: number;
  /** Bytes that just arrived, and the id of the element they fly in from. */
  arrive?: { from: string; indices: readonly number[]; trigger: string };
  id?: string;
  className?: string;
}) {
  const { direction } = useStepTransition();
  // Only text gets characters over its bytes: a key or a ciphertext byte that happens to
  // be printable would read as a meaningless letter.
  const parts = segments ?? byteSegments(bytes, TEXT_ROWS.has(label));
  const captioned = parts.some((segment) => segment.char !== '');
  const lit = new Set(highlight);
  const flying = direction === 'forward' && arrive ? new Set(arrive.indices) : null;
  const pending = Math.max(0, total - bytes.length);
  const wide = format === 'binary';

  const cell = (index: number) => {
    const byte = bytes[index];
    const box = (
      <span
        data-byte={index}
        data-highlighted={lit.has(index) || undefined}
        className={cn(
          'rounded-cell border-border inline-block border px-1 py-0.5 text-center font-mono text-sm tabular-nums',
          wide ? 'min-w-[5.5rem]' : 'min-w-8',
          lit.has(index) ? 'bg-highlight ring-accent ring-2' : 'bg-surface',
        )}
      >
        {formatByte(byte, format)}
      </span>
    );
    return flying?.has(index) && arrive ? (
      <Travel key={index} from={arrive.from} trigger={arrive.trigger}>
        {box}
      </Travel>
    ) : (
      <span key={index} className="inline-block">
        {box}
      </span>
    );
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
        {name}
      </span>
      <ol id={id} aria-label={label} className="flex flex-wrap gap-x-1.5 gap-y-2">
        {parts.map((segment) => {
          const own = bytes.slice(segment.start, segment.start + segment.length);
          const many = segment.length > 1;
          return (
            <li key={segment.start} className="flex flex-col items-stretch gap-0.5">
              {captioned ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-6 text-center font-mono text-base leading-6',
                    many && 'border-border-strong border-b',
                  )}
                >
                  {segment.char}
                </span>
              ) : null}
              <span aria-hidden="true" className="flex gap-0.5">
                {Array.from({ length: segment.length }, (_, i) =>
                  cell(segment.start + i),
                )}
              </span>
              <span className="sr-only">
                {segment.char ? `“${segment.char === '·' ? ' ' : segment.char}”: ` : ''}
                {format === 'hex'
                  ? hexList(own)
                  : own.map((byte) => formatByte(byte, 'binary')).join(' ')}
                {own.some((_, i) => lit.has(segment.start + i)) ? ' (this step)' : ''}
              </span>
            </li>
          );
        })}
        {Array.from({ length: pending }, (_, i) => (
          <li
            key={`pending-${i}`}
            aria-hidden="true"
            className="flex flex-col items-stretch gap-0.5"
          >
            {captioned ? <span className="h-6" /> : null}
            <span
              data-pending=""
              className={cn(
                'rounded-cell border-border-strong inline-block border border-dashed px-1 py-0.5 text-center font-mono text-sm',
                wide ? 'min-w-[5.5rem]' : 'min-w-8',
              )}
            >
              &nbsp;
            </span>
          </li>
        ))}
      </ol>
      {pending > 0 ? (
        <span className="sr-only">
          {pending} more byte{pending === 1 ? '' : 's'} to come.
        </span>
      ) : null}
    </div>
  );
}
