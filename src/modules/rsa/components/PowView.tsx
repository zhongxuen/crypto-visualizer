import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { ModClock } from '@/components/blocks';
import { Pulse, Reveal, Travel } from '@/components/motion';
import type { RsaPowResultEvent, RsaPowStepEvent } from '@/core/rsa/events';
import { cn } from '@/lib/cn';

import { Placeholder, Value } from './parts';

const NAMES = {
  encrypt: { base: 'm', exp: 'e', result: 'c', formula: 'c = mᵉ mod n' },
  decrypt: { base: 'c', exp: 'd', result: 'm', formula: 'm = cᵈ mod n' },
  sign: { base: 'h', exp: 'd', result: 's', formula: 's = hᵈ mod n' },
  verify: { base: 's', exp: 'e', result: 'sᵉ mod n', formula: 'sᵉ mod n' },
} as const;

/** Which key each operation uses: the private one (d) or the public one (e). */
const KEY_OF = {
  encrypt: 'public',
  decrypt: 'secret',
  sign: 'secret',
  verify: 'public',
} as const;

/**
 * Square-and-multiply as a ladder (UIUX §7.2): one rung per bit of the exponent, read
 * from the top bit. The rung for this step lights, its square appears, then (on a 1 bit)
 * its multiply; the running value morphs and turns on the `ModClock`. Rungs still to come
 * are dashed. Every number is from core's trace (`rows`).
 */
export function PowStepView({ event }: { event: RsaPowStepEvent }) {
  const names = NAMES[event.op];
  const row = event.rows[event.row];
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the lit rung in view inside the ladder's own scroll box (never the page).
  useLayoutEffect(() => {
    const box = scroller.current;
    const rung = box?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!box || !rung) return;
    const top = rung.offsetTop - box.offsetTop;
    if (
      top < box.scrollTop ||
      top + rung.offsetHeight > box.scrollTop + box.clientHeight
    ) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 2 + rung.offsetHeight / 2);
    }
  }, [event.row]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        {names.formula} with {names.base} ={' '}
        <span className="font-mono">{event.base}</span>, {names.exp} ={' '}
        <span className="font-mono">{event.exp}</span> ={' '}
        <span className="font-mono">{event.expBits}</span> in binary, n ={' '}
        <span className="font-mono">{event.n}</span>.
      </p>
      {event.op === 'sign' || event.op === 'verify' ? (
        <KeyTrip op={event.op} base={event.base} trigger={event.id} />
      ) : null}
      <p className="sr-only">
        The exponent is {event.expBits} in binary; this step reads bit {event.row + 1},
        which is {row.bit}.
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <div
          ref={scroller}
          className="relative max-h-96 min-w-0 flex-1 basis-72 overflow-auto"
          tabIndex={0}
          role="region"
          aria-label={`Square-and-multiply ladder for ${names.formula}`}
        >
          <ol className="border-border-strong relative flex flex-col gap-1 border-x-2 px-2 py-1">
            {event.rows.map((r, i) => {
              const state = i < event.row ? 'done' : i === event.row ? 'current' : 'todo';
              return (
                <li
                  key={i}
                  data-rung={i}
                  data-state={state}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={cn(
                    'rounded-cell grid grid-cols-[2.25rem_1fr] items-center gap-x-3 px-2 py-1 font-mono text-sm',
                    state === 'current'
                      ? 'bg-highlight'
                      : state === 'todo'
                        ? 'text-fg-muted'
                        : 'bg-surface',
                  )}
                >
                  <span
                    className={cn(
                      'rounded-cell grid size-8 place-items-center border text-base font-bold',
                      state === 'todo'
                        ? 'border-border border-dashed'
                        : r.bit
                          ? 'bg-diff-on text-diff-on-fg border-transparent'
                          : 'border-border-strong bg-surface',
                    )}
                  >
                    <span className="sr-only">Bit {i + 1}: </span>
                    {r.bit}
                  </span>
                  {state === 'todo' ? (
                    <span className="flex flex-wrap gap-2">
                      <span className="font-sans text-xs">
                        {r.bit ? 'square, multiply' : 'square'}
                      </span>
                      <Placeholder />
                    </span>
                  ) : (
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <Step show={state === 'current'} trigger={event.id} index={0}>
                        <span className="text-fg-secondary font-sans text-xs">
                          square{' '}
                        </span>
                        {r.before}² = {r.squared}
                      </Step>
                      {r.bit ? (
                        <Step show={state === 'current'} trigger={event.id} index={10}>
                          <span className="text-fg-secondary font-sans text-xs">
                            × {names.base}{' '}
                          </span>
                          = {r.after}
                        </Step>
                      ) : (
                        <span className="text-fg-secondary font-sans text-xs">
                          bit 0: no multiply
                        </span>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Value label="Running value (mod n)" value={row.after} emphasis />
          <ModClock
            label="Running value"
            modulus={BigInt(event.n)}
            value={BigInt(row.after)}
            from={BigInt(row.before)}
          />
        </div>
      </div>
    </div>
  );
}

/** One operation on the current rung, revealed in order; other rungs are still. */
function Step({
  show,
  trigger,
  index,
  children,
}: {
  show: boolean;
  trigger: string;
  index: number;
  children: ReactNode;
}) {
  return show ? (
    <Reveal trigger={trigger} index={index}>
      {children}
    </Reveal>
  ) : (
    <span>{children}</span>
  );
}

/**
 * Signing and verifying as a trip (UIUX §7.2): the hash goes to the private key and the
 * signature comes back; verifying sends the signature through the public key, and a match
 * lights green.
 */
function KeyTrip({
  op,
  base,
  result,
  ok,
  trigger,
}: {
  op: 'sign' | 'verify';
  base: string;
  /** Not there yet while the steps run. */
  result?: string;
  ok?: boolean;
  trigger: string;
}) {
  const names = NAMES[op];
  const kind = KEY_OF[op];
  const keyId = `rsa-trip-key-${op}`;
  return (
    <div
      data-testid={`rsa-trip-${op}`}
      className="flex flex-wrap items-center gap-2 font-mono text-sm"
    >
      <span className="border-border bg-surface rounded-token border px-2 py-1">
        {names.base} = {base}
      </span>
      <span aria-hidden="true">→</span>
      <span
        id={keyId}
        className={cn(
          'rounded-token border-2 px-2 py-1 font-sans font-medium',
          kind === 'secret' ? 'border-secret text-secret' : 'border-public text-public',
        )}
      >
        <span aria-hidden="true">{kind === 'secret' ? '🔒 ' : '📡 '}</span>
        {kind === 'secret' ? 'private key d' : 'public key e'}
      </span>
      <span aria-hidden="true">→</span>
      {result === undefined ? (
        <span className="inline-flex items-center gap-1">
          {names.result} = <Placeholder />
        </span>
      ) : (
        <Travel from={keyId} trigger={trigger}>
          <span
            className={cn(
              'rounded-token bg-surface inline-block border-2 px-2 py-1 font-semibold',
              ok === undefined
                ? 'border-border-strong'
                : ok
                  ? 'border-ok'
                  : 'border-danger',
            )}
          >
            {names.result} = {result}
          </span>
        </Travel>
      )}
    </div>
  );
}

/** The result of an exponentiation: after the steps (paper) or in one go (realistic). */
export function PowResultView({ event }: { event: RsaPowResultEvent }) {
  const names = NAMES[event.op];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{names.formula}</p>
      {event.op === 'sign' || event.op === 'verify' ? (
        <KeyTrip
          op={event.op}
          base={event.base}
          result={event.result}
          ok={event.ok}
          trigger={event.id}
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Value label={names.base} value={event.base} />
        <Value label={names.exp} value={event.exp} kind={KEY_OF[event.op]} />
        <Value label="n" value={event.n} kind="public" />
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
        <Pulse trigger={event.id} className="w-full">
          <p
            data-testid={`rsa-${event.op}-check`}
            data-ok={event.ok}
            className={cn(
              'flex items-center gap-2 rounded-md border-2 px-3 py-2 text-sm',
              event.ok ? 'border-ok' : 'border-danger',
            )}
          >
            <span aria-hidden="true" className={event.ok ? 'text-ok' : 'text-danger'}>
              {event.ok ? '✓' : '✗'}
            </span>
            {event.ok
              ? `Matches the expected ${event.expected}.`
              : `Expected ${event.expected}: no match.`}
          </p>
        </Pulse>
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
