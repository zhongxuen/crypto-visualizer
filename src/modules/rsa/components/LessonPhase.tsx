'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The lesson rail follows the timeline: `walkthrough.mdx` splits each chapter into one
 * short `<Phase group="...">` per group of the run, and the page puts the current step's
 * group in `PhaseContext`. The paragraph for the phase on screen gets a margin mark.
 */
export const PhaseContext = createContext<string | null>(null);

export function Phase({ group, children }: { group: string; children: ReactNode }) {
  const current = useContext(PhaseContext);
  const active = current === group;
  return (
    <div
      data-phase={group}
      aria-current={active ? 'step' : undefined}
      className={cn(
        'rounded-r-md border-l-2 pl-3 transition-colors duration-(--dur-quick)',
        active ? 'border-accent bg-surface-overlay' : 'border-transparent',
      )}
    >
      {children}
    </div>
  );
}
