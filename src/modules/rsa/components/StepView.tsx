import { ModClock } from '@/components/blocks';
import { Reveal, Wave } from '@/components/motion';
import type {
  RsaKeyPairEvent,
  RsaModulusEvent,
  RsaPrimeEvent,
  RsaPrivateEvent,
} from '@/core/rsa/events';

import { Label, Value } from './parts';

/** Above this many candidate divisors the ticks show the first few and the last. */
const TICKS_SHOWN = 8;
/** Milliseconds between two ticks (UIUX §7.2: the divisors tick past). */
const TICK_MS = 60;

/**
 * The divisors core's trial division tries (`trialDivision` in src/core/rsa/primes.ts):
 * 2, then every odd number up to ⌊√p⌋. Core has already said none of them divides p;
 * this only lists them, eliding the middle of a long run.
 */
function trialDivisors(limit: number): { shown: number[]; skipped: number } {
  const all = limit >= 2 ? 1 + Math.max(0, Math.floor((limit - 1) / 2)) : 0;
  const nth = (i: number) => (i === 0 ? 2 : 2 * i + 1);
  if (all <= TICKS_SHOWN)
    return { shown: Array.from({ length: all }, (_, i) => nth(i)), skipped: 0 };
  const head = Array.from({ length: TICKS_SHOWN - 1 }, (_, i) => nth(i));
  return { shown: [...head, nth(all - 1)], skipped: all - TICKS_SHOWN };
}

export function PrimeView({ event }: { event: RsaPrimeEvent }) {
  const trial = event.test === 'trial';
  const { shown, skipped } = trial
    ? trialDivisors(Number(event.checkedUpTo))
    : { shown: [], skipped: 0 };
  return (
    <div className="flex flex-col gap-3">
      <Value
        label={`${event.which} (${event.bits} bits)`}
        value={event.value}
        emphasis
        kind="secret"
      />
      {trial ? (
        <div className="flex flex-col gap-2" data-testid="rsa-trial">
          <Label>
            Trial division up to ⌊√{event.which}⌋ = {event.checkedUpTo}
          </Label>
          <p className="sr-only">
            None of {shown.slice(0, -1).join(', ')}
            {skipped > 0 ? `, … (${skipped} more)` : ''}
            {shown.length > 1 ? ' or ' : ''}
            {shown.at(-1)} divides {event.value}, so it is prime.
          </p>
          <div aria-hidden="true" className="flex flex-wrap items-center gap-2">
            <Wave trigger={event.id} stagger={TICK_MS} className="flex flex-wrap gap-1.5">
              {shown.flatMap((d, i) => [
                ...(skipped > 0 && i === shown.length - 1
                  ? [
                      <span key="skip" className="text-fg-muted self-center px-1 text-sm">
                        … {skipped} more
                      </span>,
                    ]
                  : []),
                <span
                  key={d}
                  data-divisor={d}
                  className="border-border bg-surface rounded-cell inline-flex items-baseline gap-1 border px-2 py-0.5 font-mono text-sm"
                >
                  {d}
                  <span className="text-danger">✗</span>
                </span>,
              ])}
            </Wave>
            <Reveal
              trigger={event.id}
              index={Math.ceil(((shown.length + 1) * TICK_MS) / 18)}
            >
              <span
                data-testid="rsa-prime-stamp"
                className="border-ok text-ok inline-block -rotate-3 rounded-md border-2 px-2 py-0.5 text-sm font-bold tracking-widest uppercase"
              >
                prime ✓
              </span>
            </Reveal>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-fg-secondary text-sm">
            Miller-Rabin: {event.rounds} random bases, all passed. Found after{' '}
            {event.candidates} odd candidates.
          </p>
          <span
            data-testid="rsa-prime-stamp"
            className="border-ok text-ok inline-block -rotate-3 rounded-md border-2 px-2 py-0.5 text-sm font-bold tracking-widest uppercase"
          >
            probable prime ✓
          </span>
        </div>
      )}
    </div>
  );
}

export function ModulusView({ event }: { event: RsaModulusEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Value label="p" value={event.p} kind="secret" />
        <Value label="q" value={event.q} kind="secret" />
        <Value
          label={`n = p × q (${event.bits} bits)`}
          value={event.n}
          emphasis
          kind="public"
        />
      </div>
      {BigInt(event.n) <= 120n ? (
        <ModClock label="Numbers mod n" modulus={BigInt(event.n)} value={0n} />
      ) : null}
    </div>
  );
}

export function PrivateView({ event }: { event: RsaPrivateEvent }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Value label="t from the gcd row" value={event.t} />
      <Value
        label="d = t mod φ(n)"
        value={event.d}
        emphasis
        kind="secret"
        testId="rsa-d"
      />
      <Value label="e × d" value={event.ed} />
      <Value label="e × d mod φ(n)" value={event.check} />
    </div>
  );
}

/** Public and private halves of the key, side by side. */
export function KeyPairView({ event }: { event: RsaKeyPairEvent }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section aria-label="Public key" className="flex flex-col gap-2">
        <h2 className="text-public font-semibold">
          <span aria-hidden="true">📡 </span>Public key: anyone may have it
        </h2>
        <Value label={`n (${event.bits} bits)`} value={event.n} kind="public" />
        <Value label="e" value={event.e} kind="public" />
      </section>
      <section aria-label="Private key" className="flex flex-col gap-2">
        <h2 className="text-secret font-semibold">
          <span aria-hidden="true">🔒 </span>Private key: only the owner
        </h2>
        <Value label="d" value={event.d} emphasis kind="secret" />
        <Value label="p, q" value={`${event.p}, ${event.q}`} kind="secret" />
        <Value label="φ(n)" value={event.phi} kind="secret" />
        <p className="text-fg-muted text-xs">
          Keys here come from a seeded, non-cryptographic generator and are far too small.
          Display only.
        </p>
      </section>
    </div>
  );
}
