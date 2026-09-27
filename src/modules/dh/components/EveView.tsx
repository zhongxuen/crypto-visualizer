import { ModClock, NumberTrace } from '@/components/blocks';
import type {
  DhEvent,
  DhEveFoundEvent,
  DhEveGrowthEvent,
  EveGrowthRow,
} from '@/core/dh/events';

import { hasClock } from './PowView';
import { Value, Verdict } from './parts';

const COLUMNS = [
  { key: 'x', label: 'Guess x' },
  { key: 'value', label: 'gˣ mod p' },
  { key: 'verdict', label: 'Is it A?', numeric: false },
] as const;

/**
 * Eve's exhaustive search so far: one row per guess, with a run of skipped guesses as a
 * single row. The table is built from the tries already stepped through.
 */
export function EveSearchView({
  events,
  index,
}: {
  events: readonly DhEvent[];
  index: number;
}) {
  const rows: Record<string, string>[] = [];
  let p = '';
  let target = '';
  let last: { value: string; x: string } | null = null;
  for (let i = 0; i <= index; i += 1) {
    const e = events[i];
    if (e.kind === 'dh.params') p = e.p;
    if (e.kind === 'dh.eveTry') {
      target = e.target;
      last = { value: e.value, x: e.x };
      rows.push({ x: e.x, value: e.value, verdict: e.match ? 'Yes: x = a' : 'No' });
    } else if (e.kind === 'dh.eveSkip') {
      rows.push({
        x: `${e.from}–${e.to}`,
        value: '…',
        verdict: `No (${e.count} guesses)`,
      });
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        Eve wants x with gˣ mod p = A = <span className="font-mono">{target}</span>. She
        tries x = 1, 2, 3, …
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <NumberTrace
          caption="Eve's guesses"
          columns={COLUMNS}
          rows={rows}
          currentRow={rows.length - 1}
          maxHeight="20rem"
          className="min-w-0 flex-1"
        />
        {last && p && hasClock(p) ? (
          <ModClock
            label={`Guess ${last.x}`}
            modulus={BigInt(p)}
            value={BigInt(last.value)}
          />
        ) : null}
      </div>
    </div>
  );
}

export function EveFoundView({ event }: { event: DhEveFoundEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Value label="Guesses" value={event.tries} />
        <Value label="a, found" value={event.x} testId="dh-eve-a" />
        <Value label="Bᵃ mod p" value={event.shared} emphasis testId="dh-eve-secret" />
      </div>
      <Verdict ok={!event.ok}>
        {event.ok
          ? 'Eve holds the same secret as Alice and Bob. Everything they encrypt with it, she can read.'
          : 'Eve’s secret doesn’t match.'}
      </Verdict>
    </div>
  );
}

/** Worst-case guesses and time, in words for the huge ones. */
function worstCase(row: EveGrowthRow) {
  return row.worstCaseDigits > 15
    ? `a ${row.worstCaseDigits}-digit number`
    : BigInt(row.worstCase).toLocaleString('en-US');
}

function timeTaken(row: EveGrowthRow) {
  if (row.years === '0') return 'under a second';
  return row.yearsDigits > 15
    ? `a ${row.yearsDigits}-digit number of years`
    : `${BigInt(row.years).toLocaleString('en-US')} years`;
}

/** How the search grows with p: every group, smallest first. */
export function EveGrowthView({
  event,
  groupName,
}: {
  event: DhEveGrowthEvent;
  groupName?: string;
}) {
  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm" data-testid="dh-growth">
        <caption className="text-fg-secondary px-2 py-1 text-left">
          Eve’s worst case, trying every exponent at a billion guesses a second
        </caption>
        <thead className="bg-surface-overlay">
          <tr>
            <th scope="col" className="px-2 py-1 text-left font-medium">
              Group
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              Bits
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              Digits of p
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              Guesses
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {event.rows.map((row) => {
            const current = row.group === groupName;
            return (
              <tr
                key={row.group}
                aria-current={current ? 'true' : undefined}
                className={
                  current
                    ? 'bg-highlight border-border border-t font-semibold'
                    : 'border-border border-t'
                }
              >
                <th scope="row" className="px-2 py-1 text-left font-normal">
                  {row.group}
                  {current ? <span className="sr-only"> (this run)</span> : null}
                </th>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {row.bits}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {row.pDigits}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {worstCase(row)}
                </td>
                <td className="px-2 py-1 text-right">{timeTaken(row)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
