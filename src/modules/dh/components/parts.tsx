import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Not uppercased: in Diffie-Hellman a (private) and A (public) are different numbers. */
export function Label({ children }: { children: ReactNode }) {
  return <span className="text-fg-muted text-xs font-medium">{children}</span>;
}

/** A labelled integer, wrapping anywhere so a 617-digit number fits a phone screen. */
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
          'bg-surface rounded-md border px-3 py-2 font-mono text-sm break-all',
          emphasis ? 'border-accent border-2' : 'border-border',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** A pot of paint. The colour is decoration: its hex code is always printed beside it. */
export function Swatch({ colour, className }: { colour: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'border-border-strong inline-block size-8 shrink-0 rounded-t-sm rounded-b-xl border-2',
        className,
      )}
      style={{ backgroundColor: colour }}
    />
  );
}

/** A pass/fail line. */
export function Verdict({
  ok,
  children,
  testId,
}: {
  ok: boolean;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <p
      data-testid={testId}
      className={cn(
        'rounded-md border-2 px-3 py-2 text-sm',
        ok ? 'border-ok' : 'border-danger',
      )}
    >
      {children}
    </p>
  );
}
