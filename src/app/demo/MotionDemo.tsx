'use client';

import { formatByte } from '@/components/blocks';
import { Flip, Morph, Pulse, Reveal, Travel, Wave } from '@/components/motion';

import type { DemoEvent } from './demoRun';

/**
 * Every motion primitive, driven by the demo run's step (docs/UIUX.md §6.3), so each can
 * be seen and tested on its own. Step once to see the motion, Home/End to see a seek, and
 * turn on reduced motion to see every end frame at once.
 */
export function MotionDemo({ event, index }: { event: DemoEvent; index: number }) {
  const row = event.bytes.slice(0, 4);
  // The row rotates one place left per step, as ShiftRows rotates a row of the AES state.
  const shift = index % row.length;
  const rotated = [...row.slice(shift), ...row.slice(0, shift)];
  const keys = [...row.keys()];
  const order = [...keys.slice(shift), ...keys.slice(0, shift)];

  return (
    <section
      aria-labelledby="motion-heading"
      className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-4"
      data-testid="motion-demo"
    >
      <h2 id="motion-heading" className="font-display text-xl">
        Motion primitives
      </h2>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-fg-muted">Reveal</dt>
        <dd data-primitive="reveal">
          <Reveal trigger={index}>{event.label}</Reveal>
        </dd>

        <dt className="text-fg-muted">Morph</dt>
        <dd data-primitive="morph" className="font-mono">
          <Morph value={event.row.doubled * 1000 + event.value} />
          {' · '}
          <Morph count value={event.value} />
        </dd>

        <dt className="text-fg-muted">Pulse</dt>
        <dd data-primitive="pulse" className="flex gap-1 font-mono">
          {row.map((byte, i) => (
            <Pulse key={i} trigger={index} active={byte !== event.previous[i]}>
              <span className="border-border rounded-cell inline-block border px-1">
                {formatByte(byte, 'hex')}
              </span>
            </Pulse>
          ))}
        </dd>

        <dt className="text-fg-muted">Wave</dt>
        <dd data-primitive="wave">
          <Wave trigger={index} className="flex gap-0.5">
            {Array.from({ length: 16 }, (_, bit) => {
              const on = ((event.bytes[0] >> (15 - bit)) & 1) === 1;
              return (
                <span
                  key={bit}
                  className={
                    on
                      ? 'bg-diff-on inline-block size-3 rounded-[2px]'
                      : 'border-diff-off inline-block size-3 rounded-[2px] border'
                  }
                />
              );
            })}
          </Wave>
        </dd>

        <dt className="text-fg-muted">Flip</dt>
        <dd data-primitive="flip">
          <Flip trigger={index} className="flex gap-1 font-mono">
            {rotated.map((byte, i) => (
              <span
                key={order[i]}
                data-flip-key={order[i]}
                className="border-border bg-surface-overlay rounded-cell inline-block border px-1"
              >
                {formatByte(byte, 'hex')}
              </span>
            ))}
          </Flip>
        </dd>

        <dt className="text-fg-muted">Travel</dt>
        <dd data-primitive="travel" className="flex items-center gap-6 font-mono">
          <span id="demo-travel-from" className="border-border rounded-cell border px-1">
            {formatByte(event.previous[0], 'hex')}
          </span>
          <span aria-hidden="true">→</span>
          <Travel from="demo-travel-from" trigger={index}>
            <span className="bg-highlight rounded-cell px-1">
              {formatByte(event.bytes[0], 'hex')}
            </span>
          </Travel>
        </dd>
      </dl>
    </section>
  );
}
