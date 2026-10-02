import type { ReactNode } from 'react';

import { Morph } from '@/components/motion';
import { cn } from '@/lib/cn';

/** A value's name. Not upper-cased: in maths, m and M are different letters. */
export function Label({ children }: { children: ReactNode }) {
  return <span className="text-fg-muted text-xs font-medium">{children}</span>;
}

/** Who may see a value: shown with a glyph and a word as well as colour (UIUX §5.1). */
export type Visibility = 'secret' | 'public';

export function VisibilityTag({ kind }: { kind: Visibility }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        kind === 'secret' ? 'text-secret' : 'text-public',
      )}
    >
      <span aria-hidden="true">{kind === 'secret' ? '🔒' : '📡'}</span>
      {kind}
    </span>
  );
}

/**
 * A labelled integer on a read-only value card (UIUX B4): a note on the page, not a box
 * to type in. There is no input-like outline; the value that matters on this step gets
 * the highlighter instead. The number wraps anywhere, so a 155-digit n fits a phone
 * screen, and it changes with `<Morph>` (a count-up for small numbers) when the card
 * stays on screen from one step to the next.
 */
export function Value({
  label,
  value,
  emphasis = false,
  kind,
  testId,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  kind?: Visibility;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        'border-border bg-surface rounded-token flex min-w-0 flex-col gap-1 border border-l-4 px-3 py-2',
        kind === 'secret'
          ? 'border-l-secret'
          : kind === 'public'
            ? 'border-l-public'
            : 'border-l-border-strong',
      )}
    >
      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
        <Label>{label}</Label>
        {kind ? <VisibilityTag kind={kind} /> : null}
      </span>
      <p
        data-testid={testId}
        className={cn(
          'font-mono break-all',
          emphasis ? 'text-lg font-semibold' : 'text-fg-secondary text-sm',
        )}
      >
        <Morph value={value} count className={emphasis ? 'highlighter' : undefined} />
      </p>
    </div>
  );
}

/**
 * A value not computed yet: a dashed slot, so an empty row reads as "to come" rather than
 * unfinished. Screen readers hear "not yet".
 */
export function Placeholder({ className }: { className?: string }) {
  return (
    <span
      data-placeholder=""
      className={cn(
        'border-border-strong rounded-cell inline-block h-5 w-16 border border-dashed align-middle',
        className,
      )}
    >
      <span className="sr-only">not yet</span>
    </span>
  );
}

/** Digits of a decimal string, for "a 155-digit number". */
export const digitsOf = (value: string) => value.replace('-', '').length;
