import Link from 'next/link';

import { ModClock } from '@/components/blocks';
import type {
  DhAgreeEvent,
  DhMitmInterceptEvent,
  DhMitmKeysEvent,
  DhMitmMessageEvent,
  DhPaintEveEvent,
  DhPaintSharedEvent,
  DhParamsEvent,
  DhPrivateEvent,
  DhRealGroupsEvent,
  DhValidateEvent,
} from '@/core/dh/events';

import { Label, Swatch, Value, Verdict } from './parts';

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
        <Value label={`${event.name}^q mod p`} value={event.check} emphasis />
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
        <Value label="Alice: Bᵃ mod p" value={event.alice} emphasis />
        <Value label="Bob: Aᵇ mod p" value={event.bob} emphasis />
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
    <div className="grid gap-3 sm:grid-cols-2">
      <Value label={`${WHO[event.from]} sent ${event.name}`} value={event.original} />
      <Value
        label={`${WHO[event.to]} receives, as if it were ${event.name}`}
        value={`${event.replacement} (Mallory's ${event.replacementName})`}
        emphasis
      />
    </div>
  );
}

export function MitmKeysView({ event }: { event: DhMitmKeysEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Value
          label="Alice's secret"
          value={event.alice}
          emphasis
          testId="dh-mitm-alice"
        />
        <Value label="Mallory's, with Alice" value={event.malloryWithAlice} />
        <Value label="Mallory's, with Bob" value={event.malloryWithBob} />
        <Value label="Bob's secret" value={event.bob} emphasis testId="dh-mitm-bob" />
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

export function PaintSharedView({ event }: { event: DhPaintSharedEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-6">
        {(['alice', 'bob'] as const).map((who) => (
          <p key={who} className="flex items-center gap-2 text-sm">
            <Swatch colour={event[who]} className="size-12" />
            <span>
              {WHO[who]}’s pot <span className="font-mono">{event[who]}</span>
            </span>
          </p>
        ))}
      </div>
      <p className="text-fg-secondary text-sm">
        Recipe: {event.recipe.map((part) => `${part.parts} part ${part.name}`).join(', ')}
        .
      </p>
      <Verdict ok={event.same} testId="dh-paint-same">
        {event.same ? 'The same colour, bit for bit.' : 'The pots differ.'}
      </Verdict>
    </div>
  );
}

export function PaintEveView({ event }: { event: DhPaintEveEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-6">
        <p className="flex items-center gap-2 text-sm">
          <Swatch colour={event.colour} className="size-12" />
          <span>
            Eve’s pot <span className="font-mono">{event.colour}</span>
          </span>
        </p>
        <p className="flex items-center gap-2 text-sm">
          <Swatch colour={event.shared} className="size-12" />
          <span>
            The shared pot <span className="font-mono">{event.shared}</span>
          </span>
        </p>
      </div>
      <p className="text-fg-secondary text-sm">
        Eve’s recipe:{' '}
        {event.recipe.map((part) => `${part.parts} ${part.name}`).join(', ')}. OKLab
        distance from the shared colour: {event.distance.toFixed(3)} (about 0.02 is the
        smallest difference people notice).
      </p>
    </div>
  );
}

/** Where the paint analogy stops working. */
export function PaintLimitView() {
  return (
    <p className="border-warn bg-surface rounded-md border-2 p-3 text-sm">
      Paint mixing is an average, and an average can be undone with a little algebra. The
      real exchange replaces mixing with gˣ mod p, which nobody knows how to undo quickly
      for a large p. The next chapter does exactly that.
    </p>
  );
}
