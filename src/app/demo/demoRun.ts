import { createRun } from '@/core/events/builder';
import type { EventBase } from '@/core/events/types';
import { createRng } from '@/core/sim/rng';

/**
 * A fake run for the /demo page: every building block gets something to draw. It
 * computes nothing cryptographic; the numbers are a seeded walk.
 */
export type DemoEvent = EventBase & {
  kind: 'demo.step';
  bytes: number[];
  previous: number[];
  modulus: number;
  value: number;
  from: number;
  row: { step: number; value: number; doubled: number };
};

export function buildDemoRun() {
  const rng = createRng('demo');
  const run = createRun<DemoEvent>();
  let bytes = Array.from({ length: 16 }, () => rng.int(256));
  let value = 1;
  let index = 0;

  const add = (label: string) => {
    const previous = bytes;
    bytes = previous.map((byte) => (rng.chance(0.25) ? rng.int(256) : byte));
    const from = value;
    value = (value * 3) % 23;
    run.step({
      kind: 'demo.step',
      id: `demo.step.${index}`,
      label,
      detail:
        'A made-up step: a quarter of the bytes change, and the clock multiplies by 3.',
      citation: 'rfc4648.8',
      bytes,
      previous,
      modulus: 23,
      value,
      from,
      row: { step: index + 1, value, doubled: value * 2 },
    });
    index += 1;
  };

  run.group(
    'Setup',
    () => {
      add('Start with sixteen random bytes.');
      add('Change a few of them.');
    },
    { description: 'The first group.' },
  );
  run.group(
    'Rounds',
    () => {
      for (let i = 0; i < 6; i += 1) add(`Round ${i + 1}.`);
    },
    { description: 'Six rounds of the same thing.' },
  );
  run.group('Finish', () => add('Done.'), { description: 'The last step.' });

  return run.finish();
}
