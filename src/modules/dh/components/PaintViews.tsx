import { Reveal } from '@/components/motion';
import type { DhPaintPotEvent } from '@/core/dh/events';

import { Pot } from './Pot';

/*
 * The paint scene's first view, on its own: the first screen is the common pot, so this
 * is in the route's first load. The later paint steps' views (`./PaintLater`) load right
 * after hydration with every other scene's (through `../runs`), which keeps /dh in its
 * JS budget. Every colour is one core computed (OKLab mixing in `src/core/dh/paint.ts`);
 * these views only pour, blend and compare them.
 */

export const WHO = {
  alice: 'Alice',
  bob: 'Bob',
  public: 'Everyone',
  eve: 'Eve',
  mallory: 'Mallory',
} as const;

export function Labelled({
  colour,
  title,
  size = 'md',
  pouring,
}: {
  colour: string;
  title: string;
  size?: 'md' | 'lg';
  pouring?: readonly string[];
}) {
  return (
    <figure className="flex flex-col items-center gap-1 text-center">
      <Pot colour={colour} size={size} pouring={pouring} />
      <figcaption className="text-xs">
        <span className="block font-medium">{title}</span>
        <span className="font-mono">{colour}</span>
      </figcaption>
    </figure>
  );
}

/** A new pot of base paint on the table. */
export function PaintPotView({ event }: { event: DhPaintPotEvent }) {
  const publicPot = event.role === 'public';
  return (
    <Reveal trigger={event.id}>
      <span className="flex flex-wrap items-center gap-4">
        <Labelled
          colour={event.colour}
          size="lg"
          title={publicPot ? 'The common colour' : `${WHO[event.actor]}’s secret colour`}
        />
        <p className="max-w-sm text-sm">
          {publicPot
            ? 'On the public channel: Alice, Bob and anyone listening can see it.'
            : `Only ${WHO[event.actor]} has this pot. It never goes on the channel.`}
        </p>
      </span>
    </Reveal>
  );
}
