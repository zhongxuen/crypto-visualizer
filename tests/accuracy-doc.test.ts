import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CITATIONS } from '@/core/citations';
import { SCENARIOS } from '@/core/scenarios';

/**
 * `docs/ACCURACY.md` is checked against the product, not trusted (phase 10, step 3;
 * modelled on Internet Visualizer's `tests/rfc-references.test.ts`).
 *
 * That file is what the "every step is correct and cited" claim rests on, and a citation
 * list kept by hand rots: a scenario picks up a new citation, nobody remembers the doc,
 * and a reviewer is reading last month's product. So the doc is asserted to name every
 * citation the scenarios actually emit.
 *
 * It checks a superset, not equality. The doc also lists citations the modules show
 * outside a scenario run (free play, the cost calculator, the described-only
 * algorithms), and requiring equality would mean deleting true rows to pass.
 *
 * It runs the scenarios rather than grepping `src/`, because a citation on an event no
 * run reaches is not a claim the product makes. The catalogue is the one
 * `tests/determinism.test.ts` uses, so a new scenario is covered here without an edit.
 */

const ACCURACY = readFileSync(join(process.cwd(), 'docs', 'ACCURACY.md'), 'utf8');

/**
 * Every citation id the doc lists: a table cell holding nothing but one code span, as in
 * `| … | \`fips197.5.1.3\` | FIPS 197 §5.1.3 |`. Cells naming a file are not ids.
 */
const DOCUMENTED = new Set(
  [...ACCURACY.matchAll(/\|\s*`([^`/]+)`\s*(?=\|)/g)].map((m) => m[1]),
);

interface Cited {
  readonly where: string;
  readonly id: string;
}

const CITED: Cited[] = SCENARIOS.flatMap((scenario) =>
  scenario.run().events.map((event) => ({ where: scenario.id, id: event.citation })),
);
const CITED_IDS = new Set(CITED.map((c) => c.id));

describe('docs/ACCURACY.md', () => {
  it('collected something to check', () => {
    // A sweep that quietly stopped finding citations would pass everything below. The
    // floors are well under the real figures (931 events, 61 ids at the time of
    // writing) and only guard against collecting nothing.
    expect(CITED.length).toBeGreaterThan(500);
    expect(CITED_IDS.size).toBeGreaterThan(40);
  });

  it('names every citation a scenario emits', () => {
    const undocumented = [...CITED_IDS]
      .filter((id) => !DOCUMENTED.has(id))
      .sort()
      .map((id) => {
        const where = CITED.find((c) => c.id === id)!.where;
        return `${id} (${CITATIONS.get(id)?.doc ?? 'unregistered'}) — cited by ${where}`;
      });
    expect(
      undocumented,
      'a scenario cites something docs/ACCURACY.md does not list. Add a row to its module table.',
    ).toEqual([]);
  });

  it('names every registered citation, and its source document', () => {
    // The registry is what the inspector can show, including outside a scenario.
    const missing = CITATIONS.all()
      .filter((c) => !DOCUMENTED.has(c.id))
      .map((c) => c.id);
    expect(missing, 'registered but not in docs/ACCURACY.md').toEqual([]);

    const docs = [...new Set(CITATIONS.all().map((c) => c.doc))];
    // Long paper titles are abbreviated in the tables; the first word (the author or
    // the body) must still appear.
    const unnamed = docs.filter((doc) => !ACCURACY.includes(doc.split(/[ ,]/)[0]));
    expect(unnamed).toEqual([]);
  });

  it('lists no citation id that does not exist', () => {
    // Every id in a table must resolve, so a renamed or removed citation can't linger.
    const stale = [...DOCUMENTED].filter((id) => !CITATIONS.has(id));
    expect(stale, 'docs/ACCURACY.md lists an id the registry does not have').toEqual([]);
  });

  it('names test files that exist', () => {
    const files = [...ACCURACY.matchAll(/`((?:tests|src)\/[^`]+\.test\.tsx?)`/g)].map(
      (m) => m[1],
    );
    expect(files.length).toBeGreaterThan(5);
    expect(files.filter((file) => !existsSync(join(process.cwd(), file)))).toEqual([]);
  });

  it('names every differential test', () => {
    const files = readdirSync(join(process.cwd(), 'tests', 'differential'))
      .filter((name) => name.endsWith('.test.ts'))
      .map((name) => `tests/differential/${name}`);
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((file) => !ACCURACY.includes(file))).toEqual([]);
  });
});
