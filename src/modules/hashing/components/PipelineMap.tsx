'use client';

import { memo, useMemo } from 'react';

import { Reveal } from '@/components/motion/reveal';
import type { Sha256Event } from '@/core/sha256/events';
import { cn } from '@/lib/cn';

/**
 * The zoomed-out SHA-256 (UIUX §2.2, module 2): message → padded blocks → 64 words →
 * 64 rounds → digest, always on screen above the picture, with the stage this step is
 * in marked. Each stage is a button to its first step. During the rounds a slider moves
 * through all 64 of the current block: the run's phases go eight rounds at a time, and
 * the slider is how "Rounds 1–64" is one stop.
 *
 * Everything shown is read off the run's events; nothing is computed here.
 */

type Stage = 'pad' | 'words' | 'rounds' | 'digest';

function stageOf(event: Sha256Event): Stage {
  switch (event.kind) {
    case 'sha256.pad':
      return 'pad';
    case 'sha256.block':
    case 'sha256.schedule':
      return 'words';
    case 'sha256.round':
      return 'rounds';
    default:
      return 'digest';
  }
}

const NODE =
  'focus-visible:outline-focus flex min-h-target min-w-0 flex-1 flex-col items-center justify-center rounded-md border px-1 py-1 text-center text-xs leading-tight focus-visible:outline-2 md:min-h-12';
const NODE_STATE = {
  now: 'border-accent bg-highlight text-fg font-semibold',
  other: 'border-border bg-surface text-fg-secondary hover:bg-surface-overlay',
};

function Arrow() {
  return (
    <span aria-hidden="true" className="text-fg-muted shrink-0 self-center text-xs">
      →
    </span>
  );
}

function printable(bytes: readonly number[]): string {
  const text = bytes.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·'));
  return text.length > 8 ? `${text.slice(0, 7).join('')}…` : text.join('');
}

export const PipelineMap = memo(function PipelineMap({
  events,
  index,
  onSeek,
}: {
  events: readonly Sha256Event[];
  index: number;
  onSeek: (step: number) => void;
}) {
  const steps = useMemo(() => new Map(events.map((e, i) => [e.id, i])), [events]);
  const event = events[index];
  const pad = events[0];
  if (!event || !pad || pad.kind !== 'sha256.pad') return null;

  const stage = stageOf(event);
  const blocks = pad.padded.length / 64;
  const block = 'block' in event ? event.block : blocks - 1;
  const n = block + 1;
  const go = (id: string) => {
    const step = steps.get(id);
    if (step !== undefined) onSeek(step);
  };

  const node = (which: Stage, target: string, title: string, detail: React.ReactNode) => (
    <li className="flex min-w-0 flex-1">
      <button
        type="button"
        onClick={() => go(target)}
        aria-current={stage === which ? 'step' : undefined}
        className={cn(NODE, stage === which ? NODE_STATE.now : NODE_STATE.other)}
      >
        <span>{title}</span>
        <span className="font-mono font-normal tabular-nums">{detail}</span>
      </button>
    </li>
  );

  return (
    <nav aria-label="SHA-256 pipeline" className="flex flex-col gap-2">
      <ol className="flex items-stretch gap-1">
        <li className="flex min-w-0 flex-1">
          <span className={cn(NODE, 'border-border border-dashed')}>
            <span className="text-fg-secondary">Message</span>
            <span className="truncate font-mono">“{printable(pad.message)}”</span>
          </span>
        </li>
        <Arrow />
        {node('pad', 'sha256.pad', 'Padded', `${blocks} block${blocks === 1 ? '' : 's'}`)}
        <Arrow />
        {node(
          'words',
          `sha256.b${n}.block`,
          'Words',
          event.kind === 'sha256.schedule' ? (
            <Reveal trigger={event.t}>W{event.t}/63</Reveal>
          ) : event.kind === 'sha256.block' ? (
            'W0–W15'
          ) : (
            '64'
          ),
        )}
        <Arrow />
        {node(
          'rounds',
          `sha256.b${n}.r0`,
          'Rounds',
          event.kind === 'sha256.round' ? (
            <Reveal trigger={event.t}>{event.t + 1}/64</Reveal>
          ) : (
            '64'
          ),
        )}
        <Arrow />
        {node(
          'digest',
          'sha256.digest',
          event.kind === 'sha256.add' ? 'Add' : 'Digest',
          event.kind === 'sha256.add' ? 'H += a–h' : '32 bytes',
        )}
      </ol>
      {blocks > 1 && stage !== 'pad' ? (
        <p className="text-fg-muted text-xs">
          Block {n} of {blocks}: the words, rounds and add run once per block.
        </p>
      ) : null}
      {event.kind === 'sha256.round' ? (
        <label className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium">Round</span>
          <input
            type="range"
            min={1}
            max={64}
            value={event.t + 1}
            onChange={(e) => go(`sha256.b${n}.r${Number(e.target.value) - 1}`)}
            aria-label="Round"
            aria-valuetext={`Round ${event.t + 1} of 64`}
            className="accent-accent min-h-target min-w-40 flex-1 md:min-h-0"
          />
          <span className="text-fg-muted font-mono text-xs tabular-nums">
            {event.t + 1} of 64
          </span>
        </label>
      ) : null}
    </nav>
  );
});
