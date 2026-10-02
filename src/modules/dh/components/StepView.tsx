import { ArrowRight, Scissors } from 'lucide-react';
import Link from 'next/link';

import { ModClock } from '@/components/blocks';
import { Pulse } from '@/components/motion';
import type {
  DhAgreeEvent,
  DhMitmInterceptEvent,
  DhMitmKeysEvent,
  DhMitmMessageEvent,
  DhParamsEvent,
  DhPrivateEvent,
  DhRealGroupsEvent,
  DhValidateEvent,
} from '@/core/dh/events';
import { cn } from '@/lib/cn';

import { PAIR } from './Lanes';
import { Label, Value, Verdict } from './parts';

const WHO = { alice: 'Alice', bob: 'Bob', mallory: 'Mallory' } as const;

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: number) =>
  String(n)
    .split('')
    .map((d) => SUPERSCRIPT[Number(d)])
    .join('');

export function ParamsView({ event }: { event: DhParamsEvent }) {
  const toy = event.groupKind === 'toy';
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Value
          label={
            toy ? 'p, a safe prime' : `p (${event.bits} bits, ${event.digits} digits)`
          }
          value={event.p}
          emphasis
        />
        <Value label="q = (p − 1) / 2, also prime" value={event.q} />
        <Value label="g, the generator" value={event.g} />
        <Value label="g^q mod p (must be 1)" value={event.gq} />
      </div>
      {event.subgroup ? (
        <div className="flex flex-col gap-2">
          <Label>The powers of g mod p: the subgroup of order q = {event.q}</Label>
          <ol aria-label="Powers of g mod p" className="flex flex-wrap gap-1.5">
            {event.subgroup.map((v, i) => (
              <li
                key={i}
                className="border-border bg-surface rounded-md border px-2 py-1 font-mono text-sm"
              >
                g{sup(i)} = {v}
              </li>
            ))}
            <li className="text-fg-muted px-2 py-1 font-mono text-sm">
              g{sup(event.subgroup.length)} = 1 again
            </li>
          </ol>
          <ModClock
            label="Numbers mod p"
            modulus={BigInt(event.p)}
            value={BigInt(event.g)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function PrivateView({ event }: { event: DhPrivateEvent }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Value
        label={`${WHO[event.actor]}'s private ${event.name}`}
        value={event.value}
        emphasis
        changes
        testId={`dh-private-${event.name}`}
      />
      <Value label="Allowed range" value={`${event.min} to ${event.max}`} />
    </div>
  );
}

export function ValidateView({ event }: { event: DhValidateEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Value label={`${event.name}, as received`} value={event.value} />
        <Value label="q" value={event.q} />
        <Value label={`${event.name}^q mod p`} value={event.check} emphasis changes />
      </div>
      <Verdict ok={event.ok}>
        {event.ok
          ? `${event.name} is between 2 and p − 2 and in the subgroup: ${WHO[event.actor]} accepts it.`
          : `${event.name} fails the check: ${WHO[event.actor]} refuses it.`}
      </Verdict>
    </div>
  );
}

export function AgreeView({ event }: { event: DhAgreeEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Value label="Alice: Bᵃ mod p" value={event.alice} emphasis changes />
        <Value label="Bob: Aᵇ mod p" value={event.bob} emphasis changes />
      </div>
      <Verdict ok={event.same} testId="dh-agree">
        {event.same ? 'The same number on both sides.' : 'The two secrets differ.'}
      </Verdict>
    </div>
  );
}

export function RealGroupsView({ event }: { event: DhRealGroupsEvent }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {event.groups.map((g) => (
        <li
          key={g.name}
          className="border-border bg-surface rounded-md border p-3 text-sm"
        >
          <p className="font-semibold">
            {g.name} ({g.doc})
          </p>
          <p className="text-fg-secondary">
            p has {g.bits} bits: {g.digits} decimal digits.
          </p>
        </li>
      ))}
    </ul>
  );
}

export function X25519View() {
  return (
    <div className="border-border bg-surface rounded-md border p-3 text-sm">
      <p className="font-semibold">X25519 (RFC 7748): described, not stepped</p>
      <p className="text-fg-secondary">
        32-byte private key, 32-byte public key, 32-byte shared secret. It is stepped with
        real values in the TLS 1.3 module (phase 2).
      </p>
    </div>
  );
}

export function InterceptView({ event }: { event: DhMitmInterceptEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <ol
        aria-label={`What happens to ${event.name}`}
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <li className="border-public rounded-md border px-2 py-1">
          {WHO[event.from]} sends {event.name} ={' '}
          <span className="font-mono">{event.original}</span>
        </li>
        <li aria-hidden="true">
          <ArrowRight className="text-fg-muted size-4" />
        </li>
        <li className="border-warn flex items-center gap-1 rounded-md border-2 px-2 py-1">
          <Scissors aria-hidden="true" className="size-3.5" />
          Mallory keeps it
        </li>
        <li aria-hidden="true">
          <ArrowRight className="text-fg-muted size-4" />
        </li>
        <li className="border-warn rounded-md border-2 border-dotted px-2 py-1">
          {WHO[event.to]} gets {event.replacementName} ={' '}
          <span className="font-mono">{event.replacement}</span>, labelled “{event.name}”
        </li>
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <Value label={`${WHO[event.from]} sent ${event.name}`} value={event.original} />
        <Value
          label={`${WHO[event.to]} receives, as if it were ${event.name}`}
          value={`${event.replacement} (Mallory's ${event.replacementName})`}
          emphasis
          changes
        />
      </div>
    </div>
  );
}

/** One secret, framed in its pair's colour and glyph (the lanes use the same pair). */
function PairValue({
  pair,
  label,
  value,
  testId,
}: {
  pair: keyof typeof PAIR;
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label>
        <span aria-hidden="true">{PAIR[pair].glyph} </span>
        {label}
        <span className="sr-only"> ({PAIR[pair].words})</span>
      </Label>
      <p
        data-testid={testId}
        className={cn(
          'bg-surface rounded-md px-3 py-2 font-mono text-sm break-all',
          PAIR[pair].border,
        )}
      >
        <Pulse trigger={value}>{value}</Pulse>
      </p>
    </div>
  );
}

export function MitmKeysView({ event }: { event: DhMitmKeysEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PairValue
          pair="alice"
          label="Alice's secret"
          value={event.alice}
          testId="dh-mitm-alice"
        />
        <PairValue
          pair="alice"
          label="Mallory's, with Alice"
          value={event.malloryWithAlice}
        />
        <PairValue pair="bob" label="Mallory's, with Bob" value={event.malloryWithBob} />
        <PairValue
          pair="bob"
          label="Bob's secret"
          value={event.bob}
          testId="dh-mitm-bob"
        />
      </div>
      <Verdict ok={event.same}>
        {event.same
          ? 'Alice and Bob agree.'
          : 'Alice and Bob hold different secrets, and Mallory holds both of them.'}
      </Verdict>
    </div>
  );
}

export function MitmMessageView({ event }: { event: DhMitmMessageEvent }) {
  const encrypt = event.action === 'encrypt';
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Value label={encrypt ? 'Message m' : 'Ciphertext c'} value={event.input} />
      <Value label={`${WHO[event.actor]}'s key s`} value={event.key} />
      <Value
        label={encrypt ? 'c = m · s mod p' : 'm = c · s⁻¹ mod p'}
        value={event.output}
        emphasis
        changes
      />
    </div>
  );
}

export function MitmFixView() {
  return (
    <div className="border-ok bg-surface flex flex-col gap-2 rounded-md border-2 p-3 text-sm">
      <p className="font-semibold">Sign the key shares</p>
      <p>
        Bob signs B with his private key; Alice checks the signature with his public key.
        Mallory can make shares, but not Bob’s signature on them.
      </p>
      <p>
        See{' '}
        <Link className="text-accent underline underline-offset-2" href="/rsa">
          how RSA signing works
        </Link>{' '}
        and{' '}
        <Link className="text-accent underline underline-offset-2" href="/#module-tls">
          how TLS 1.3 puts it together
        </Link>
        .
      </p>
    </div>
  );
}
