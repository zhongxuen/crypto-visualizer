'use client';

import { useId } from 'react';

import { CitationLink } from '@/components/inspector';
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
    'border-border bg-surface focus-visible:outline-focus rounded-md border px-2 py-1 font-mono focus-visible:outline-2';

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
            className={field}
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
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-iter`}>
          PBKDF2 iterations
          <input
            id={`${id}-iter`}
            type="number"
            min={1}
            max={10_000_000}
            className={field}
            value={input.iterations}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isInteger(value) && value >= 1 && value <= 10_000_000) {
                onChange({ iterations: value });
              }
            }}
          />
        </label>
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
            className={field}
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
          const width = Math.min(
            100,
            Math.max(1, (Math.max(0, Math.log10(seconds)) / MAX_LOG) * 100),
          );
          return (
            <li key={scheme.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{scheme.name}</span>
                <span className="font-mono">
                  ≈ {formatDuration(seconds)}
                  {scheme.estimate ? (
                    <span className="text-warn ml-1 font-sans">(estimate)</span>
                  ) : null}
                </span>
              </div>
              <div aria-hidden="true" className="bg-surface-overlay h-3 w-full rounded">
                <div
                  className={cn(
                    'h-3 rounded',
                    scheme.estimate ? 'bg-warn pattern-changed' : 'bg-accent',
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="text-fg-muted text-xs">
                ≈ {formatRate(rate)} guesses a second. {scheme.basis}{' '}
                <CitationLink id={scheme.citation} className="text-xs" /> ·{' '}
                <CitationLink id={scheme.describedIn} className="text-xs" />
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-fg-muted text-xs">
        Bars are on a log scale from one second to 10^{MAX_LOG} seconds. Rates are
        illustrative orders of magnitude from one public benchmark, not measurements of
        this site.
      </p>
    </div>
  );
}
