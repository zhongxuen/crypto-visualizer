import type { ReactNode } from 'react';

import { Morph, Pulse } from '@/components/motion';
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
  changes = false,
  testId,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  /** The value replaces last step's: its changed digits flip, and the card pulses. */
  changes?: boolean;
  testId?: string;
}) {
  const card = (
    <p
      data-testid={testId}
      className={cn(
        'bg-surface rounded-md px-3 py-2 font-mono text-sm break-all',
        emphasis ? 'border-accent border-2' : 'border-border border',
      )}
    >
      {changes ? (
        <Pulse trigger={value}>
          <Morph value={value} />
        </Pulse>
      ) : (
        value
      )}
    </p>
  );
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label>{label}</Label>
      {card}
    </div>
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
