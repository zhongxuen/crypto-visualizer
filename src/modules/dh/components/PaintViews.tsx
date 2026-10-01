import type { DhPaintEveEvent, DhPaintSharedEvent } from '@/core/dh/events';

import { Swatch, Verdict } from './parts';

/*
 * The paint scene's step views, on their own: paint is the first screen, so these are
 * in the route's first load while every other scene's views load after hydration
 * (`./ScenePicture`, through `../runs`).
 */

const WHO = { alice: 'Alice', bob: 'Bob' } as const;

export function PaintSharedView({ event }: { event: DhPaintSharedEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-6">
        {(['alice', 'bob'] as const).map((who) => (
          <p key={who} className="flex items-center gap-2 text-sm">
            <Swatch colour={event[who]} className="size-12" />
            <span>
              {WHO[who]}’s pot <span className="font-mono">{event[who]}</span>
            </span>
          </p>
        ))}
      </div>
      <p className="text-fg-secondary text-sm">
        Recipe: {event.recipe.map((part) => `${part.parts} part ${part.name}`).join(', ')}
        .
      </p>
      <Verdict ok={event.same} testId="dh-paint-same">
        {event.same ? 'The same colour, bit for bit.' : 'The pots differ.'}
      </Verdict>
    </div>
  );
}

export function PaintEveView({ event }: { event: DhPaintEveEvent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-6">
        <p className="flex items-center gap-2 text-sm">
          <Swatch colour={event.colour} className="size-12" />
          <span>
            Eve’s pot <span className="font-mono">{event.colour}</span>
          </span>
        </p>
        <p className="flex items-center gap-2 text-sm">
          <Swatch colour={event.shared} className="size-12" />
          <span>
            The shared pot <span className="font-mono">{event.shared}</span>
          </span>
        </p>
      </div>
      <p className="text-fg-secondary text-sm">
        Eve’s recipe:{' '}
        {event.recipe.map((part) => `${part.parts} ${part.name}`).join(', ')}. OKLab
        distance from the shared colour: {event.distance.toFixed(3)} (about 0.02 is the
        smallest difference people notice).
      </p>
    </div>
  );
}

/** Where the paint analogy stops working. */
export function PaintLimitView() {
  return (
    <p className="border-warn bg-surface rounded-md border-2 p-3 text-sm">
      Paint mixing is an average, and an average can be undone with a little algebra. The
      real exchange replaces mixing with gˣ mod p, which nobody knows how to undo quickly
      for a large p. The next chapter does exactly that.
    </p>
  );
}
