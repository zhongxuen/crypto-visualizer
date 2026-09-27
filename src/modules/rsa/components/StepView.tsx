import { ModClock } from '@/components/blocks';
import type {
  RsaHashEvent,
  RsaKeyPairEvent,
  RsaMessageEvent,
  RsaModulusEvent,
  RsaPrimeEvent,
  RsaPrivateEvent,
  RsaTamperEvent,
} from '@/core/rsa/events';
import { cn } from '@/lib/cn';

import { Value } from './parts';

export function PrimeView({ event }: { event: RsaPrimeEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <Value label={`${event.which} (${event.bits} bits)`} value={event.value} emphasis />
      <p className="text-fg-secondary text-sm">
        {event.test === 'trial'
          ? `Trial division: none of 2, 3, 5, … up to ⌊√${event.which}⌋ = ${event.checkedUpTo} divides it.`
          : `Miller-Rabin: ${event.rounds} random bases, all passed. Found after ${event.candidates} odd candidates.`}
      </p>
    </div>
  );
}

export function ModulusView({ event }: { event: RsaModulusEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Value label="p" value={event.p} />
        <Value label="q" value={event.q} />
        <Value label={`n = p × q (${event.bits} bits)`} value={event.n} emphasis />
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
      <Value label="d = t mod φ(n)" value={event.d} emphasis testId="rsa-d" />
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
        <h2 className="font-semibold">Public key: anyone may have it</h2>
        <Value label={`n (${event.bits} bits)`} value={event.n} />
        <Value label="e" value={event.e} />
      </section>
      <section aria-label="Private key" className="flex flex-col gap-2">
        <h2 className="font-semibold">Private key: only the owner</h2>
        <Value label="d" value={event.d} emphasis />
        <Value label="p, q" value={`${event.p}, ${event.q}`} />
        <Value label="φ(n)" value={event.phi} />
        <p className="text-fg-muted text-xs">
          Keys here come from a seeded, non-cryptographic generator and are far too small.
          Display only.
        </p>
      </section>
    </div>
  );
}

export function MessageView({ event }: { event: RsaMessageEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Value label="m" value={event.m} emphasis />
        <Value label="n" value={event.n} />
      </div>
      {event.n.length <= 12 ? (
        <ModClock label="m" modulus={BigInt(event.n)} value={BigInt(event.m)} />
      ) : null}
    </div>
  );
}

export function HashView({ event }: { event: RsaHashEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <Value label="Message" value={event.text} />
      <Value label="SHA-256 digest (hex)" value={event.digestHex} />
      <Value label="Digest as a number" value={event.digest} />
      <Value
        label={event.reduced ? 'h = digest mod n (toy shortcut)' : 'h = digest'}
        value={event.h}
        emphasis
      />
    </div>
  );
}

export function TamperView({ event }: { event: RsaTamperEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <Value label="Changed message" value={event.text} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Value label="Its h" value={event.h} />
        <Value label="sᵉ mod n from the signature" value={event.recovered} />
      </div>
      <p
        className={cn(
          'rounded-md border-2 px-3 py-2 text-sm',
          event.ok ? 'border-warn' : 'border-ok',
        )}
      >
        {event.ok
          ? 'They collide, so the signature wrongly passes: the toy reduction mod n.'
          : 'They differ, so the signature is rejected for the changed message.'}
      </p>
    </div>
  );
}
