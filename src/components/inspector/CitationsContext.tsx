'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { createCitationRegistry, type CitationRegistry } from '@/core/citations/registry';

/**
 * The citations a page can show, provided by its module (through `ModuleLayout`'s
 * `citations` prop) rather than imported whole by `CitationLink`.
 *
 * The full registry is every module's titles and URLs, about 3.6 KB gzipped; a module
 * needs its own few. Importing it in `CitationLink` put all of it in every module route's
 * first load (phase 10's 170 KB budget). `tests/module-citations.test.ts` checks that each
 * module's registry holds every citation its runs emit.
 */
const CitationsContext = createContext<CitationRegistry>(createCitationRegistry([]));

export function CitationsProvider({
  citations,
  children,
}: {
  citations: CitationRegistry;
  children: ReactNode;
}) {
  return (
    <CitationsContext.Provider value={citations}>{children}</CitationsContext.Provider>
  );
}

export function useCitations(): CitationRegistry {
  return useContext(CitationsContext);
}
