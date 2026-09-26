'use client';

import { BitDiffStrip, ByteGrid, type ByteFormat } from '@/components/blocks';
import type { XorEvent } from '@/core/xor/events';
import { cn } from '@/lib/cn';

/** A printable ASCII byte as its character, for the caption under a cell. */
export function asciiCaption(bytes: readonly number[]) {
  return (index: number) => {
    const byte = bytes[index];
    if (byte === 0x20) return '·';
    return byte > 0x20 && byte < 0x7f ? String.fromCharCode(byte) : undefined;
  };
}

function range(from: number, length: number): number[] {
  return Array.from({ length }, (_, i) => from + i);
}

function Rows({
  rows,
  format,
  highlight,
}: {
  rows: { name: string; bytes: readonly number[] }[];
  format: ByteFormat;
  highlight?: number[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.name} className="flex flex-col gap-1">
          <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
            {row.name}
          </span>
          <ByteGrid
            label={row.name}
            bytes={row.bytes}
            format={format}
            highlight={highlight}
            caption={asciiCaption(row.bytes)}
            columns={format === 'hex' ? 16 : 8}
          />
        </div>
      ))}
    </div>
  );
}

export function XorEventView({ event, format }: { event: XorEvent; format: ByteFormat }) {
  switch (event.kind) {
    case 'xor.char':
      return (
        <div className="flex flex-col gap-4">
          <p className="flex flex-wrap items-baseline gap-3">
            <span className="border-accent bg-highlight rounded-md border-2 px-3 py-1 font-mono text-2xl">
              {event.char}
            </span>
            <span className="text-fg-secondary font-mono text-sm">
              U+{event.codePoint.toString(16).toUpperCase().padStart(4, '0')} →{' '}
              {event.bytes.length} byte{event.bytes.length === 1 ? '' : 's'}
            </span>
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
              This character in binary
            </span>
            <ByteGrid
              label="This character’s bytes"
              bytes={event.bytes}
              format="binary"
            />
          </div>
          <Rows
            rows={[{ name: 'Encoded so far', bytes: event.encoded }]}
            format={format}
            highlight={range(event.offset, event.bytes.length)}
          />
        </div>
      );

    case 'xor.message':
      return (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-lg">“{event.text}”</p>
          <Rows rows={[{ name: event.name, bytes: event.bytes }]} format={format} />
        </div>
      );

    case 'xor.key':
      return (
        <div className="flex flex-col gap-3">
          <Rows rows={[{ name: event.name, bytes: event.key }]} format={format} />
          <p className="text-fg-muted text-sm">
            Drawn from the seeded generator (seed {event.seed}). Not cryptographic: for
            display only.
          </p>
        </div>
      );

    case 'xor.byte':
      return (
        <div className="flex flex-col gap-4">
          <Rows
            rows={[
              { name: event.names[0], bytes: event.aBytes },
              { name: event.names[1], bytes: event.bBytes },
              { name: event.names[2], bytes: event.outBytes },
            ]}
            format={format}
            highlight={[event.index]}
          />
          <BitColumns a={event.a} b={event.b} names={event.names} />
          <BitDiffStrip
            label={`Bits of this byte that ${event.names[1]} flipped`}
            a={[event.a]}
            b={[event.out]}
            showDigits
          />
        </div>
      );

    case 'xor.result':
      return (
        <div className="flex flex-col gap-4">
          <Rows
            rows={[
              { name: event.names[0], bytes: event.a },
              { name: event.names[1], bytes: event.b },
              { name: event.names[2], bytes: event.out },
            ]}
            format={format}
          />
          {event.text !== undefined ? (
            <p>
              <span className="text-fg-muted text-sm">{event.names[2]} as text: </span>
              <span className="font-mono text-lg">“{event.text}”</span>
            </p>
          ) : null}
          <BitDiffStrip
            label={`${event.names[0]} → ${event.names[2]}`}
            a={event.a}
            b={event.out}
            perRow={64}
          />
        </div>
      );

    case 'xor.crib':
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
              p1 ⊕ p2, with the crib at byte {event.offset}
            </span>
            <ByteGrid
              label="p1 ⊕ p2"
              bytes={event.xored}
              format={format}
              highlight={range(event.offset, event.cribBytes.length)}
            />
          </div>
          <Rows
            rows={[{ name: `crib “${event.crib}”`, bytes: event.cribBytes }]}
            format={format}
          />
          <p
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2',
              event.readable ? 'border-ok' : 'border-border',
            )}
          >
            <span className="text-fg-muted text-sm">Revealed:</span>
            <span className="font-mono text-lg whitespace-pre">
              “{event.revealedText}”
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                event.readable ? 'text-ok' : 'text-fg-muted',
              )}
            >
              {event.readable ? '✓ reads as text' : '✗ gibberish'}
            </span>
          </p>
        </div>
      );
  }
}

/** The eight bit columns of one byte: a, b, a ⊕ b. */
function BitColumns({
  a,
  b,
  names,
}: {
  a: number;
  b: number;
  names: [string, string, string];
}) {
  const bits = (x: number) => x.toString(2).padStart(8, '0').split('');
  const rows: [string, string[]][] = [
    [names[0], bits(a)],
    [names[1], bits(b)],
    [names[2], bits(a ^ b)],
  ];
  return (
    <table className="w-fit border-collapse font-mono text-sm">
      <caption className="text-fg-muted mb-1 text-left text-xs">
        One byte, bit by bit
      </caption>
      <tbody>
        {rows.map(([name, row], r) => (
          <tr key={name} className={cn(r === 2 && 'border-border-strong border-t-2')}>
            <th scope="row" className="text-fg-muted pr-3 text-right text-xs font-normal">
              {r === 1 ? '⊕ ' : r === 2 ? '= ' : ''}
              {name}
            </th>
            {row.map((bit, i) => (
              <td
                key={i}
                className={cn(
                  'px-1.5 text-center',
                  r === 2 && bit === '1' && 'text-diff-on font-bold',
                )}
              >
                {bit}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
