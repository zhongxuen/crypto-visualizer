'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * The lesson follows the timeline (UIUX §2.1 P2): the walkthrough's prose is one short
 * paragraph per phase, each wrapped in `<Phase id>` with the phase's id from core's run.
 * The page puts the current phase's id in `PhaseContext`; that paragraph is marked with a
 * tint rule and `aria-current`, and the others are muted. With no phase (the cost
 * chapter, which has no run) every paragraph reads normally.
 */
export const PhaseContext = createContext<string | null>(null);

export function Phase({ id, children }: { id: string; children: ReactNode }) {
  const current = useContext(PhaseContext);
  const active = current === id;
  return (
    <div
      data-phase={id}
      aria-current={active ? 'step' : undefined}
      className={
        active
          ? 'border-l-2 border-(--tint,var(--accent)) pl-3 transition-colors duration-(--dur-quick)'
          : current === null
            ? 'border-l-2 border-transparent pl-3'
            : 'text-fg-muted border-l-2 border-transparent pl-3 transition-colors duration-(--dur-quick)'
      }
    >
      {children}
    </div>
  );
}
