import { ModClock, NumberTrace } from '@/components/blocks';
import type { DhPowStepEvent, DhPublicKeyEvent, DhSharedEvent } from '@/core/dh/events';
import { CLOCK_LIMIT } from '@/core/dh/params';
import { cn } from '@/lib/cn';

import { Label, Value } from './parts';

const COLUMNS = [
  { key: 'i', label: 'Bit' },
  { key: 'bit', label: 'Value' },
  { key: 'before', label: 'Before' },
  { key: 'squared', label: 'Squared mod p' },
  { key: 'after', label: 'After' },
] as const;

const WHO = { alice: 'Alice', bob: 'Bob', mallory: 'Mallory', eve: 'Eve' } as const;

/** Toy groups with p ≤ 60 get the clock; above that a clock face is unreadable. */
export const hasClock = (p: string) => BigInt(p) <= CLOCK_LIMIT;

/** Square-and-multiply, one exponent bit per step, with the running value on a clock. */
export function PowStepView({ event }: { event: DhPowStepEvent }) {
  const row = event.rows[event.row];
  const formula =
    event.purpose === 'public'
      ? `${event.actor === 'alice' ? 'A = gᵃ' : 'B = gᵇ'} mod p`
      : `secret = ${event.actor === 'alice' ? 'Bᵃ' : 'Aᵇ'} mod p`;
  const rows = event.rows.map((r, i) => ({
    i: i + 1,
    bit: r.bit,
    before: r.before,
    squared: r.squared,
    after: r.bit ? `× ${event.base} → ${r.after}` : r.after,
  }));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        {WHO[event.actor]}: {formula} with base{' '}
        <span className="font-mono">{event.base}</span>, exponent{' '}
        <span className="font-mono">{event.exp}</span>, p ={' '}
        <span className="font-mono">{event.p}</span>.
      </p>
      <div className="flex flex-col gap-1">
        <Label>
          Exponent in binary: bit {event.row + 1} of {event.rows.length}
        </Label>
        <p className="font-mono text-lg tracking-widest" aria-hidden="true">
          {event.expBits.split('').map((b, i) => (
            <span
              key={i}
              className={cn(
                'rounded px-0.5',
                i === event.row && 'bg-diff-on text-diff-on-fg',
                i > event.row && 'text-fg-muted',
              )}
            >
              {b}
            </span>
          ))}
        </p>
        <p className="sr-only">
          The exponent is {event.expBits} in binary; this step reads bit {event.row + 1},
          which is {row.bit}.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <NumberTrace
          caption={`Square-and-multiply for ${formula}`}
          columns={COLUMNS}
          rows={rows}
          currentRow={event.row}
          maxHeight="24rem"
          className="min-w-0 flex-1"
        />
        {hasClock(event.p) ? (
          <ModClock
            label="Running value"
            modulus={BigInt(event.p)}
            value={BigInt(row.after)}
            from={BigInt(row.before)}
          />
        ) : null}
      </div>
    </div>
  );
}

/** A public share or a shared secret, once computed. */
export function PowResultView({ event }: { event: DhPublicKeyEvent | DhSharedEvent }) {
  const share = event.kind === 'dh.publicKey';
  const who = WHO[event.actor];
  const label = share ? `${who}'s share ${event.name}` : `${who}'s secret`;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Value
          label={share ? 'g' : 'Base (the share received)'}
          value={share ? event.g : event.base}
        />
        <Value label="Exponent (private)" value={event.exp} />
        <Value label="p" value={event.p} />
        <Value
          label={label}
          value={event.value}
          emphasis
          testId={share ? `dh-share-${event.name}` : `dh-secret-${event.actor}`}
        />
      </div>
      {event.summary ? (
        <p className="text-fg-secondary text-sm">
          The 2048-bit group does this in one step: a {event.summary.digits.exp}-digit
          exponent took {event.summary.squarings} squarings and{' '}
          {event.summary.multiplications} multiplications of {event.summary.digits.p}
          -digit numbers, giving a {event.summary.digits.result}-digit result.
        </p>
      ) : null}
      {hasClock(event.p) ? (
        <ModClock label={label} modulus={BigInt(event.p)} value={BigInt(event.value)} />
      ) : null}
    </div>
  );
}
