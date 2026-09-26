import type { Citation, CitationId } from './types';

/** Every citation the product can show, looked up by id. */
export interface CitationRegistry {
  get(id: CitationId): Citation | undefined;
  has(id: CitationId): boolean;
  /** All citations, in the order their sources were given. */
  all(): readonly Citation[];
}

/**
 * Join per-algorithm citation lists into one registry.
 *
 * Throws on a duplicate id or a citation without an https URL. Both are authoring
 * mistakes that should stop the app from loading, not show up later as a link to the
 * wrong document.
 */
export function createCitationRegistry(
  sources: readonly (readonly Citation[])[],
): CitationRegistry {
  const byId = new Map<CitationId, Citation>();

  for (const citation of sources.flat()) {
    if (byId.has(citation.id)) {
      throw new Error(`Duplicate citation id "${citation.id}"`);
    }
    if (!citation.url.startsWith('https://')) {
      throw new Error(
        `Citation "${citation.id}" needs an https URL, got "${citation.url}"`,
      );
    }
    byId.set(citation.id, citation);
  }

  const all = [...byId.values()];

  return {
    get: (id) => byId.get(id),
    has: (id) => byId.has(id),
    all: () => all,
  };
}
