'use client';

import { ArrowLeft } from 'lucide-react';
import { memo, useId, useState } from 'react';

import { ByteGrid, formatByte, type ByteFormat } from '@/components/blocks';
import type {
  AesAddRoundKeyEvent,
  AesEvent,
  AesMixColumnsEvent,
  AesShiftRowsEvent,
  AesSubBytesEvent,
} from '@/core/aes/events';
import { sboxParts } from '@/core/aes/sbox';
import { cn } from '@/lib/cn';

import { hex, hex2, Label, Op, ResultBox, ROW_LABELS } from './parts';
import { SboxTable } from './SboxTable';

const cellName = (index: number) => `row ${index % 4}, column ${index >> 2}`;

/** One sub-step of AES-128 on the 4×4 state (FIPS 197 §5.1). */
export const BlockView = memo(function BlockView({
  event,
  format,
}: {
  event: AesEvent;
  format: ByteFormat;
}) {
  switch (event.kind) {
    case 'aes.input':
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>The state, filled column by column</Label>
            <ByteGrid
              label="State"
              bytes={event.state}
              format={format}
              columnMajor
              rowLabels={ROW_LABELS}
              caption={(i) => `in${i}`}
            />
          </div>
          <dl className="grid gap-1 font-mono text-sm">
            <div className="flex flex-wrap gap-2">
              <dt className="text-fg-muted">plaintext</dt>
              <dd className="break-all">{hex(event.plaintext)}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-fg-muted">key</dt>
              <dd className="break-all">{hex(event.key)}</dd>
            </div>
          </dl>
        </div>
      );
    case 'aes.subBytes':
      return <SubBytesView event={event} format={format} />;
    case 'aes.shiftRows':
      return <ShiftRowsView event={event} format={format} />;
    case 'aes.mixColumns':
      return <MixColumnsView event={event} format={format} />;
    case 'aes.addRoundKey':
      return <AddRoundKeyView event={event} format={format} />;
    case 'aes.output':
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Final state</Label>
            <ByteGrid
              label="Final state"
              bytes={event.state}
              format={format}
              columnMajor
              rowLabels={ROW_LABELS}
            />
          </div>
          <div data-testid="aes-ciphertext">
            <ResultBox label="Ciphertext" value={hex(event.ciphertext)} />
          </div>
        </div>
      );
    default:
      return null;
  }
});

function BeforeAfter({
  before,
  after,
  format,
  highlight,
  changed,
}: {
  before: number[];
  after: number[];
  format: ByteFormat;
  highlight?: number[];
  changed?: number[];
}) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex flex-col gap-2">
        <Label>Before</Label>
        <ByteGrid
          label="State before"
          bytes={before}
          format={format}
          columnMajor
          rowLabels={ROW_LABELS}
          highlight={highlight}
        />
      </div>
      <Op>→</Op>
      <div className="flex flex-col gap-2">
        <Label>After</Label>
        <ByteGrid
          label="State after"
          bytes={after}
          format={format}
          columnMajor
          highlight={highlight}
          changed={changed}
        />
      </div>
    </div>
  );
}

function SubBytesView({
  event,
  format,
}: {
  event: AesSubBytesEvent;
  format: ByteFormat;
}) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const input = event.before[selected];
  const parts = sboxParts(input);
  return (
    <div className="flex flex-col gap-4">
      <BeforeAfter
        before={event.before}
        after={event.after}
        format={format}
        highlight={[selected]}
        changed={event.changed}
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-byte`}>
          Byte to look up
          <select
            id={`${id}-byte`}
            className="border-border bg-surface focus-visible:outline-focus rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2"
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            {event.before.map((byte, i) => (
              <option key={i} value={i}>
                {cellName(i)}: {hex2(byte)}
              </option>
            ))}
          </select>
        </label>
        <p className="font-mono text-sm">
          S(0x{hex2(input)}): inverse in GF(2⁸) = 0x{hex2(parts.inverse)}, then the affine
          map gives 0x{hex2(parts.output)}.
        </p>
      </div>
      <SboxTable lookup={input} used={event.before} />
      <p className="text-fg-muted text-sm">
        The ringed cell is this byte&apos;s lookup; the underlined values are the other
        bytes of the state being substituted in this step.
      </p>
    </div>
  );
}

function ShiftRowsView({
  event,
  format,
}: {
  event: AesShiftRowsEvent;
  format: ByteFormat;
}) {
  const changed = new Set(event.changed);
  const row = (bytes: number[], r: number, mark: boolean) =>
    [0, 1, 2, 3].map((c) => {
      const index = r + 4 * c;
      return (
        <span
          key={c}
          className={cn(
            'rounded border px-1 py-0.5 text-center font-mono text-sm tabular-nums',
            format === 'hex' ? 'min-w-8' : 'min-w-[5.5rem]',
            mark && changed.has(index)
              ? 'border-diff-on pattern-changed border-2'
              : 'border-border bg-surface',
          )}
        >
          {formatByte(bytes[index], format)}
        </span>
      );
    });
  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="ShiftRows, row by row" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((r) => (
          <li key={r} className="flex flex-wrap items-center gap-2">
            <span className="text-fg-muted w-12 text-xs">row {r}</span>
            <span className="flex gap-1">{row(event.before, r, false)}</span>
            <span className="text-fg-secondary flex w-28 items-center justify-center gap-0.5 text-xs">
              {r === 0 ? (
                'stays'
              ) : (
                <>
                  {Array.from({ length: r }, (_, i) => (
                    <ArrowLeft key={i} aria-hidden="true" className="size-3.5" />
                  ))}
                  {r} left
                </>
              )}
            </span>
            <span className="flex gap-1">{row(event.after, r, true)}</span>
          </li>
        ))}
      </ol>
      <p className="text-fg-muted text-sm">
        Each row rotates left by its row number; bytes that fall off the left end come
        back on the right. Moved bytes are outlined and hatched.
      </p>
    </div>
  );
}

function MixColumnsView({
  event,
  format,
}: {
  event: AesMixColumnsEvent;
  format: ByteFormat;
}) {
  const [column, setColumn] = useState(0);
  const cells = [0, 1, 2, 3].map((r) => r + 4 * column);
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Column to show" className="flex flex-wrap gap-1.5">
        {[0, 1, 2, 3].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={c === column}
            onClick={() => setColumn(c)}
            className={cn(
              'focus-visible:outline-focus rounded-md border px-2.5 py-1 text-sm focus-visible:outline-2',
              c === column
                ? 'border-accent bg-accent text-accent-fg font-medium'
                : 'border-border bg-surface text-fg-secondary hover:text-fg',
            )}
          >
            Column {c}
          </button>
        ))}
      </div>
      <BeforeAfter
        before={event.before}
        after={event.after}
        format={format}
        highlight={cells}
        changed={event.changed}
      />
      <div className="flex flex-col gap-1">
        <Label>Column {column}, multiplied in GF(2⁸)</Label>
        <div
          className="max-w-full overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={`Column ${column} products`}
        >
          <table className="w-fit font-mono text-sm tabular-nums">
            <caption className="sr-only">
              Each output byte of column {column} as four products XORed together
            </caption>
            <tbody>
              {cells.map((index, r) => {
                const terms = event.terms[index];
                return (
                  <tr key={index}>
                    <th scope="row" className="text-fg-muted pr-3 text-left font-normal">
                      row {r}
                    </th>
                    <td className="pr-3 whitespace-nowrap">
                      {terms
                        .map((t) => `${hex2(t.coefficient)}•${hex2(t.input)}`)
                        .join(' ⊕ ')}
                    </td>
                    <td className="text-fg-secondary pr-3 whitespace-nowrap">
                      = {terms.map((t) => hex2(t.product)).join(' ⊕ ')}
                    </td>
                    <td className="font-semibold whitespace-nowrap">
                      = {hex2(event.after[index])}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-fg-muted text-sm">
          • is multiplication in GF(2⁸): by 02 is a shift left, then XOR 0x1b if a bit
          falls off the top; by 03 is that plus the byte itself. ⊕ is XOR, which is
          addition in this field.
        </p>
      </div>
    </div>
  );
}

function AddRoundKeyView({
  event,
  format,
}: {
  event: AesAddRoundKeyEvent;
  format: ByteFormat;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col gap-2">
          <Label>State</Label>
          <ByteGrid
            label="State before"
            bytes={event.before}
            format={format}
            columnMajor
            rowLabels={ROW_LABELS}
          />
        </div>
        <Op>⊕</Op>
        <div className="flex flex-col gap-2">
          <Label>Round key {event.round}</Label>
          <ByteGrid
            label={`Round key ${event.round}`}
            bytes={event.roundKey}
            format={format}
            columnMajor
          />
        </div>
        <Op>=</Op>
        <div className="flex flex-col gap-2">
          <Label>After</Label>
          <ByteGrid
            label="State after"
            bytes={event.after}
            format={format}
            columnMajor
            changed={event.changed}
          />
        </div>
      </div>
      <p className="text-fg-muted text-sm">
        Round key {event.round} is words w{4 * event.round} to w{4 * event.round + 3} of
        the key schedule, one word per column.
      </p>
    </div>
  );
}
