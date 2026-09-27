import type { RsaActor, RsaEvent } from '@/core/rsa/events';
import { cn } from '@/lib/cn';

import { Value } from './parts';

/**
 * The malleability attack as three actors side by side. Each column lists what that
 * actor has done up to the current step; the actor acting now is outlined.
 */

const ACTORS: { id: RsaActor; title: string; blurb: string }[] = [
  { id: 'sender', title: 'Sender', blurb: 'Has the public key (n, e).' },
  { id: 'attacker', title: 'Attacker', blurb: 'Sees and changes traffic. Has (n, e).' },
  { id: 'receiver', title: 'Receiver', blurb: 'Owns the private key d.' },
];

function lines(event: RsaEvent): { label: string; value: string; key?: boolean }[] {
  switch (event.kind) {
    case 'rsa.mallSend':
      return [
        { label: 'm', value: event.m },
        { label: 'c = mᵉ mod n (sent)', value: event.c, key: true },
      ];
    case 'rsa.mallFactor':
      return [{ label: `${event.k}ᵉ mod n`, value: event.ke }];
    case 'rsa.mallForge':
      return [
        { label: `c′ = c × ${event.ke} mod n (sent)`, value: event.forged, key: true },
      ];
    case 'rsa.mallReceive':
      return [
        { label: 'c′ᵈ mod n', value: event.recovered, key: true },
        { label: 'which is 2 × m mod n', value: event.km },
      ];
    case 'rsa.cubeRoot':
      return [
        { label: `Small e: c = ${event.m}³`, value: event.c },
        { label: '∛c, no key needed', value: event.root, key: true },
      ];
    default:
      return [];
  }
}

export function MalleabilityStrip({
  events,
  index,
}: {
  events: readonly RsaEvent[];
  index: number;
}) {
  const current = events[index];
  const acting = current && 'actor' in current ? current.actor : null;
  const seen = events.slice(0, index + 1);

  return (
    <ol aria-label="Sender, attacker and receiver" className="grid gap-3 md:grid-cols-3">
      {ACTORS.map((actor) => {
        const mine = seen.filter((e) => 'actor' in e && e.actor === actor.id);
        const active = acting === actor.id;
        return (
          <li
            key={actor.id}
            aria-current={active ? 'step' : undefined}
            aria-labelledby={`rsa-actor-${actor.id}`}
            className={cn(
              'bg-surface flex min-w-0 flex-col gap-2 rounded-lg border p-3',
              active ? 'border-accent border-2' : 'border-border',
            )}
          >
            <h2 id={`rsa-actor-${actor.id}`} className="font-semibold">
              {actor.title}
            </h2>
            <p className="text-fg-muted text-xs">{actor.blurb}</p>
            {mine.length === 0 ? <p className="text-fg-muted text-sm">Waiting.</p> : null}
            {mine.flatMap((event) =>
              lines(event).map((line) => (
                <Value
                  key={`${event.id}-${line.label}`}
                  label={line.label}
                  value={line.value}
                  emphasis={line.key && event === current}
                />
              )),
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** OAEP and PSS, described. */
export function PaddingView({ scheme }: { scheme: 'oaep' | 'pss' }) {
  return (
    <div className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="font-semibold">
        {scheme === 'oaep' ? 'RSAES-OAEP (encryption)' : 'RSASSA-PSS (signatures)'}
      </h2>
      <p className="text-sm">
        Randomised, structured padding is added before the RSA step, so the number that
        gets exponentiated is never the bare message or hash.
      </p>
      <ul className="list-disc pl-5 text-sm">
        <li>Random: the same input gives a different result every time.</li>
        <li>Full size: the padded number is nearly as big as n, so no small-m roots.</li>
        <li>
          Checked: a multiplied or tampered value fails the padding check and is rejected.
        </li>
      </ul>
      <p className="text-fg-muted text-xs">
        Described only; not computed in this module.
      </p>
    </div>
  );
}
