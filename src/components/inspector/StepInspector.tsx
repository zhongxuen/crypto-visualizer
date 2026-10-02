import type { ReactNode } from 'react';

import type { EventBase } from '@/core/events/types';
import { cn } from '@/lib/cn';

import { CitationLink } from './CitationLink';

/**
 * The step's "Why?": the longer reason behind it, the source it cites, and any
 * module-specific extras (`children`). The step's headline is the caption above the
 * visual and isn't repeated here (UIUX §2.1 P4).
 */
export interface StepInspectorProps {
  event: Pick<EventBase, 'id' | 'label' | 'detail' | 'citation' | 'group'> | undefined;
  children?: ReactNode;
  className?: string;
}

export function StepInspector({ event, children, className }: StepInspectorProps) {
  return (
    <section
      aria-label="Why this step"
      className={cn(
        'border-border bg-surface flex flex-col gap-2 rounded-(--radius) border p-4',
        className,
      )}
    >
      <h2 className="font-display text-lg">Why?</h2>
      {event ? (
        <>
          {event.detail ? (
            <p className="text-fg-secondary text-sm leading-relaxed">{event.detail}</p>
          ) : null}
          {children}
          <p className="mt-1">
            <CitationLink id={event.citation} />
          </p>
        </>
      ) : (
        <p className="text-fg-muted text-sm">Nothing selected.</p>
      )}
    </section>
  );
}
