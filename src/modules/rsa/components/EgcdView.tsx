import { NumberTrace } from '@/components/blocks';
import type { RsaEgcdRowEvent } from '@/core/rsa/events';

const COLUMNS = [
  { key: 'row', label: 'Row' },
  { key: 'q', label: 'q' },
  { key: 'r', label: 'r' },
  { key: 's', label: 's' },
  { key: 't', label: 't' },
] as const;

/** The extended Euclid table on (φ(n), e), one row per step. */
export function EgcdView({ event }: { event: RsaEgcdRowEvent }) {
  const rows = event.rows.map((row, i) => ({
    row: i,
    q: row.q ?? '',
    r: row.r,
    s: row.s,
    t: row.t,
  }));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        Extended Euclid on a = φ(n) = <span className="font-mono">{event.a}</span> and b =
        e = <span className="font-mono">{event.b}</span>. Every row keeps r = s·a + t·b.
      </p>
      <NumberTrace
        caption="Extended Euclid table"
        columns={COLUMNS}
        rows={rows}
        currentRow={event.row}
        maxHeight="24rem"
        className="max-w-2xl"
      />
    </div>
  );
}
