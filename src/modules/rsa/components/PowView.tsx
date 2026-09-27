import { ModClock, NumberTrace } from '@/components/blocks';
import type { RsaPowResultEvent, RsaPowStepEvent } from '@/core/rsa/events';
import { cn } from '@/lib/cn';

import { Label, Value } from './parts';

const COLUMNS = [
  { key: 'i', label: 'Bit' },
  { key: 'bit', label: 'Value' },
  { key: 'before', label: 'Before' },
  { key: 'squared', label: 'Squared mod n' },
  { key: 'after', label: 'After' },
] as const;

const NAMES = {
  encrypt: { base: 'm', exp: 'e', result: 'c', formula: 'c = mᵉ mod n' },
  decrypt: { base: 'c', exp: 'd', result: 'm', formula: 'm = cᵈ mod n' },
  sign: { base: 'h', exp: 'd', result: 's', formula: 's = hᵈ mod n' },
  verify: { base: 's', exp: 'e', result: 'sᵉ mod n', formula: 'sᵉ mod n' },
} as const;

/** Square-and-multiply, one exponent bit per step, with the running value on a clock. */
export function PowStepView({ event }: { event: RsaPowStepEvent }) {
  const names = NAMES[event.op];
  const row = event.rows[event.row];
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
        {names.formula} with {names.base} ={' '}
        <span className="font-mono">{event.base}</span>, {names.exp} ={' '}
        <span className="font-mono">{event.exp}</span>, n ={' '}
        <span className="font-mono">{event.n}</span>.
      </p>
      <div className="flex flex-col gap-1">
        <Label>
          {names.exp} in binary: bit {event.row + 1} of {event.rows.length}
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
          caption={`Square-and-multiply for ${names.formula}`}
          columns={COLUMNS}
          rows={rows}
          currentRow={event.row}
          maxHeight="24rem"
          className="min-w-0 flex-1"
        />
        <ModClock
          label="Running value"
          modulus={BigInt(event.n)}
          value={BigInt(row.after)}
          from={BigInt(row.before)}
        />
      </div>
    </div>
  );
}

/** The result of an exponentiation: after the steps (paper) or in one go (realistic). */
export function PowResultView({ event }: { event: RsaPowResultEvent }) {
  const names = NAMES[event.op];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{names.formula}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Value label={names.base} value={event.base} />
        <Value label={names.exp} value={event.exp} />
        <Value label="n" value={event.n} />
        <Value
          label={names.result}
          value={event.result}
          emphasis
          testId={`rsa-${event.op}-result`}
        />
      </div>
      {event.summary ? (
        <p className="text-fg-secondary text-sm">
          Realistic mode does this in one step: a {event.summary.digits.exp}-digit
          exponent took {event.summary.squarings} squarings and{' '}
          {event.summary.multiplications} multiplications of numbers up to{' '}
          {event.summary.digits.n} digits, giving a {event.summary.digits.result}-digit
          result.
        </p>
      ) : null}
      {event.ok !== undefined ? (
        <p
          className={cn(
            'rounded-md border-2 px-3 py-2 text-sm',
            event.ok ? 'border-ok' : 'border-danger',
          )}
        >
          {event.ok
            ? `Matches the expected ${event.expected}.`
            : `Expected ${event.expected}: no match.`}
        </p>
      ) : null}
      {event.summary ? null : (
        <ModClock
          label={names.result}
          modulus={BigInt(event.n)}
          value={BigInt(event.result)}
        />
      )}
    </div>
  );
}
