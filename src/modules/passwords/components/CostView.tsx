'use client';

import { useId, useState } from 'react';

import { CitationLink } from '@/components/inspector';
import { useReducedMotion } from '@/components/motion';
import {
  formatDuration,
  formatRate,
  PASSWORD_SPACES,
  schemeRates,
  secondsToExhaust,
  type CostParams,
} from '@/core/kdf/costModel';
import type { PasswordsShareState } from '@/core/kdf/state';
import { cn } from '@/lib/cn';

type CostInput = Pick<
  PasswordsShareState['input'],
  'gpus' | 'iterations' | 'bcryptCost' | 'argon2MemoryMiB' | 'space'
>;

/** The bars run from one second to 10^20 seconds on a log scale. */
const MAX_LOG = 20;

const YEAR = 365.25 * 24 * 3600;
/** Landmarks on the time axis, in seconds (unit conversions, not results). */
const TICKS: { label: string; seconds: number }[] = [
  { label: '1 s', seconds: 1 },
  { label: '1 h', seconds: 3600 },
  { label: '1 yr', seconds: YEAR },
  { label: '1,000 yr', seconds: 1000 * YEAR },
  { label: 'age of the universe', seconds: 13.8e9 * YEAR },
];
const tickAt = (seconds: number) => (Math.log10(seconds) / MAX_LOG) * 100;

/** The iteration slider's stops; the number field beside it takes any count. */
export const ITERATION_STOPS = [
  1, 10, 100, 1_000, 10_000, 100_000, 600_000, 1_000_000, 10_000_000,
] as const;

/** The stop nearest `iterations` on a log scale. */
export function nearestStop(iterations: number): number {
  let best = 0;
  for (let i = 1; i < ITERATION_STOPS.length; i += 1) {
    const distance = (stop: number) =>
      Math.abs(Math.log10(stop) - Math.log10(iterations));
    if (distance(ITERATION_STOPS[i]) < distance(ITERATION_STOPS[best])) best = i;
  }
  return best;
}

/**
 * A label that changes visibly when an input moves it (seconds → years): the new text
 * fades and rises in. Not on first paint, and not under reduced motion.
 */
function MorphText({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  const [first] = useState(text);
  return (
    <span
      key={text}
      className={cn(
        'inline-block',
        !reduced && text !== first && 'motion-reveal',
        className,
      )}
    >
      {text}
    </span>
  );
}

/**
 * One scheme's time to crack as a bar on a log axis. Its width eases to the new value
 * when a slider moves (a CSS transition, so reduced motion jumps).
 */
function CrackBar({ seconds, estimate }: { seconds: number; estimate: boolean }) {
  const width = Math.min(
    100,
    Math.max(1, (Math.max(0, Math.log10(seconds)) / MAX_LOG) * 100),
  );
  return (
    <div aria-hidden="true" className="bg-surface-overlay relative h-3 w-full rounded">
      {TICKS.slice(1).map((tick) => (
        <span
          key={tick.label}
          className="bg-border-strong absolute inset-y-0 w-px opacity-60"
          style={{ left: `${tickAt(tick.seconds)}%` }}
        />
      ))}
      <div
        data-bar-width={width.toFixed(2)}
        className={cn(
          'relative h-3 rounded transition-[width] duration-(--dur-step) ease-(--ease-out)',
          estimate ? 'bg-warn pattern-changed' : 'bg-accent',
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/** The log axis under the bars, with its landmarks. */
function Axis() {
  return (
    <div aria-hidden="true" className="text-fg-muted relative h-8 text-[0.6875rem]">
      {TICKS.map((tick, i) => (
        <span
          key={tick.label}
          className="absolute top-0 flex flex-col"
          style={{
            left: `${tickAt(tick.seconds)}%`,
            transform: i === 0 ? undefined : 'translateX(-50%)',
          }}
        >
          <span className="bg-border-strong mx-auto h-1.5 w-px" />
          <span
            className={cn(
              'max-w-20 leading-tight',
              i === 0 ? 'text-left' : 'text-center',
            )}
          >
            {tick.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Time to try every password in a space, for each storage scheme, on `gpus` GPUs. All
 * arithmetic is `src/core/kdf/costModel.ts`; every rate shows its source and basis.
 */
export function CostView({
  input,
  onChange,
}: {
  input: CostInput;
  onChange: (patch: Partial<CostInput>) => void;
}) {
  const id = useId();
  const params: CostParams = {
    pbkdf2Iterations: input.iterations,
    bcryptCost: input.bcryptCost,
    argon2MemoryMiB: input.argon2MemoryMiB,
  };
  const space = PASSWORD_SPACES.find((s) => s.id === input.space) ?? PASSWORD_SPACES[0];
  const gpuLog = Math.log10(input.gpus);
  const field =
    'border-border bg-surface focus-visible:outline-focus rounded-md border px-2 py-1 focus-visible:outline-2';

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-gpus`}>
          Attacker: {input.gpus.toLocaleString('en-US')} GPU{input.gpus === 1 ? '' : 's'}
          <input
            id={`${id}-gpus`}
            type="range"
            min={0}
            max={6}
            step={0.5}
            value={gpuLog}
            aria-valuetext={`${input.gpus} GPUs`}
            onChange={(e) => onChange({ gpus: Math.round(10 ** Number(e.target.value)) })}
            className="accent-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-space`}>
          Password chosen from
          <select
            id={`${id}-space`}
            className={cn(field, 'font-sans')}
            value={space.id}
            onChange={(e) => onChange({ space: e.target.value as CostInput['space'] })}
          >
            {PASSWORD_SPACES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor={`${id}-iter-slider`}>
            PBKDF2 iterations: {input.iterations.toLocaleString('en-US')}
          </label>
          <input
            id={`${id}-iter-slider`}
            type="range"
            min={0}
            max={ITERATION_STOPS.length - 1}
            step={1}
            value={nearestStop(input.iterations)}
            aria-valuetext={`${input.iterations.toLocaleString('en-US')} iterations`}
            onChange={(e) =>
              onChange({ iterations: ITERATION_STOPS[Number(e.target.value)] })
            }
            className="accent-accent"
          />
          <label className="flex items-center gap-2" htmlFor={`${id}-iter`}>
            <span className="text-fg-muted text-xs">Exact count</span>
            <input
              id={`${id}-iter`}
              type="number"
              min={1}
              max={10_000_000}
              className={cn(field, 'w-32 font-mono')}
              value={input.iterations}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isInteger(value) && value >= 1 && value <= 10_000_000) {
                  onChange({ iterations: value });
                }
              }}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-bcrypt`}>
          bcrypt cost: {input.bcryptCost} (2^{input.bcryptCost} rounds)
          <input
            id={`${id}-bcrypt`}
            type="range"
            min={4}
            max={20}
            value={input.bcryptCost}
            onChange={(e) => onChange({ bcryptCost: Number(e.target.value) })}
            className="accent-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-argon`}>
          Argon2id memory per guess
          <select
            id={`${id}-argon`}
            className={cn(field, 'font-sans')}
            value={input.argon2MemoryMiB}
            onChange={(e) => onChange({ argon2MemoryMiB: Number(e.target.value) })}
          >
            {[16, 64, 256, 1024].map((mib) => (
              <option key={mib} value={mib}>
                {mib} MiB
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm">
        Time to try all {space.size.toExponential(1).replace('e+', ' × 10^')} passwords (“
        {space.name.toLowerCase()}”). On average an attacker finds one in half that time.
      </p>

      <ul className="flex flex-col gap-3">
        {schemeRates(params).map((scheme) => {
          const rate = scheme.perGpu * input.gpus;
          const seconds = secondsToExhaust(space.size, rate);
          return (
            <li key={scheme.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{scheme.name}</span>
                <span className="font-mono">
                  ≈ <MorphText text={formatDuration(seconds)} />
                  {scheme.estimate ? (
                    <span className="text-warn ml-1 font-sans">(estimate)</span>
                  ) : null}
                </span>
              </div>
              <CrackBar seconds={seconds} estimate={Boolean(scheme.estimate)} />
              <p className="text-fg-muted text-xs">
                ≈ {formatRate(rate)} guesses a second. {scheme.basis}{' '}
                <CitationLink id={scheme.citation} /> ·{' '}
                <CitationLink id={scheme.describedIn} />
              </p>
            </li>
          );
        })}
      </ul>
      <Axis />
      <p className="text-fg-muted text-xs">
        Bars are on a log scale from one second to 10^{MAX_LOG} seconds. Rates are
        illustrative orders of magnitude from one public benchmark, not measurements of
        this site.
      </p>
    </div>
  );
}
