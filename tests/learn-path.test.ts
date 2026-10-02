import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GLOSSARY } from '../src/components/lesson/glossary';
import { SHARE_STATES, shareStateFromSearch } from '../src/core/state';
import GlossaryPage from '../src/app/glossary/page';
import { learningPath } from '../src/app/learn/path';
import { MODULES } from '../src/modules/registry';

/**
 * `/learn` links straight into every chapter's walkthrough, and `/glossary` has an anchor
 * for every term a `<Term>` can link to (docs/UIUX.md §2.1 P1, P3).
 */
describe('the learning path', () => {
  const path = learningPath();

  it('lists every module in order, with chapters only for built ones', () => {
    expect(path.map((m) => m.entry.slug)).toEqual(MODULES.map((m) => m.slug));
    for (const { entry, chapters, learned } of path) {
      const ready = entry.status === 'ready';
      expect(chapters.length > 0, entry.slug).toBe(ready);
      expect(learned.length, entry.slug).toBe(ready ? 3 : 0);
    }
  });

  it('opens the first chapter on the bare route and every other one by its link', () => {
    for (const { entry, chapters } of path.filter((m) => m.chapters.length > 0)) {
      const definition = SHARE_STATES.find((d) => d.m === entry.slug)!;
      const key = 'scene' in (definition.defaults.input as object) ? 'scene' : 'chapter';
      expect(chapters[0].href).toBe(entry.route);
      for (const chapter of chapters) {
        const url = new URL(chapter.href, 'http://x.test');
        expect(url.pathname).toBe(entry.route);
        const state = shareStateFromSearch(definition, url.search);
        const input = state.input as Record<string, unknown>;
        expect(input[key], `${entry.slug}/${chapter.id}`).toBe(chapter.id);
        // Only the chapter differs from the defaults, so the page opens the walkthrough
        // at its first step.
        expect({ ...input, [key]: undefined }).toEqual({
          ...(definition.defaults.input as object),
          [key]: undefined,
        });
        expect(state.step).toBe(0);
      }
    }
  });
});

describe('the glossary page', () => {
  it('has an anchor for every term', () => {
    const html = renderToStaticMarkup(GlossaryPage());
    for (const [id, entry] of Object.entries(GLOSSARY)) {
      expect(html, id).toContain(`id="${id}"`);
      expect(html).toContain(entry.definition);
    }
  });
});
