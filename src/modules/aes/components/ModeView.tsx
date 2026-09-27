'use client';

import { ArrowDown, ArrowLeft } from 'lucide-react';
import { memo, type ReactNode } from 'react';

import { ByteGrid, type ByteFormat } from '@/components/blocks';
import type {
  AesEvent,
  AesMode,
  AesModeBlockEvent,
  AesModeResultEvent,
  AesPadEvent,
} from '@/core/aes/events';
import { cn } from '@/lib/cn';

import { hex, Label } from './parts';

const spaced = (bytes: ArrayLike<number>) => hex(bytes).replace(/(.{8})(?!$)/g, '$1 ');
const printable = (bytes: readonly number[]) =>
  bytes.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·')).join('');

export const MODE_NAMES: Record<AesMode, string> = {
  ecb: 'ECB',
  cbc: 'CBC',
  ctr: 'CTR',
};

/** A box in a mode diagram: a name and a 16-byte value. */
function Box({
  name,
  value,
  tone = 'plain',
}: {
  name: string;
  value?: string;
  tone?: 'plain' | 'cipher' | 'result';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center rounded-md border px-3 py-1.5 text-center',
        tone === 'cipher' && 'border-accent bg-surface-overlay border-2 font-semibold',
        tone === 'result' && 'border-accent bg-surface border-2',
        tone === 'plain' && 'border-border bg-surface',
      )}
    >
      <span className="text-fg-muted text-xs">{name}</span>
      {value !== undefined ? (
        <span className="font-mono text-xs break-all">{value}</span>
      ) : null}
    </div>
  );
}

function Down() {
  return <ArrowDown aria-hidden="true" className="text-fg-muted size-4 self-center" />;
}

/** A side input joining the flow at an XOR. */
function Xor({ side }: { side: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        aria-hidden="true"
        className="border-fg-secondary flex size-7 items-center justify-center rounded-full border-2 font-mono"
      >
        ⊕
      </span>
      <span className="sr-only">XOR with</span>
      <ArrowLeft aria-hidden="true" className="text-fg-muted size-4" />
      {side}
    </div>
  );
}

/** The diagram for one block, with this block's real values (SP 800-38A §6). */
function BlockDiagram({ event }: { event: AesModeBlockEvent }) {
  const n = event.block + 1;
  const cipher = <Box name="AES with key K" tone="cipher" />;
  const ciphertext = (
    <Box name={`C${n} (ciphertext)`} value={spaced(event.ciphertext)} tone="result" />
  );
  let steps: ReactNode[];
  if (event.mode === 'ecb') {
    steps = [
      <Box key="p" name={`P${n} (plaintext)`} value={spaced(event.plaintext)} />,
      cipher,
      ciphertext,
    ];
  } else if (event.mode === 'cbc') {
    steps = [
      <Box key="p" name={`P${n} (plaintext)`} value={spaced(event.plaintext)} />,
      <Xor
        key="x"
        side={
          <Box name={n === 1 ? 'IV' : `C${n - 1}`} value={spaced(event.chain ?? [])} />
        }
      />,
      <Box key="in" name="into AES" value={spaced(event.cipherInput)} />,
      cipher,
      ciphertext,
    ];
  } else {
    steps = [
      <Box key="t" name={`T${n} (counter block)`} value={spaced(event.counter ?? [])} />,
      cipher,
      <Box key="ks" name="keystream" value={spaced(event.cipherOutput)} />,
      <Xor
        key="x"
        side={<Box name={`P${n} (plaintext)`} value={spaced(event.plaintext)} />}
      />,
      ciphertext,
    ];
  }
  return (
    <figure className="flex flex-col gap-1">
      <figcaption>
        <Label>
          {MODE_NAMES[event.mode]}, block {n} of {event.blocks}
        </Label>
      </figcaption>
      <ol className="flex w-full max-w-md flex-col items-stretch gap-1">
        {steps.map((step, i) => (
          <li key={i} className="flex flex-col items-stretch gap-1">
            {i > 0 ? <Down /> : null}
            {step}
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** Every block so far: plaintext above, ciphertext below, ECB repeats marked. */
function Chain({ blocks, upTo }: { blocks: readonly AesModeBlockEvent[]; upTo: number }) {
  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <Label>The chain so far</Label>
      <ol aria-label="Blocks" className="flex flex-wrap gap-2">
        {blocks.map((b) => {
          const done = b.block <= upTo;
          const repeat = done && b.repeatOf !== undefined;
          return (
            <li
              key={b.id}
              aria-current={b.block === upTo ? 'step' : undefined}
              className={cn(
                'flex w-36 flex-col gap-0.5 rounded-md border px-2 py-1 font-mono text-xs',
                b.block === upTo ? 'ring-accent ring-2' : '',
                repeat
                  ? 'border-diff-on pattern-changed border-2'
                  : 'border-border bg-surface',
              )}
            >
              <span className="text-fg-muted font-sans">Block {b.block + 1}</span>
              <span className="break-all whitespace-pre-wrap">
                <span className="sr-only">plaintext </span>
                {printable(b.plaintext)}
              </span>
              <span className="break-all">
                <span className="sr-only">ciphertext </span>
                {done ? hex(b.ciphertext).slice(0, 16) + '…' : 'not yet'}
              </span>
              {repeat ? (
                <span className="font-sans font-semibold">
                  same as block {b.repeatOf! + 1}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PadView({ event, format }: { event: AesPadEvent; format: ByteFormat }) {
  const start = event.message.length;
  return (
    <div className="flex flex-col gap-2">
      <Label>
        Message, {event.message.length} bytes, padded to {event.padded.length}
      </Label>
      <ByteGrid
        label="Padded message"
        bytes={event.padded}
        format={format}
        columns={format === 'hex' ? 16 : 8}
        highlight={Array.from({ length: event.padLength }, (_, i) => start + i)}
        caption={(i) =>
          i < start ? printable([event.padded[i]]) : i === start ? 'pad' : undefined
        }
      />
      <p className="text-fg-muted text-sm">
        Highlighted: the {event.padLength} padding bytes, each of value {event.padLength}.
      </p>
    </div>
  );
}

function ResultView({
  event,
  blocks,
  format,
}: {
  event: AesModeResultEvent;
  blocks: readonly AesModeBlockEvent[];
  format: ByteFormat;
}) {
  const repeats = blocks.flatMap((b) =>
    b.repeatOf === undefined
      ? []
      : Array.from({ length: 16 }, (_, i) => 16 * b.block + i),
  );
  return (
    <div className="flex flex-col gap-3">
      <ByteGrid
        label="Ciphertext"
        bytes={event.ciphertext}
        format={format}
        columns={format === 'hex' ? 16 : 8}
        changed={repeats}
      />
      <p className="text-fg-muted text-sm">
        {event.distinctBlocks} distinct block{event.distinctBlocks === 1 ? '' : 's'} out
        of {event.blocks}.
        {repeats.length > 0
          ? ' Hatched: blocks that repeat an earlier one, visible to anyone without the key.'
          : ''}
      </p>
      <Chain blocks={blocks} upTo={blocks.length - 1} />
    </div>
  );
}

/** A mode run's step: padding, the IV or counter, one block, or the whole ciphertext. */
export const ModeView = memo(function ModeView({
  event,
  blocks,
  format,
}: {
  event: AesEvent;
  blocks: readonly AesModeBlockEvent[];
  format: ByteFormat;
}) {
  switch (event.kind) {
    case 'aes.pad':
      return <PadView event={event} format={format} />;
    case 'aes.modeSetup':
      return (
        <div className="flex flex-col gap-3">
          {event.iv ? (
            <Box
              name={event.mode === 'cbc' ? 'IV' : 'Initial counter block T1'}
              value={spaced(event.iv)}
            />
          ) : null}
          <p className="text-fg-muted text-sm">
            The IV and nonce come from the page&apos;s seeded generator, which is not
            random enough for real use. A real IV comes from a cryptographic random
            source.
          </p>
          <Chain blocks={blocks} upTo={-1} />
        </div>
      );
    case 'aes.modeBlock':
      return (
        <div className="flex flex-col gap-4">
          <BlockDiagram event={event} />
          <Chain blocks={blocks} upTo={event.block} />
        </div>
      );
    case 'aes.modeResult':
      return <ResultView event={event} blocks={blocks} format={format} />;
    default:
      return null;
  }
});
