'use client';

import { BitDiffStrip } from '@/components/blocks';
import { bytesToHex } from '@/core/bytes/hex';
import type { Sha256AvalancheEvent } from '@/core/sha256/events';

export function AvalancheView({ event }: { event: Sha256AvalancheEvent }) {
  const hex = (bytes: number[]) => bytesToHex(Uint8Array.from(bytes));
  return (
    <div className="flex flex-col gap-4">
      <BitDiffStrip
        label="Input: one bit flipped"
        a={event.a}
        b={event.b}
        showDigits
        perRow={32}
      />
      {event.stage !== 'flip' ? (
        <dl className="grid gap-1 font-mono text-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="text-fg-muted">SHA-256(original)</dt>
            <dd className="break-all">{hex(event.digestA)}</dd>
          </div>
          {event.stage !== 'hashA' ? (
            <div className="flex flex-wrap gap-2">
              <dt className="text-fg-muted">SHA-256(flipped)</dt>
              <dd className="break-all">{hex(event.digestB)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {event.stage === 'diff' ? (
        <BitDiffStrip
          label="Output: the two digests"
          a={event.digestA}
          b={event.digestB}
        />
      ) : null}
    </div>
  );
}
