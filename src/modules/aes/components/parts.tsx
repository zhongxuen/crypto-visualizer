import type { ReactNode } from 'react';

import { bytesToHex } from '@/core/bytes/hex';

export const hex = (bytes: ArrayLike<number>) => bytesToHex(Uint8Array.from(bytes));
export const hex2 = (byte: number) => byte.toString(16).padStart(2, '0');
export const hex32 = (word: number) => word.toString(16).padStart(8, '0');

/** The four row names of a 4×4 state (FIPS 197 §3.4). */
export const ROW_LABELS = ['row 0', 'row 1', 'row 2', 'row 3'] as const;

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

/** A labelled value in a box, for a result the step is about. */
export function ResultBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <p className="border-accent bg-surface rounded-md border-2 px-3 py-2 font-mono text-sm break-all">
        {value}
      </p>
    </div>
  );
}

/** An operator between two grids: ⊕, =, →. */
export function Op({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="text-fg-muted self-center font-mono text-xl">
      {children}
    </span>
  );
}
