import type { RsaEvent } from '@/core/rsa/events';
import type { RsaChapter } from '@/core/rsa/state';
import { cn } from '@/lib/cn';

/**
 * The formulas of RSA, filled in as the steps that compute them run. Values are read off
 * the events up to the current step; a value not reached yet shows as "?".
 */

type Slot = 'p' | 'q' | 'n' | 'phi' | 'e' | 'd' | 'm' | 'c' | 'back' | 'h' | 's' | 'v';
type Known = Partial<Record<Slot, string>>;

/** What one event tells the panel. */
function valuesOf(event: RsaEvent): Known {
  switch (event.kind) {
    case 'rsa.prime':
      return { [event.which]: event.value };
    case 'rsa.modulus':
      return { n: event.n };
    case 'rsa.totient':
      return { phi: event.phi };
    case 'rsa.chooseE':
      return { e: event.e };
    case 'rsa.private':
      return { d: event.d };
    case 'rsa.keyPair':
      return {
        p: event.p,
        q: event.q,
        n: event.n,
        phi: event.phi,
        e: event.e,
        d: event.d,
      };
    case 'rsa.message':
      return { m: event.m };
    case 'rsa.hash':
      return { h: event.h };
    case 'rsa.powResult': {
      const slot = { encrypt: 'c', decrypt: 'back', sign: 's', verify: 'v' } as const;
      return { [slot[event.op]]: event.result };
    }
    default:
      return {};
  }
}

interface Row {
  slot: Slot;
  formula: string;
  /** The formula with the values so far, e.g. `61 × 53`. */
  working?: (v: Known) => string | null;
}

const KEY_ROWS: Row[] = [
  { slot: 'p', formula: 'p (secret prime)' },
  { slot: 'q', formula: 'q (secret prime)' },
  {
    slot: 'n',
    formula: 'n = p × q',
    working: (v) => (v.p && v.q ? `${v.p} × ${v.q}` : null),
  },
  {
    slot: 'phi',
    formula: 'φ(n) = (p − 1)(q − 1)',
    working: (v) => (v.p && v.q ? `${BigInt(v.p) - 1n} × ${BigInt(v.q) - 1n}` : null),
  },
  { slot: 'e', formula: 'e, with gcd(e, φ(n)) = 1' },
  { slot: 'd', formula: 'd = e⁻¹ mod φ(n)' },
];

const CHAPTER_ROWS: Record<Exclude<RsaChapter, 'malleability'>, Row[]> = {
  keys: [],
  encrypt: [
    { slot: 'm', formula: 'm (the message, below n)' },
    { slot: 'c', formula: 'c = mᵉ mod n' },
    { slot: 'back', formula: 'm = cᵈ mod n' },
  ],
  sign: [
    { slot: 'h', formula: 'h = SHA-256(message) as a number' },
    { slot: 's', formula: 's = hᵈ mod n' },
    { slot: 'v', formula: 'sᵉ mod n (must equal h)' },
  ],
};

export function FormulaPanel({
  chapter,
  events,
  index,
}: {
  chapter: Exclude<RsaChapter, 'malleability'>;
  events: readonly RsaEvent[];
  index: number;
}) {
  const known: Known = {};
  for (const event of events.slice(0, index + 1)) Object.assign(known, valuesOf(event));
  const event = events[index];
  const current =
    event && event.kind !== 'rsa.keyPair' ? Object.keys(valuesOf(event)) : [];
  const rows = [...KEY_ROWS, ...CHAPTER_ROWS[chapter]];

  return (
    <section aria-labelledby="rsa-formulas" className="flex flex-col gap-2">
      <h2
        id="rsa-formulas"
        className="text-fg-muted text-xs font-medium tracking-wide uppercase"
      >
        Formulas so far
      </h2>
      <dl className="border-border divide-border divide-y rounded-md border text-sm">
        {rows.map((row) => {
          const value = known[row.slot];
          const working = value === undefined ? null : row.working?.(known);
          const fresh = current.includes(row.slot);
          return (
            <div
              key={row.slot}
              data-testid={`rsa-formula-${row.slot}`}
              className={cn(
                'grid gap-x-3 px-3 py-1.5 sm:grid-cols-[14rem_1fr]',
                fresh && 'bg-highlight',
              )}
            >
              <dt className="text-fg-secondary">{row.formula}</dt>
              <dd className="min-w-0 font-mono break-all">
                {value === undefined ? (
                  <span className="text-fg-muted">?</span>
                ) : (
                  <>
                    {working ? (
                      <span className="text-fg-secondary">{working} = </span>
                    ) : null}
                    <span className={cn(fresh && 'font-semibold')}>{value}</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
