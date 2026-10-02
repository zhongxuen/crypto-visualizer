'use client';

import { memo } from 'react';

import type { AesGcmEvent } from '@/core/aes/events';
import { cn } from '@/lib/cn';

const PARTS: { stage: AesGcmEvent['stage']; title: string; body: string }[] = [
  { stage: 'ctr', title: 'GCTR', body: 'CTR-mode encryption from J0 + 1' },
  {
    stage: 'ghash',
    title: 'GHASH',
    body: 'multiply-by-H over header, ciphertext, lengths',
  },
  { stage: 'tag', title: 'Tag', body: 'GHASH ⊕ AES_K(J0)' },
  { stage: 'nonce', title: 'Nonce rule', body: 'one IV, one message, per key' },
];

/**
 * GCM described, not computed (SP 800-38D). The four parts as a row of boxes, the one
 * this step is about ringed. No values are shown on purpose: v1 doesn't compute GHASH.
 */
export const GcmView = memo(function GcmView({ event }: { event: AesGcmEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <ol aria-label="The parts of GCM" className="grid gap-2 sm:grid-cols-4">
        {PARTS.map((part) => {
          const current = part.stage === event.stage || event.stage === 'overview';
          return (
            <li
              key={part.stage}
              aria-current={part.stage === event.stage ? 'step' : undefined}
              className={cn(
                'bg-surface rounded-md px-3 py-2 text-sm',
                current ? 'border-accent border-2' : 'border-border border',
              )}
            >
              <span className="block font-semibold">{part.title}</span>
              <span className="text-fg-secondary">{part.body}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-fg-muted text-sm">
        Described only: this version computes no GHASH and no tag. The TLS 1.3 module
        (phase 2) does GCM with real values.
      </p>
    </div>
  );
});
