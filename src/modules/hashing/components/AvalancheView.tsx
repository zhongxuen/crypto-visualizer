'use client';

import { diffBits } from '@/components/blocks';
import { useStepTransition, Wave } from '@/components/motion';
import { bytesToHex } from '@/core/bytes/hex';
import type { Sha256AvalancheEvent } from '@/core/sha256/events';
import { cn } from '@/lib/cn';

/**
 * The avalanche chapter (UIUX §7.2, module 2): the flipped input bit pulses, the two
 * digests are compared character by character, and the 256 output bits fill in with a
 * <Wave>. A flipped bit is a filled square and an unchanged one a hollow outline, as in
 * the shared `BitDiffStrip`, so the difference never rests on colour alone.
 */

const BIT = {
  flipped: 'bg-diff-on text-diff-on-fg',
  same: 'border-diff-off text-fg-muted border',
};

function BitStrip({
  label,
  a,
  b,
  digits = false,
  wave,
  pulse = false,
}: {
  label: string;
  a: readonly number[];
  b: readonly number[];
  /** Print each bit of `b` in its square (the short input). */
  digits?: boolean;
  /** Fill the squares in a wave when this changes. */
  wave?: string;
  /** Pulse the flipped bits (the step that flips one). */
  pulse?: boolean;
}) {
  const { animate } = useStepTransition();
  const { bits, flipped } = diffBits(a, b);
  const summary = `${flipped} of ${bits.length} bits differ (${((flipped / bits.length) * 100).toFixed(1)}%)`;
  const squares = bits.map((bit, i) => (
    <span
      key={i}
      data-flipped={bit.flipped || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-[2px] font-mono',
        digits ? 'size-4 text-[0.6rem]' : 'size-2 leading-none sm:size-2.5',
        digits && i % 8 === 0 && i !== 0 && 'ml-1',
        bit.flipped ? BIT.flipped : BIT.same,
        bit.flipped && pulse && animate && 'motion-pulse',
      )}
    >
      {digits ? bit.value : null}
    </span>
  ));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono" data-testid="bit-diff-summary">
          {summary}
        </span>
      </figcaption>
      <div role="img" aria-label={`${label}: ${summary}`}>
        {wave === undefined ? (
          <div className="flex flex-wrap gap-px">{squares}</div>
        ) : (
          <Wave
            trigger={wave}
            stagger={2}
            className="grid w-fit grid-cols-32 gap-px xl:grid-cols-64"
          >
            {squares}
          </Wave>
        )}
      </div>
    </figure>
  );
}

/** One digest as 64 hex characters, the ones that differ from `other` marked. */
function Digest({
  name,
  digest,
  other,
}: {
  name: string;
  digest: readonly number[];
  other?: readonly number[];
}) {
  const text = bytesToHex(Uint8Array.from(digest));
  const against = other ? bytesToHex(Uint8Array.from(other)) : null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-fg-muted text-xs">{name}</dt>
      <dd className="font-mono text-sm break-all">
        {against === null
          ? text
          : [...text].map((char, i) =>
              char === against[i] ? (
                char
              ) : (
                <mark
                  key={i}
                  data-diff=""
                  className="bg-highlight text-fg rounded-[2px] underline decoration-2 underline-offset-2"
                >
                  {char}
                </mark>
              ),
            )}
      </dd>
    </div>
  );
}

export function AvalancheView({ event }: { event: Sha256AvalancheEvent }) {
  const diff = event.stage === 'diff';
  let differing = 0;
  if (diff) {
    const a = bytesToHex(Uint8Array.from(event.digestA));
    const b = bytesToHex(Uint8Array.from(event.digestB));
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) differing += 1;
  }
  return (
    <div className="flex flex-col gap-4">
      <BitStrip
        label="Input: one bit flipped"
        a={event.a}
        b={event.b}
        digits
        pulse={event.stage === 'flip'}
      />
      {event.stage !== 'flip' ? (
        <dl className="flex flex-col gap-2">
          <Digest
            name="SHA-256(original)"
            digest={event.digestA}
            other={diff ? event.digestB : undefined}
          />
          {event.stage !== 'hashA' ? (
            <Digest
              name="SHA-256(flipped)"
              digest={event.digestB}
              other={diff ? event.digestA : undefined}
            />
          ) : null}
        </dl>
      ) : null}
      {diff ? (
        <>
          <p className="text-sm" data-testid="hex-diff-summary">
            <mark className="bg-highlight text-fg rounded-[2px] px-0.5 underline decoration-2 underline-offset-2">
              Marked
            </mark>{' '}
            characters differ: {differing} of 64 hex characters. If the digests were
            unrelated, about 60 would (15 in 16).
          </p>
          <BitStrip
            label="Output: the two digests"
            a={event.digestA}
            b={event.digestB}
            wave={event.id}
          />
        </>
      ) : null}
    </div>
  );
}
