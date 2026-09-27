import { EyeOff, Lock } from 'lucide-react';

import { cn } from '@/lib/cn';

import { shortNumber, type Board, type BoardItem, type LaneId } from '../board';
import { Swatch } from './parts';

const TITLES: Record<LaneId, string> = {
  alice: 'Alice',
  public: 'Public channel',
  bob: 'Bob',
  malloryA: 'Mallory, Alice’s side',
  malloryB: 'Mallory, Bob’s side',
  eve: 'Eve',
};

const TONE_CLASS: Record<BoardItem['tone'], string> = {
  private: 'border-dashed border-border-strong',
  public: 'border-border',
  share: 'border-border',
  secret: 'border-accent border-2',
  fake: 'border-warn border-2',
  check: 'border-ok',
};

/** Private values and secrets are what an eavesdropper doesn't get. */
const hiddenFromEve = (lane: LaneId, item: BoardItem) =>
  lane !== 'public' &&
  lane !== 'eve' &&
  (item.tone === 'private' || item.tone === 'secret');

function Item({
  item,
  lane,
  current,
  eve,
}: {
  item: BoardItem;
  lane: LaneId;
  current: boolean;
  eve: boolean;
}) {
  const hidden = item.value === undefined || (eve && hiddenFromEve(lane, item));
  return (
    <li
      aria-current={current ? 'step' : undefined}
      className={cn(
        'bg-surface flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-sm',
        TONE_CLASS[item.tone],
        current && 'bg-highlight',
      )}
    >
      {item.colour && !hidden ? <Swatch colour={item.colour} /> : null}
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 font-medium">
          {item.tone === 'private' ? (
            <Lock aria-hidden="true" className="text-fg-muted size-3.5" />
          ) : null}
          {item.name}
        </span>
        {hidden ? (
          <span className="text-fg-muted flex items-center gap-1 font-mono">
            <EyeOff aria-hidden="true" className="size-3.5" />?
            <span className="sr-only">(hidden from Eve)</span>
          </span>
        ) : (
          <span className="font-mono break-all">{shortNumber(item.value ?? '')}</span>
        )}
        {item.note && !hidden ? (
          <span className="text-fg-secondary text-xs">{item.note}</span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Who holds what, one lane per party, with the value this step added highlighted. With
 * `eve` on, it is Eve's view: private numbers and secrets are hidden, the public
 * channel is all she gets.
 */
export function Lanes({
  board,
  lanes,
  index,
  eve = false,
  label,
}: {
  board: Board;
  lanes: readonly LaneId[];
  index: number;
  eve?: boolean;
  label: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'grid gap-3',
        lanes.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3',
      )}
    >
      {lanes.map((lane) => {
        const items = board[lane];
        const watched = eve && lane === 'public';
        return (
          <li
            key={lane}
            data-lane={lane}
            className={cn(
              'flex min-w-0 flex-col gap-2 rounded-lg border p-2',
              watched ? 'border-warn border-2' : 'border-border',
              lane === 'public' || lane.startsWith('mallory')
                ? 'bg-surface-overlay'
                : 'bg-bg',
            )}
          >
            <p className="flex items-baseline justify-between gap-2 text-sm font-semibold">
              {TITLES[lane]}
              {watched ? (
                <span className="text-fg-secondary text-xs font-normal">
                  Eve reads all of this
                </span>
              ) : null}
            </p>
            {items.length === 0 ? (
              <p className="text-fg-muted text-xs">Nothing yet.</p>
            ) : (
              <ul aria-label={`${TITLES[lane]} holds`} className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <Item
                    key={item.key}
                    item={item}
                    lane={lane}
                    current={item.step === index}
                    eve={eve}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
