import { ArrowRight, Check, Plus, X } from 'lucide-react';

import { Travel, useStepTransition } from '@/components/motion';
import type {
  DhPaintEveEvent,
  DhPaintMixEvent,
  DhPaintSendEvent,
  DhPaintSharedEvent,
  PaintPart,
} from '@/core/dh/events';
import { cn } from '@/lib/cn';

import { Labelled, WHO } from './PaintViews';
import { Verdict } from './parts';

/*
 * The paint scene's views after its first step: mixing, the swap, the shared pot, Eve's
 * attempt and the limit. They load right after hydration through `../runs`, long before
 * a learner can step to them.
 */

/** Base paint names as a learner reads them. */
const PAINT_NAME: Record<string, string> = {
  common: 'common',
  'alice-secret': 'Alice’s secret',
  'bob-secret': 'Bob’s secret',
};
const paintName = (name: string) => PAINT_NAME[name] ?? name;

/** One plain step forward: the operation plays. A seek or reduced motion: the end frame. */
function usePlays() {
  const { animate, direction } = useStepTransition();
  return animate && direction === 'forward';
}

/**
 * A recipe as a bar: one segment per part of paint, so "two parts common" is visibly
 * twice as wide. The parts are core's; the bar only lays them out.
 */
export function RecipeBar({
  recipe,
  label,
}: {
  recipe: readonly PaintPart[];
  label: string;
}) {
  const total = recipe.reduce((sum, part) => sum + part.parts, 0);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div
        aria-hidden="true"
        className="border-border-strong flex h-4 overflow-hidden rounded-full border"
      >
        {recipe.map((part) =>
          Array.from({ length: part.parts }, (_, i) => (
            <span
              key={`${part.name}.${i}`}
              className="border-border-strong h-full border-r last:border-r-0"
              style={{ backgroundColor: part.colour, width: `${100 / total}%` }}
            />
          )),
        )}
      </div>
      <p className="text-fg-secondary text-xs">
        {label}:{' '}
        {recipe
          .map(
            (part) =>
              `${part.parts} part${part.parts > 1 ? 's' : ''} ${paintName(part.name)}`,
          )
          .join(' + ')}
      </p>
    </div>
  );
}

/**
 * Mixing: the two pots pour into a bowl and blend. The pots fly in from where they sit
 * in the lanes (`sources`, element ids), then the mixed colour (core's) fades in over
 * the two paints side by side.
 */
export function PaintMixView({
  event,
  sources,
}: {
  event: DhPaintMixEvent;
  sources: readonly (string | undefined)[];
}) {
  const plays = usePlays();
  const final = event.recipe.length > 2;
  const who = WHO[event.actor];
  const inputTitles = final
    ? [`${event.actor === 'alice' ? 'Bob' : 'Alice'}’s mixture`, `${who}’s secret`]
    : ['Common colour', `${who}’s secret`];
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap items-center gap-2 sm:gap-4"
        data-testid="dh-paint-mix"
      >
        {event.inputs.map((colour, i) => {
          const pot = <Labelled colour={colour} title={inputTitles[i] ?? 'Paint'} />;
          const from = sources[i];
          return (
            <div key={`${i}.${colour}`} className="flex items-center gap-2 sm:gap-4">
              {i > 0 ? (
                <Plus aria-hidden="true" className="text-fg-muted size-5" />
              ) : null}
              {plays && from ? (
                <Travel from={from} trigger={`${event.id}.${i}`}>
                  {pot}
                </Travel>
              ) : (
                pot
              )}
            </div>
          );
        })}
        <ArrowRight aria-hidden="true" className="text-fg-muted size-5" />
        <Labelled
          key={plays ? event.id : 'still'}
          colour={event.colour}
          size="lg"
          title={final ? `${who}’s final pot` : `${who}’s mixture`}
          pouring={plays ? event.inputs : undefined}
        />
      </div>
      <RecipeBar recipe={event.recipe} label="In the pot" />
    </div>
  );
}

/** A mixture on its way across the open channel. */
export function PaintSendView({ event }: { event: DhPaintSendEvent }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Labelled colour={event.colour} title={`${WHO[event.from]}’s mixture`} />
      <p className="flex items-center gap-2 text-sm">
        {WHO[event.from]}
        <ArrowRight aria-hidden="true" className="text-public size-4" />
        public channel
        <ArrowRight aria-hidden="true" className="text-public size-4" />
        {WHO[event.to]}
      </p>
      <p className="text-fg-secondary basis-full text-sm">
        Everyone can see this pot. Nobody can pour the secret colour back out of it.
      </p>
    </div>
  );
}

/** The final two pots turn to face each other, and a "same colour" check draws. */
export function PaintSharedView({ event }: { event: DhPaintSharedEvent }) {
  const plays = usePlays();
  const turn = plays
    ? 'transition-transform duration-(--dur-step) ease-(--ease-out) starting:rotate-0'
    : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-8">
        <div key={plays ? `${event.id}.a` : 'a'} className={cn('rotate-6', turn)}>
          <Labelled colour={event.alice} size="lg" title="Alice’s pot" />
        </div>
        <span className="flex flex-col items-center gap-1 self-center">
          {event.same ? (
            <Check
              key={plays ? event.id : 'still'}
              aria-hidden="true"
              className={cn('text-ok size-8', plays && 'tick-draw')}
            />
          ) : (
            <X aria-hidden="true" className="text-danger size-8" />
          )}
          <span className="text-xs font-medium">{event.same ? 'same' : 'differ'}</span>
        </span>
        <div key={plays ? `${event.id}.b` : 'b'} className={cn('-rotate-6', turn)}>
          <Labelled colour={event.bob} size="lg" title="Bob’s pot" />
        </div>
      </div>
      <RecipeBar recipe={event.recipe} label="Both pots" />
      <Verdict ok={event.same} testId="dh-paint-same">
        {event.same ? 'The same colour, bit for bit.' : 'The pots differ.'}
      </Verdict>
    </div>
  );
}

/** Eve's best mix next to the shared pot: she has two parts common, not one. */
export function PaintEveView({
  event,
  sharedRecipe,
}: {
  event: DhPaintEveEvent;
  sharedRecipe?: readonly PaintPart[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-6">
        <Labelled colour={event.colour} size="lg" title="Eve’s pot" />
        <X aria-hidden="true" className="text-danger size-6 self-center" />
        <Labelled colour={event.shared} size="lg" title="The shared pot" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <RecipeBar recipe={event.recipe} label="Eve’s pot" />
        {sharedRecipe ? <RecipeBar recipe={sharedRecipe} label="The shared pot" /> : null}
      </div>
      <p className="text-fg-secondary text-sm">
        OKLab distance from the shared colour: {event.distance.toFixed(3)} (about 0.02 is
        the smallest difference people notice).
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
