'use client';

import type { AesShareState } from '@/core/aes/state';
import { AES_MODES } from '@/core/aes/share';
import { cn } from '@/lib/cn';

import { MODE_NAMES } from './modeNames';

type Mode = AesShareState['input']['mode'];

/** ECB, CBC or CTR, above the modes chapter's picture. Loads with that chapter. */
export function ModePicker({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div role="group" aria-label="Block cipher mode" className="flex flex-wrap gap-1.5">
      {AES_MODES.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={m === value}
          onClick={() => onChange(m)}
          className={cn(
            'focus-visible:outline-focus min-h-target rounded-md border px-3 py-1 text-sm focus-visible:outline-2 md:min-h-0',
            m === value
              ? 'border-accent bg-accent text-accent-fg font-medium'
              : 'border-border bg-surface text-fg-secondary hover:text-fg',
          )}
        >
          {MODE_NAMES[m]}
        </button>
      ))}
    </div>
  );
}
