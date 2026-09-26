'use client';

import { useProgress } from '@/components/state';
import { cn } from '@/lib/cn';

import type { ByteFormat } from './ByteGrid';

/** Hex or binary, as a two-button group. Controlled. */
export function HexBinToggle({
  value,
  onChange,
  className,
}: {
  value: ByteFormat;
  onChange: (value: ByteFormat) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Show bytes as"
      className={cn(
        'border-border inline-flex rounded-md border p-0.5 text-sm',
        className,
      )}
    >
      {(['hex', 'binary'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'focus-visible:outline-focus rounded-[5px] px-2.5 py-0.5 focus-visible:outline-2',
            value === option
              ? 'bg-accent text-accent-fg'
              : 'text-fg-secondary hover:text-fg',
          )}
        >
          {option === 'hex' ? 'Hex' : 'Binary'}
        </button>
      ))}
    </div>
  );
}

/** The viewer's hex / binary preference, remembered in `cv:v1`. */
export function useByteFormat(): [ByteFormat, (value: ByteFormat) => void] {
  const { progress, setPref } = useProgress();
  return [progress.prefs.bytes, (value) => setPref('bytes', value)];
}
