'use client';

import { useId, type ReactNode } from 'react';

import { Travel } from '@/components/motion';
import { bytesToHex } from '@/core/bytes/hex';
import type { HmacEvent } from '@/core/hmac/events';
import { cn } from '@/lib/cn';

/**
 * HMAC as two lanes (UIUX §7.2, module 2): the inner lane hashes (K0 ⊕ ipad) ‖ message,
 * the outer lane hashes (K0 ⊕ opad) ‖ inner hash, and the inner hash travels across into
 * the outer lane. Boxes the run hasn't reached yet are dashed placeholders; the step on
 * screen is highlighted. Every value is one the run's events already hold.
 */

type BoxState = 'future' | 'done' | 'now';

const BOX: Record<BoxState, string> = {
  future: 'border-border text-fg-muted border border-dashed',
  done: 'border-border-strong bg-surface border',
  now: 'border-accent bg-highlight border-2',
};

const short = (bytes: readonly number[]) =>
  `${bytesToHex(Uint8Array.from(bytes.slice(0, 4)))}…`;

function Box({
  title,
  size,
  value,
  state,
  id,
  children,
}: {
  title: string;
  size: string;
  value?: readonly number[];
  state: BoxState;
  id?: string;
  children?: (text: ReactNode) => ReactNode;
}) {
  const text =
    state === 'future' || !value ? (
      <>
        <span aria-hidden="true">?</span>
        <span className="sr-only">not yet</span>
      </>
    ) : (
      short(value)
    );
  return (
    <span
      id={id}
      data-box={state}
      className={cn(
        'rounded-cell flex min-w-0 flex-col px-2 py-1 text-xs leading-tight break-words',
        BOX[state],
      )}
    >
      <span className="font-medium">{title}</span>
      <span className="font-mono tabular-nums">{children ? children(text) : text}</span>
      <span className="text-fg-muted">{size}</span>
    </span>
  );
}

/** Label, box ‖ box → box: the boxes share the width, so a lane never wraps. */
const LANE =
  'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]';

function Op({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="text-fg-muted self-center font-mono text-sm">
      {children}
    </span>
  );
}

export function HmacLanes({
  events,
  index,
}: {
  events: readonly HmacEvent[];
  index: number;
}) {
  const innerId = useId();
  const at = (id: string) => events.findIndex((e) => e.id === id);
  const find = <K extends HmacEvent['kind']>(id: string, kind: K) => {
    const event = events.find((e) => e.id === id);
    return event?.kind === kind ? (event as Extract<HmacEvent, { kind: K }>) : undefined;
  };
  const naive = find('hmac.naive', 'hmac.naive');
  const ipad = find('hmac.ipad', 'hmac.pad');
  const inner = find('hmac.inner', 'hmac.hash');
  const opad = find('hmac.opad', 'hmac.pad');
  const outer = find('hmac.outer', 'hmac.hash');
  if (!naive || !ipad || !inner || !opad || !outer) return null;

  const current = events[index]?.id;
  const state = (reachedAt: string, nowOn: string[]): BoxState =>
    current !== undefined && nowOn.includes(current)
      ? 'now'
      : index >= at(reachedAt)
        ? 'done'
        : 'future';
  const travelled = index >= at('hmac.opad');

  return (
    <figure className="flex flex-col gap-2" aria-label="HMAC's two lanes">
      <div role="group" aria-label="Inner lane" className={LANE}>
        <span className="text-fg-secondary col-span-full text-xs font-semibold tracking-wide uppercase sm:col-span-1 sm:self-center">
          Inner
        </span>
        <Box
          title="K0 ⊕ ipad"
          size="64 bytes"
          value={ipad.padded}
          state={state('hmac.ipad', ['hmac.ipad'])}
        />
        <Op>‖</Op>
        <Box
          title="message"
          size={`${naive.message.length} bytes`}
          value={naive.message}
          state={state('hmac.ipad', ['hmac.inner'])}
        />
        <Op>
          →<span className="hidden sm:inline"> SHA-256 →</span>
        </Op>
        <Box
          id={innerId}
          title="inner hash"
          size="32 bytes"
          value={inner.digest}
          state={state('hmac.inner', ['hmac.inner'])}
        />
      </div>
      <div role="group" aria-label="Outer lane" className={LANE}>
        <span className="text-fg-secondary col-span-full text-xs font-semibold tracking-wide uppercase sm:col-span-1 sm:self-center">
          Outer
        </span>
        <Box
          title="K0 ⊕ opad"
          size="64 bytes"
          value={opad.padded}
          state={state('hmac.opad', ['hmac.opad'])}
        />
        <Op>‖</Op>
        <Box
          title="inner hash"
          size="32 bytes"
          value={inner.digest}
          state={state('hmac.opad', ['hmac.opad', 'hmac.outer'])}
        >
          {(text) => (
            <Travel from={innerId} trigger={travelled ? 'in' : 'out'}>
              {text}
            </Travel>
          )}
        </Box>
        <Op>
          →<span className="hidden sm:inline"> SHA-256 →</span>
        </Op>
        <Box
          title="outer hash = tag"
          size="32 bytes"
          value={outer.digest}
          state={state('hmac.outer', ['hmac.outer', 'hmac.tag'])}
        />
      </div>
    </figure>
  );
}
