'use client';

import { useId } from 'react';

import { BitDiffStrip, type ByteFormat } from '@/components/blocks';
import { Reveal } from '@/components/motion';
import type { XorEvent } from '@/core/xor/events';

import { BitColumns } from './BitColumns';
import { ByteTape } from './ByteTape';
import { BytesView } from './BytesView';
import { CribDrag } from './CribDrag';

/**
 * Every step of the module's runs. Loaded after hydration with the later chapters' runs
 * (`../runs.ts`); the first chapter's steps render through `BytesView`, which the page
 * imports itself.
 */

/** A key is secret: a lock and the secret colour as well as its name (UIUX §5.1). */
function RowName({ name }: { name: string }) {
  return name === 'key' ? (
    <span className="text-secret">🔒 key (secret)</span>
  ) : (
    <>{name}</>
  );
}

export interface XorViewProps {
  event: XorEvent;
  format: ByteFormat;
  /** The whole run, for what a step shows around itself (the text still to encode). */
  events: readonly XorEvent[];
  /** The step on screen. */
  index: number;
  /** Seek the timeline to a step: the crib chip moves this way. */
  onSeekStep: (index: number) => void;
}

export function XorEventView({ event, format, events, index, onSeekStep }: XorViewProps) {
  const id = useId();
  switch (event.kind) {
    case 'xor.char':
    case 'xor.message':
      return <BytesView event={event} format={format} events={events} index={index} />;

    case 'xor.key':
      return (
        <div className="flex flex-col gap-3">
          <ByteTape
            name={<RowName name={event.name} />}
            label={event.name}
            bytes={event.key}
            format={format}
          />
          <p className="text-fg-muted text-sm">
            Drawn from the seeded generator (seed {event.seed}). Not cryptographic: for
            display only.
          </p>
        </div>
      );

    case 'xor.byte': {
      const resultId = `${id}-result`;
      return (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-3">
            <ByteTape
              name={event.names[0]}
              label={event.names[0]}
              bytes={event.aBytes}
              format={format}
              highlight={[event.index]}
            />
            <ByteTape
              name={<RowName name={event.names[1]} />}
              label={event.names[1]}
              bytes={event.bBytes}
              format={format}
              highlight={[event.index]}
            />
            <ByteTape
              name={event.names[2]}
              label={event.names[2]}
              bytes={event.outBytes}
              format={format}
              total={event.aBytes.length}
              highlight={[event.index]}
              arrive={{ from: resultId, indices: [event.index], trigger: event.id }}
            />
          </div>
          <BitColumns
            a={event.a}
            b={event.b}
            out={event.out}
            names={event.names}
            undo={event.pass === 'undo'}
            trigger={event.id}
            resultId={resultId}
            maskedId={`${id}-first`}
          />
        </div>
      );
    }

    case 'xor.result':
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <ByteTape
              name={event.names[0]}
              label={event.names[0]}
              bytes={event.a}
              format={format}
            />
            <ByteTape
              name={<RowName name={event.names[1]} />}
              label={event.names[1]}
              bytes={event.b}
              format={format}
            />
            <ByteTape
              name={event.names[2]}
              label={event.names[2]}
              bytes={event.out}
              format={format}
            />
          </div>
          {event.text !== undefined ? (
            <Reveal trigger={event.id}>
              <p>
                <span className="text-fg-muted text-sm">{event.names[2]} as text: </span>
                <span className="highlighter font-mono text-lg">“{event.text}”</span>
              </p>
            </Reveal>
          ) : null}
          <BitDiffStrip
            label={`${event.names[0]} → ${event.names[2]}`}
            a={event.a}
            b={event.out}
            perRow={64}
          />
        </div>
      );

    case 'xor.crib': {
      const steps: number[] = [];
      events.forEach((e, i) => {
        if (e.kind === 'xor.crib') steps[e.offset] = i;
      });
      return <CribDrag event={event} steps={steps} onSeekStep={onSeekStep} />;
    }
  }
}
