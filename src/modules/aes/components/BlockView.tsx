'use client';

import { ArrowLeft } from 'lucide-react';
import { memo, useId, useState, type ReactNode } from 'react';

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

import styles from './aes.module.css';
import { useStepPlay } from './motion';
import { hex, hex2, Label, Op, ResultBox, ROW_LABELS } from './parts';
import { RotatedRow } from './Rotate';
import { SboxTable } from './SboxTable';

const cellName = (index: number) => `row ${index % 4}, column ${index >> 2}`;

/**
 * One sub-step of AES-128 on the 4×4 state (FIPS 197 §5.1). Each sub-step's view is
 * keyed by its event, so a forward step plays its operation from the start
 * (UIUX §7.2): SubBytes flips each byte in as the S-box looks it up, ShiftRows slides
 * the rows, MixColumns works column by column, AddRoundKey drops the round key on.
 */
export const BlockView = memo(function BlockView({
  event,
  format,
}: {
  event: AesEvent;
  format: ByteFormat;
}) {
  return (
    <Step key={event.id}>
      <SubStep event={event} format={format} />
    </Step>
  );
});

/** A step back or a seek lands on the end frame with a short crossfade. */
function Step({ children }: { children: ReactNode }) {
  const { fade } = useStepPlay();
  return (
    <div className={cn('flex flex-col gap-4', fade && 'motion-fade')}>{children}</div>
  );
}

function SubStep({ event, format }: { event: AesEvent; format: ByteFormat }) {
  switch (event.kind) {
    case 'aes.input':
      return (
        <>
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
        </>
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
        <>
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
        </>
      );
    default:
      return null;
  }
}

/**
 * The state before and after a sub-step, stacked, with the sub-step's working (the
 * S-box, the MixColumns matrix) in the space beside them. `animate` is the class that
 * plays the operation on the "after" grid.
 */
function Beside({
  before,
  after,
  format,
  highlight,
  changed,
  animate,
  op,
  children,
}: {
  before: number[];
  after: number[];
  format: ByteFormat;
  highlight?: number[];
  changed?: number[];
  animate?: string;
  op: string;
  children: ReactNode;
}) {
  return (
    <div className="grid items-start gap-x-6 gap-y-4 xl:grid-cols-[auto_minmax(0,1fr)]">
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
        <p className="text-fg-muted pl-20 text-xs">
          <span aria-hidden="true" className="mr-1 font-mono text-base">
            ↓
          </span>
          {op}
        </p>
        <Label>After</Label>
        <ByteGrid
          label="State after"
          bytes={after}
          format={format}
          columnMajor
          rowLabels={ROW_LABELS}
          highlight={highlight}
          changed={changed}
          className={cn(styles.cells, animate)}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
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
  const { play } = useStepPlay();
  const [selected, setSelected] = useState(0);
  const input = event.before[selected];
  const parts = sboxParts(input);
  return (
    <Beside
      before={event.before}
      after={event.after}
      format={format}
      highlight={[selected]}
      changed={event.changed}
      animate={play ? styles.flipIn : undefined}
      op="each byte through the S-box"
    >
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-byte`}>
        Byte to look up
        <select
          id={`${id}-byte`}
          className="border-border bg-surface focus-visible:outline-focus min-h-target w-fit rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2 md:min-h-0"
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
      <SboxTable lookup={input} used={event.before} play={play} />
      <p className="font-mono text-sm">
        S(0x{hex2(input)}): inverse in GF(2⁸) = 0x{hex2(parts.inverse)}, then the affine
        map gives 0x{hex2(parts.output)}.
      </p>
      <p className="text-fg-muted text-sm">
        The ringed entry is this byte&apos;s lookup, where its row and column cross; the
        underlined entries are the other bytes of the state.
      </p>
    </Beside>
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
  const cell = (byte: number, mark: boolean) => (
    <span
      className={cn(
        'rounded px-1 py-0.5 text-center font-mono text-sm tabular-nums',
        format === 'hex' ? 'min-w-8' : 'min-w-[5.5rem]',
        mark
          ? 'border-diff-on pattern-changed border-2'
          : 'border-border bg-surface border',
      )}
    >
      {formatByte(byte, format)}
    </span>
  );
  return (
    <>
      <ol aria-label="ShiftRows, row by row" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((r) => (
          <li key={r} className="flex flex-wrap items-center gap-2">
            <span className="text-fg-muted w-12 text-xs">row {r}</span>
            <span className="flex gap-1">
              {[0, 1, 2, 3].map((c) => (
                <span key={c} className="inline-flex">
                  {cell(event.before[r + 4 * c], false)}
                </span>
              ))}
            </span>
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
            <RotatedRow
              length={4}
              shift={r}
              cell={(from) =>
                cell(
                  event.before[r + 4 * from],
                  changed.has(r + 4 * ((from + 4 - r) % 4)),
                )
              }
            />
          </li>
        ))}
      </ol>
      <p className="text-fg-muted text-sm">
        Each row rotates left by its row number; bytes that fall off the left end come
        back on the right. Moved bytes are outlined and hatched.
      </p>
    </>
  );
}

function MixColumnsView({
  event,
  format,
}: {
  event: AesMixColumnsEvent;
  format: ByteFormat;
}) {
  const { play } = useStepPlay();
  const [column, setColumn] = useState(0);
  const cells = [0, 1, 2, 3].map((r) => r + 4 * column);
  return (
    <Beside
      before={event.before}
      after={event.after}
      format={format}
      highlight={cells}
      changed={event.changed}
      animate={play ? styles.byColumn : undefined}
      op="each column times a fixed matrix"
    >
      <div role="group" aria-label="Column to show" className="flex flex-wrap gap-1.5">
        {[0, 1, 2, 3].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={c === column}
            onClick={() => setColumn(c)}
            className={cn(
              'focus-visible:outline-focus min-h-target rounded-md border px-2.5 py-1 text-sm focus-visible:outline-2 md:min-h-0',
              c === column
                ? 'border-accent bg-accent text-accent-fg font-medium'
                : 'border-border bg-surface text-fg-secondary hover:text-fg',
            )}
          >
            Column {c}
          </button>
        ))}
      </div>
      <Matrix event={event} cells={cells} column={column} />
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
    </Beside>
  );
}

/**
 * The fixed matrix times the chosen column, as FIPS 197 §5.1.3 writes it. The
 * coefficients and bytes are the ones core used (`event.terms`).
 */
function Matrix({
  event,
  cells,
  column,
}: {
  event: AesMixColumnsEvent;
  cells: number[];
  column: number;
}) {
  const bracket = 'border-fg-secondary rounded-sm border-x-2 px-1.5';
  const coefficients = cells.map((index) => event.terms[index].map((t) => t.coefficient));
  const inputs = event.terms[cells[0]].map((t) => t.input);
  const outputs = cells.map((index) => event.after[index]);
  return (
    <figure className="flex flex-col gap-1">
      <figcaption>
        <Label>The matrix times column {column}</Label>
      </figcaption>
      <div
        aria-hidden="true"
        className="flex items-center gap-2 font-mono text-sm tabular-nums"
      >
        <span className={cn('grid grid-cols-4 gap-x-2', bracket)}>
          {coefficients.flatMap((row, r) =>
            row.map((c, k) => <span key={`${r}-${k}`}>{hex2(c)}</span>),
          )}
        </span>
        <span className="text-fg-muted">•</span>
        <span className={cn('grid', bracket)}>
          {inputs.map((b, k) => (
            <span key={k}>{hex2(b)}</span>
          ))}
        </span>
        <span className="text-fg-muted">=</span>
        <span className={cn('grid font-semibold', bracket)}>
          {outputs.map((b, k) => (
            <span key={k}>{hex2(b)}</span>
          ))}
        </span>
      </div>
      <p className="sr-only">
        Matrix rows {coefficients.map((row) => row.map(hex2).join(' ')).join('; ')}, times
        column {column} ({inputs.map(hex2).join(' ')}), give {outputs.map(hex2).join(' ')}
        .
      </p>
    </figure>
  );
}

function AddRoundKeyView({
  event,
  format,
}: {
  event: AesAddRoundKeyEvent;
  format: ByteFormat;
}) {
  const { play } = useStepPlay();
  return (
    <>
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
        <div className={cn('flex flex-col gap-2', play && styles.drop)}>
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
            className={cn(styles.cells, play && styles.pulseChanged)}
          />
        </div>
      </div>
      <p className="text-fg-muted text-sm">
        Round key {event.round} is words w{4 * event.round} to w{4 * event.round + 3} of
        the key schedule, one word per column.
      </p>
    </>
  );
}
