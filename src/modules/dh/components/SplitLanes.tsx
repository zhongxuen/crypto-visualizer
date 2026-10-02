import { Scissors } from 'lucide-react';

import type { Board, BoardItem } from '../board';
import { Lane, PERSON } from './Lanes';

/**
 * Man in the middle: the channel cut in two, with Mallory in the gap. Each half is a
 * lane of its own (her side facing Alice, her side facing Bob), and each pair of secrets
 * gets its own colour and glyph.
 */
export function SplitLanes({
  board,
  index,
  glow,
  label,
}: {
  board: Board;
  index: number;
  glow?: (item: BoardItem) => boolean;
  label: string;
}) {
  const common = { board, index, eve: false, glow };
  const half = 'border-warn bg-surface-overlay border-2';
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-3 gap-1.5 md:grid-cols-[1fr_2fr_1fr] md:gap-3"
    >
      <Lane lane="alice" {...common} className={PERSON} />
      <li className="flex min-w-0 flex-col gap-1">
        <p className="text-warn flex items-center justify-center gap-1 text-center text-xs font-semibold">
          <Scissors aria-hidden="true" className="size-3.5 shrink-0" />
          Mallory cuts the channel in two
        </p>
        <ul
          aria-label="The channel, cut by Mallory"
          className="grid min-w-0 gap-2 md:grid-cols-2"
        >
          <Lane lane="malloryA" {...common} className={half} />
          <Lane lane="malloryB" {...common} className={half} />
        </ul>
      </li>
      <Lane lane="bob" {...common} className={PERSON} />
    </ul>
  );
}
