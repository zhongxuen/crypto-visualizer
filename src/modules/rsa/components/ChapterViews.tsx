import { ModClock } from '@/components/blocks';
import type {
  RsaEvent,
  RsaHashEvent,
  RsaMessageEvent,
  RsaTamperEvent,
} from '@/core/rsa/events';
import { cn } from '@/lib/cn';

import { PaddingView } from './MalleabilityStrip';
import { Value } from './parts';
import { PowResultView, PowStepView } from './PowView';

/**
 * The pictures of the encrypt, sign and malleability chapters. The page loads them with
 * those chapters' runs (`../runs`, `useDeferredImport`), so they stay out of the route's
 * first load; the keys chapter's views are static (`./StepView`).
 */
export function ChapterPicture({ event }: { event: RsaEvent }) {
  switch (event.kind) {
    case 'rsa.message':
      return <MessageView event={event} />;
    case 'rsa.powStep':
      return <PowStepView event={event} />;
    case 'rsa.powResult':
      return <PowResultView event={event} />;
    case 'rsa.hash':
      return <HashView event={event} />;
    case 'rsa.tamper':
      return <TamperView event={event} />;
    case 'rsa.padding':
      return <PaddingView scheme={event.scheme} />;
    default:
      return null;
  }
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
