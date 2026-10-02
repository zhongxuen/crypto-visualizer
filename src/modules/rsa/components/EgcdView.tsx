import { useStepTransition } from '@/components/motion';
import type { RsaEgcdRowEvent } from '@/core/rsa/events';
import { cn } from '@/lib/cn';

const COLUMNS = ['Row', 'q', 'r', 's', 't'] as const;

/**
 * The extended Euclid table on (φ(n), e), writing itself one row per step (UIUX §7.2).
 * The new row slides in, and the two rows it is made from (two above, and the one above
 * whose q it uses) are marked, so "row i = row i−2 − q × row i−1" can be seen. Every value
 * is core's; the view only lays them out.
 */
export function EgcdView({ event }: { event: RsaEgcdRowEvent }) {
  const { animate, direction } = useStepTransition();
  const current = event.row;
  const visible = event.rows.slice(0, current + 1);
  const twoAbove = current >= 2 ? event.rows[current - 2] : null;
  const above = current >= 2 ? event.rows[current - 1] : null;
  const row = event.rows[current];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        Extended Euclid on a = φ(n) = <span className="font-mono">{event.a}</span> and b =
        e = <span className="font-mono">{event.b}</span>. Every row keeps r = s·a + t·b.
      </p>
      <div
        className="border-border bg-surface max-w-2xl overflow-auto rounded-md border"
        style={{ maxHeight: '24rem' }}
        tabIndex={0}
        role="region"
        aria-label="Extended Euclid table"
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Extended Euclid table</caption>
          <thead className="bg-surface-overlay sticky top-0">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="text-fg-secondary px-3 py-1 text-right font-medium"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const source =
                current >= 2 && i === current - 2
                  ? 'two-above'
                  : current >= 2 && i === current - 1
                    ? 'above'
                    : undefined;
              const isCurrent = i === current;
              return (
                <tr
                  key={i}
                  aria-current={isCurrent ? 'step' : undefined}
                  data-source={source}
                  className={cn(
                    'border-border border-t',
                    isCurrent && 'bg-highlight font-semibold',
                    isCurrent && animate && direction === 'forward' && 'motion-reveal',
                    source && 'pattern-changed',
                  )}
                >
                  <td className="px-3 py-1 text-right font-mono tabular-nums">{i}</td>
                  <td
                    className={cn(
                      'px-3 py-1 text-right font-mono tabular-nums',
                      source === 'above' && 'font-bold underline decoration-2',
                    )}
                  >
                    {r.q ?? ''}
                  </td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums">{r.r}</td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums">{r.s}</td>
                  <td className="px-3 py-1 text-right font-mono tabular-nums">{r.t}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {twoAbove && above ? (
        <p
          data-testid="rsa-egcd-source"
          className="text-fg-secondary font-mono text-sm break-words"
        >
          <span className="font-sans">
            Row {current} = row {current - 2} − {above.q} × row {current - 1}:
          </span>{' '}
          r = {twoAbove.r} − {above.q} × {above.r} = {row.r}, s = {twoAbove.s} − {above.q}{' '}
          × {paren(above.s)} = {row.s}, t = {twoAbove.t} − {above.q} × {paren(above.t)} ={' '}
          {row.t}
        </p>
      ) : (
        <p className="text-fg-secondary text-sm">
          {current === 0
            ? 'Row 0 starts from a itself: a = 1·a + 0·b.'
            : 'Row 1 starts from b itself: b = 0·a + 1·b.'}
        </p>
      )}
      <p className="text-fg-muted text-xs">
        Hatched: the two rows this row is made from. Underlined: the q it uses.
      </p>
    </div>
  );
}

/** A negative factor in a product, in brackets: 3 × (−183). */
function paren(value: string): string {
  return value.startsWith('-') ? `(${value})` : value;
}
