import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

/** A labelled integer, wrapping anywhere so a 155-digit number fits a phone screen. */
export function Value({
  label,
  value,
  emphasis = false,
  testId,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label>{label}</Label>
      <p
        data-testid={testId}
        className={cn(
          'bg-surface rounded-md px-3 py-2 font-mono text-sm break-all',
          emphasis ? 'border-accent border-2' : 'border-border border',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Digits of a decimal string, for "a 155-digit number". */
export const digitsOf = (value: string) => value.replace('-', '').length;
