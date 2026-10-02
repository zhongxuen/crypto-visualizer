'use client';

import { useId } from 'react';

import { ByteGrid, type ByteFormat } from '@/components/blocks';
import { Reveal } from '@/components/motion';
import type { XorCharEvent, XorEvent, XorMessageEvent } from '@/core/xor/events';
import { cn } from '@/lib/cn';

import { ByteTape, type TapeSegment } from './ByteTape';

/**
 * The first chapter's steps, in the route's first-load JS: a character becoming bytes
 * on the tape, and a whole message as a tape. The other chapters' views load after
 * hydration (`XorEventView`, through `../runs.ts`).
 */

function range(from: number, length: number): number[] {
  return Array.from({ length }, (_, i) => from + i);
}

function isChar(event: XorEvent): event is XorCharEvent {
  return event.kind === 'xor.char';
}

/** One tape segment per character core encoded, so a character sits over its bytes. */
export function charSegments(chars: readonly XorCharEvent[]): TapeSegment[] {
  return chars.map((c) => ({
    char: c.char === ' ' ? '·' : c.char,
    start: c.offset,
    length: c.bytes.length,
  }));
}

export function BytesView({
  event,
  format,
  events,
  index,
}: {
  event: XorCharEvent | XorMessageEvent;
  format: ByteFormat;
  events: readonly XorEvent[];
  index: number;
}) {
  if (event.kind === 'xor.char') {
    return <CharStep event={event} format={format} events={events} index={index} />;
  }
  const chars = events.filter(isChar);
  return (
    <div className="flex flex-col gap-4">
      <Reveal trigger={event.id}>
        <p className="font-mono text-xl">“{event.text}”</p>
      </Reveal>
      <ByteTape
        name={event.name}
        label={event.name}
        bytes={event.bytes}
        format={format}
        segments={chars.length > 0 ? charSegments(chars) : undefined}
      />
    </div>
  );
}

/**
 * Text to bytes: the character on this step lifts out of the text, and its UTF-8 bytes
 * fly down onto the tape (the 🔐 visibly splits into four).
 */
function CharStep({
  event,
  format,
  events,
  index,
}: {
  event: XorCharEvent;
  format: ByteFormat;
  events: readonly XorEvent[];
  index: number;
}) {
  const id = useId();
  const charId = `${id}-char`;
  const all = events.filter(isChar);
  const done = events.slice(0, index + 1).filter(isChar);
  const total =
    all.length > 0 ? all[all.length - 1].encoded.length : event.encoded.length;
  const hex = `U+${event.codePoint.toString(16).toUpperCase().padStart(4, '0')}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
          The text
        </span>
        <p className="flex flex-wrap items-end gap-1 pt-2 font-mono text-3xl">
          {all.map((c) => {
            const current = c.offset === event.offset;
            const encoded = c.offset < event.offset;
            return (
              <span
                key={c.offset}
                aria-hidden="true"
                id={current ? charId : undefined}
                data-current={current || undefined}
                className={cn(
                  'rounded-cell inline-block min-w-8 px-1 text-center transition-transform duration-(--dur-step) ease-(--ease-out)',
                  current && 'highlighter -translate-y-2',
                  !current && (encoded ? 'text-fg' : 'text-fg-muted'),
                )}
              >
                {c.char === ' ' ? '·' : c.char}
              </span>
            );
          })}
          <span className="sr-only">
            “{all.map((c) => c.char).join('')}”: encoding “{event.char}”, character{' '}
            {done.length} of {all.length}.
          </span>
        </p>
      </div>

      <Reveal trigger={event.id}>
        <p className="text-fg-secondary font-mono text-sm">
          “{event.char}” is code point {hex} → {event.bytes.length} byte
          {event.bytes.length === 1 ? '' : 's'}
        </p>
      </Reveal>

      <div className="flex flex-col gap-1">
        <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
          This character in binary
        </span>
        <ByteGrid label="This character’s bytes" bytes={event.bytes} format="binary" />
      </div>

      <ByteTape
        name="Encoded so far"
        label="Encoded so far"
        bytes={event.encoded}
        format={format}
        segments={charSegments(done)}
        total={total}
        highlight={range(event.offset, event.bytes.length)}
        arrive={{
          from: charId,
          indices: range(event.offset, event.bytes.length),
          trigger: event.id,
        }}
      />
    </div>
  );
}
