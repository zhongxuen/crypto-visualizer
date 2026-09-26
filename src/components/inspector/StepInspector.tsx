import type { ReactNode } from 'react';

import type { EventBase } from '@/core/events/types';
import { cn } from '@/lib/cn';

import { CitationLink } from './CitationLink';

/**
 * The current step in words: its label, the longer detail, the source it cites, and
 * any module-specific extras (`children`).
 */
export interface StepInspectorProps {
  event: Pick<EventBase, 'id' | 'label' | 'detail' | 'citation' | 'group'> | undefined;
  children?: ReactNode;
  className?: string;
}

export function StepInspector({ event, children, className }: StepInspectorProps) {
  return (
    <section
      aria-label="This step"
      className={cn(
        'border-border bg-surface flex flex-col gap-2 rounded-lg border p-4',
        className,
      )}
    >
      <h2 className="text-fg-muted text-xs font-semibold tracking-wide uppercase">
        This step
      </h2>
      {event ? (
        <>
          {event.group ? <p className="text-fg-muted text-xs">{event.group}</p> : null}
          <p className="font-medium">{event.label}</p>
          {event.detail ? (
            <p className="text-fg-secondary text-sm leading-relaxed">{event.detail}</p>
          ) : null}
          {children}
          <p className="border-border mt-1 border-t pt-2">
            <span className="text-fg-muted mr-1 text-xs">Source</span>
            <CitationLink id={event.citation} />
          </p>
        </>
      ) : (
        <p className="text-fg-muted text-sm">Nothing selected.</p>
      )}
    </section>
  );
}
