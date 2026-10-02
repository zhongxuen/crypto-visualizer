import { Ear, EyeOff, KeyRound, Lock, RadioTower } from 'lucide-react';
import type { ReactNode } from 'react';

import { Pulse, Reveal, Travel, useStepTransition } from '@/components/motion';
import { cn } from '@/lib/cn';

import { shortNumber, type Board, type BoardItem, type LaneId } from '../board';
import { Pot } from './Pot';

const TITLES: Record<LaneId, string> = {
  alice: 'Alice',
  public: 'Public channel',
  bob: 'Bob',
  malloryA: 'Mallory, Alice’s side',
  malloryB: 'Mallory, Bob’s side',
  eve: 'Eve',
};

/** Secret vs public is shown by a glyph and a label as well as the colour (UIUX §5.1). */
const TONE_CLASS: Record<BoardItem['tone'], string> = {
  private: 'border-secret border border-dashed',
  public: 'border-public border',
  share: 'border-public border',
  secret: 'border-secret border-2',
  fake: 'border-warn border-2 border-dotted',
  check: 'border-ok border',
};

/**
 * Mallory's two secrets: one colour and one glyph per pair, so "Alice's secret is the
 * one Mallory shares with Alice" reads at a glance, in colour or without it.
 */
export const PAIR = {
  alice: { border: 'border-diff-off border-2', glyph: '●', words: 'pair 1' },
  bob: { border: 'border-diff-on border-2', glyph: '■', words: 'pair 2' },
} as const;

/** Private values and secrets are what an eavesdropper doesn't get. */
const hiddenFromEve = (lane: LaneId, item: BoardItem) =>
  lane !== 'public' &&
  lane !== 'eve' &&
  (item.tone === 'private' || item.tone === 'secret');

const ROW = 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1';

function ToneGlyph({ item }: { item: BoardItem }) {
  if (item.pair) {
    return (
      <span aria-hidden="true" className="text-fg-muted text-xs">
        {PAIR[item.pair].glyph}
      </span>
    );
  }
  const Icon =
    item.tone === 'private'
      ? Lock
      : item.tone === 'secret'
        ? KeyRound
        : item.tone === 'share' || item.tone === 'public'
          ? RadioTower
          : null;
  return Icon ? (
    <Icon aria-hidden="true" className="text-fg-muted size-3.5 shrink-0" />
  ) : null;
}

function Item({
  item,
  lane,
  current,
  eve,
  glow,
}: {
  item: BoardItem;
  lane: LaneId;
  current: boolean;
  eve: boolean;
  /** This step is about this item without adding it (both secrets agree). */
  glow: boolean;
}) {
  const { animate, direction } = useStepTransition();
  const hidden = item.value === undefined || (eve && hiddenFromEve(lane, item));
  const value = hidden ? (
    <span className="text-fg-muted flex items-center gap-1 font-mono">
      <EyeOff aria-hidden="true" className="size-3.5" />?
      <span className="sr-only">(hidden from Eve)</span>
    </span>
  ) : (
    <span className="font-mono break-all">{shortNumber(item.value ?? '')}</span>
  );
  const body = (
    <>
      {item.colour && !hidden ? <Pot colour={item.colour} /> : null}
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 font-medium">
          <ToneGlyph item={item} />
          {item.name}
          {item.pair ? <span className="sr-only"> ({PAIR[item.pair].words})</span> : null}
        </span>
        {glow ? <Pulse trigger={item.key}>{value}</Pulse> : value}
        {item.note && !hidden ? (
          <span className="text-fg-secondary text-xs">{item.note}</span>
        ) : null}
      </span>
    </>
  );
  // A value that crossed lanes flies in from where it was; anything else rises in.
  const arriving = current && animate && direction === 'forward';
  const inner =
    arriving && item.source ? (
      <Travel from={item.source} trigger={item.key} className="max-w-full">
        <span className={ROW}>{body}</span>
      </Travel>
    ) : arriving ? (
      <Reveal trigger={item.key}>
        <span className={ROW}>{body}</span>
      </Reveal>
    ) : (
      <span className={ROW}>{body}</span>
    );
  return (
    <li
      id={item.id}
      aria-current={current ? 'step' : undefined}
      data-travel-from={arriving && item.source ? item.source : undefined}
      className={cn(
        'min-w-0 rounded-md px-2 py-1.5 text-sm',
        item.pair ? PAIR[item.pair].border : TONE_CLASS[item.tone],
        current || glow ? 'bg-highlight' : 'bg-surface',
      )}
    >
      {inner}
    </li>
  );
}

export function Lane({
  lane,
  board,
  index,
  eve,
  glow,
  className,
  extra,
}: {
  lane: LaneId;
  board: Board;
  index: number;
  eve: boolean;
  glow?: (item: BoardItem) => boolean;
  className?: string;
  extra?: ReactNode;
}) {
  const items = board[lane];
  return (
    <li
      data-lane={lane}
      className={cn('flex min-w-0 flex-col gap-2 rounded-lg p-1.5 md:p-2', className)}
    >
      <p className="flex flex-wrap items-center justify-between gap-x-2 text-sm font-semibold">
        <span className="flex items-center gap-1">
          {lane === 'eve' ? <Ear aria-hidden="true" className="size-4" /> : null}
          {TITLES[lane]}
        </span>
        {extra}
      </p>
      {items.length === 0 ? (
        <p className="text-fg-muted text-xs">Nothing yet.</p>
      ) : (
        <ul
          aria-label={`${TITLES[lane]} holds`}
          className={cn(
            'flex flex-col gap-1.5',
            lane === 'eve' && 'sm:flex-row sm:flex-wrap',
          )}
        >
          {items.map((item) => (
            <Item
              key={item.key}
              item={item}
              lane={lane}
              current={item.step === index}
              eve={eve}
              glow={glow?.(item) ?? false}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export const PERSON = 'border-secret/40 bg-surface border';

/**
 * Who holds what: Alice on the left, the public channel in the middle, Bob on the right,
 * at every width. A value that crosses the channel flies from one lane to the other;
 * Eve's lane slides in under the channel when she starts listening. With `eve` on it is
 * Eve's view: private numbers and secrets are hidden, the channel is all she gets.
 */
export function Lanes({
  board,
  index,
  eve = false,
  withEve = false,
  glow,
  label,
}: {
  board: Board;
  index: number;
  eve?: boolean;
  /** Show Eve's own lane, under the channel. */
  withEve?: boolean;
  glow?: (item: BoardItem) => boolean;
  label: string;
}) {
  const { animate } = useStepTransition();
  const eveArrives = animate && board.eve[0]?.step === index;
  const common = { board, index, eve, glow };
  return (
    <ul aria-label={label} className="grid grid-cols-3 gap-1.5 md:gap-3">
      <Lane lane="alice" {...common} className={PERSON} />
      <Lane
        lane="public"
        {...common}
        className={cn(
          'bg-surface-overlay',
          eve ? 'border-warn border-2' : 'border-public border border-dashed',
        )}
        extra={
          eve ? (
            <span className="text-fg-secondary text-xs font-normal">
              Eve reads all of this
            </span>
          ) : (
            <RadioTower aria-hidden="true" className="text-public size-4" />
          )
        }
      />
      <Lane lane="bob" {...common} className={PERSON} />
      {withEve ? (
        <Lane
          lane="eve"
          {...common}
          glow={undefined}
          className={cn(
            'border-warn bg-surface col-span-3 border-2 border-dashed',
            eveArrives &&
              'transition-[translate,opacity] duration-(--dur-step) ease-(--ease-out) starting:-translate-y-3 starting:opacity-0',
          )}
          extra={
            <span className="text-fg-secondary text-xs font-normal">
              listening to the channel
            </span>
          }
        />
      ) : null}
    </ul>
  );
}
