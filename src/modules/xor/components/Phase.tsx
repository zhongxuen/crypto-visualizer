'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The lesson follows the timeline (UIUX §2.1 P2): `walkthrough.mdx` gives each phase of a
 * run one short paragraph, wrapped in `<Phase id="...">` with the phase id core gives
 * the group (`apply`, `ttp-crib`, ...). The module puts the phase on screen in
 * `PhaseContext`, and that paragraph is marked as the current one: a tinted rule in the
 * margin, full-strength ink and `aria-current`. The others stay readable, a shade
 * lighter, so the whole chapter can still be read top to bottom.
 */

export const PhaseContext = createContext<string | null>(null);

export function Phase({ id, children }: { id: string; children: ReactNode }) {
  const current = useContext(PhaseContext) === id;
  return (
    <div
      data-phase={id}
      aria-current={current ? 'step' : undefined}
      className={cn(
        'rounded-r-md border-l-2 pl-3 transition-colors duration-(--dur-quick)',
        current
          ? 'text-fg border-(--tint,var(--accent))'
          : 'text-fg-secondary border-border',
      )}
    >
      {children}
    </div>
  );
}
