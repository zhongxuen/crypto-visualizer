'use client';

import { ExternalLink } from 'lucide-react';

import type { CitationId } from '@/core/citations/types';
import { cn } from '@/lib/cn';

import { useCitations } from './CitationsContext';

/**
 * A link to the exact section of the standard a step comes from, looked up in the page's
 * registry (`CitationsProvider`). An unknown id (which `tests/citations.test.ts` and
 * `tests/module-citations.test.ts` should make impossible) renders as plain text, never
 * a broken link.
 */
export function CitationLink({ id, className }: { id: CitationId; className?: string }) {
  const citation = useCitations().get(id);
  if (!citation) {
    return <span className={cn('text-fg-muted text-sm', className)}>Source: {id}</span>;
  }
  const where = citation.section ? `${citation.doc} §${citation.section}` : citation.doc;

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'border-border bg-surface-overlay hover:border-border-strong focus-visible:outline-focus inline-flex max-w-full items-baseline gap-1.5 rounded-md border px-2 py-1 text-xs leading-snug focus-visible:outline-2',
        className,
      )}
    >
      <span className="text-accent shrink-0 font-mono font-medium">{where}</span>
      <span className="sr-only">:</span>{' '}
      <span className="text-fg-secondary min-w-0">{citation.title}</span>{' '}
      <ExternalLink
        aria-hidden="true"
        className="text-fg-muted size-3 shrink-0 self-center"
      />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
