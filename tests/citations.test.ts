import { describe, expect, it } from 'vitest';

import { CITATIONS } from '@/core/citations';
import { SCENARIOS } from '@/core/scenarios';

/**
 * Aims 2 and 4: every step names the text that defines it, and that name resolves.
 *
 * Passes on an empty catalogue and gains a case for every scenario a module adds.
 */
describe('citation registry', () => {
  it('gives every citation a title and an https URL', () => {
    for (const citation of CITATIONS.all()) {
      expect(citation.title, citation.id).not.toBe('');
      expect(() => new URL(citation.url), citation.id).not.toThrow();
      expect(new URL(citation.url).protocol, citation.id).toBe('https:');
    }
  });
});

describe('scenario citations', () => {
  // One test over the whole catalogue rather than one per scenario, so it still exists
  // (and passes) while the catalogue is empty. The failure lists every unresolved event.
  it('every event in every scenario cites a registered citation', () => {
    const missing = SCENARIOS.flatMap((scenario) =>
      scenario
        .run()
        .events.filter((event) => !CITATIONS.has(event.citation))
        .map((event) => `${scenario.id}: ${event.id} -> ${event.citation}`),
    );
    expect(missing).toEqual([]);
  });
});
