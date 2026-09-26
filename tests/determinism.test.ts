import { describe, expect, it } from 'vitest';

import { SCENARIOS } from '@/core/scenarios';

/**
 * Aim 3, "be deterministic": same input + same seed = the same run.
 *
 * Every scenario in the catalogue runs twice and the results must be deep-equal,
 * including `undefined`-valued keys (`toStrictEqual`). Passes on an empty catalogue and
 * gains a case for every scenario a module adds.
 */
describe('scenario catalogue', () => {
  it('has unique scenario ids', () => {
    const ids = SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const scenario of SCENARIOS) {
    it(`${scenario.id} produces the same result twice`, () => {
      expect(scenario.run()).toStrictEqual(scenario.run());
    });

    it(`${scenario.id} returns a fresh object each run`, () => {
      // A run that hands back a shared object could be mutated by one caller under
      // another, which would look like non-determinism later.
      const first = scenario.run();
      expect(scenario.run()).not.toBe(first);
      expect(scenario.run().events).not.toBe(first.events);
    });

    it(`${scenario.id} has events in time order with unique ids`, () => {
      const { events } = scenario.run();
      const ids = events.map((event) => event.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (let i = 1; i < events.length; i += 1) {
        expect(events[i].at).toBeGreaterThanOrEqual(events[i - 1].at);
      }
    });
  }
});
