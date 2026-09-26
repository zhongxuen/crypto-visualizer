import { ExternalLink } from 'lucide-react';

import { CITATIONS, type CitationId } from '@/core/citations';
import { cn } from '@/lib/cn';

/**
 * A link to the exact section of the standard a step comes from. An unknown id (which
 * `tests/citations.test.ts` should make impossible) renders as plain text, never a
 * broken link.
 */
export function CitationLink({ id, className }: { id: CitationId; className?: string }) {
  const citation = CITATIONS.get(id);
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
        'text-accent focus-visible:outline-focus inline-flex items-center gap-1 rounded-sm text-sm underline underline-offset-2 focus-visible:outline-2',
        className,
      )}
    >
      <span>
        {where}: {citation.title}
      </span>
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
