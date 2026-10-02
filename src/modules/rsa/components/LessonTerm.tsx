'use client';

import type { ReactNode } from 'react';

import type { GlossaryId } from '@/components/lesson/glossary';
import { useDeferredImport } from '@/components/state';

/**
 * The shared `<Term>` (src/components/lesson/Term.tsx), loaded right after hydration.
 *
 * `Term` brings the whole glossary with it, about 2 KB of gzipped JS, which /rsa's
 * first load can't afford under the 170 KB budget. Until it arrives (normally before
 * anyone reaches for a definition) the word is shown as plain text with the same dotted
 * underline; then it becomes the real toggletip. The word is passed as `children`, since
 * the glossary isn't there yet to supply it.
 */
const loadTerm = () => import('@/components/lesson/Term');

export function LessonTerm({ id, children }: { id: GlossaryId; children: ReactNode }) {
  const loaded = useDeferredImport(loadTerm);
  if (loaded) return <loaded.Term id={id}>{children}</loaded.Term>;
  return (
    <span className="decoration-fg-muted underline decoration-dotted decoration-1 underline-offset-[3px]">
      {children}
    </span>
  );
}
