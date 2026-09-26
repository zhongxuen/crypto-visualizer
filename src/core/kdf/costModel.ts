/**
 * How long an attacker needs to try every password in a space, for each way of storing
 * passwords. Pure arithmetic: nothing here hashes anything.
 *
 * Every rate is an **illustrative order of magnitude**, not a measurement of this site
 * or of any particular attacker. They come from one public benchmark: hashcat 6.2.6 on a
 * single NVIDIA RTX 4090 (`hashcat-rtx4090`). Where a scheme is tuned differently from
 * the benchmark, the rate is scaled linearly by the work, which is how these schemes are
 * designed to behave, and the UI says "≈".
 *
 * Argon2 is not in that benchmark. scrypt, the other widely deployed memory-hard
 * function, is, and it stands in for Argon2id here, scaled by memory. That is an
 * estimate and is labelled as one.
 */

import type { CitationId } from '../citations/types';

/** hashcat 6.2.6, one RTX 4090, stock clocks (the `hashcat-rtx4090` citation). */
export const BENCHMARK = {
  /** Mode 1400, SHA2-256: 21,975.5 MH/s. */
  sha256: 21_975.5e6,
  /** Mode 10900, PBKDF2-HMAC-SHA256 at 999 iterations: 8,865.7 kH/s. */
  pbkdf2: { rate: 8_865.7e3, iterations: 999 },
  /** Mode 3200, bcrypt at 32 iterations (cost 5): 184.0 kH/s. */
  bcrypt: { rate: 184.0e3, cost: 5 },
  /** Mode 8900, scrypt N = 16384, r = 8, p = 1 (16 MiB): 7,126 H/s. */
  scrypt: { rate: 7_126, memoryMiB: 16 },
} as const;

export type SchemeId = 'sha256' | 'pbkdf2' | 'bcrypt' | 'argon2id';

export interface CostParams {
  pbkdf2Iterations: number;
  bcryptCost: number;
  argon2MemoryMiB: number;
}

export const DEFAULT_COST_PARAMS: CostParams = {
  pbkdf2Iterations: 600_000,
  bcryptCost: 12,
  argon2MemoryMiB: 64,
};

export interface SchemeRate {
  id: SchemeId;
  name: string;
  /** Guesses per second on one GPU. */
  perGpu: number;
  /** How the number was obtained, in one line. */
  basis: string;
  /** True when it is an estimate rather than scaled from a measured mode. */
  estimate: boolean;
  citation: CitationId;
  /** Where the scheme is described. */
  describedIn: CitationId;
}

export function schemeRates(params: CostParams = DEFAULT_COST_PARAMS): SchemeRate[] {
  const { pbkdf2Iterations, bcryptCost, argon2MemoryMiB } = params;
  if (!(pbkdf2Iterations >= 1) || !(argon2MemoryMiB > 0) || !(bcryptCost >= 4)) {
    throw new RangeError('Cost parameters out of range');
  }
  return [
    {
      id: 'sha256',
      name: 'SHA-256, unsalted',
      perGpu: BENCHMARK.sha256,
      basis: 'Measured: hashcat mode 1400.',
      estimate: false,
      citation: 'hashcat-rtx4090',
      describedIn: 'fips180-4.6.2.2',
    },
    {
      id: 'pbkdf2',
      name: `PBKDF2-HMAC-SHA-256, ${pbkdf2Iterations.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} iterations`,
      perGpu: (BENCHMARK.pbkdf2.rate * BENCHMARK.pbkdf2.iterations) / pbkdf2Iterations,
      basis:
        'Scaled from hashcat mode 10900 at 999 iterations: time per guess grows with the count.',
      estimate: false,
      citation: 'hashcat-rtx4090',
      describedIn: 'rfc8018.5.2',
    },
    {
      id: 'bcrypt',
      name: `bcrypt, cost ${bcryptCost}`,
      perGpu: (BENCHMARK.bcrypt.rate * 2 ** BENCHMARK.bcrypt.cost) / 2 ** bcryptCost,
      basis: 'Scaled from hashcat mode 3200 at cost 5: each +1 of cost doubles the work.',
      estimate: false,
      citation: 'hashcat-rtx4090',
      describedIn: 'provos-mazieres1999',
    },
    {
      id: 'argon2id',
      name: `Argon2id, ${argon2MemoryMiB} MiB`,
      perGpu: (BENCHMARK.scrypt.rate * BENCHMARK.scrypt.memoryMiB) / argon2MemoryMiB,
      basis:
        'Estimate: Argon2 is not in the benchmark, so scrypt at 16 MiB (mode 8900) stands in, scaled by memory.',
      estimate: true,
      citation: 'hashcat-rtx4090',
      describedIn: 'rfc9106.3',
    },
  ];
}

export interface PasswordSpace {
  id: string;
  name: string;
  size: number;
}

/** Password spaces to compare. Sizes are exact counts. */
export const PASSWORD_SPACES: readonly PasswordSpace[] = [
  { id: 'common', name: 'On the 200-password common list', size: 200 },
  { id: 'lower8', name: '8 lowercase letters', size: 26 ** 8 },
  { id: 'print8', name: '8 characters of any printable ASCII', size: 95 ** 8 },
  { id: 'words4', name: '4 random words from a 7,776-word list', size: 7776 ** 4 },
  { id: 'print12', name: '12 characters of any printable ASCII', size: 95 ** 12 },
];

/** Seconds to try every password in `space` at `perSecond` guesses a second. */
export function secondsToExhaust(space: number, perSecond: number): number {
  if (!(perSecond > 0)) throw new RangeError('Rate must be positive');
  return space / perSecond;
}

const UNITS: [number, string][] = [
  [365.25 * 24 * 3600, 'year'],
  [24 * 3600, 'day'],
  [3600, 'hour'],
  [60, 'minute'],
  [1, 'second'],
];

/** A rough, readable duration: "instantly", "3 hours", "4.2 × 10^9 years". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'forever';
  if (seconds < 1) return 'under a second';
  for (const [size, unit] of UNITS) {
    if (seconds >= size) {
      const value = seconds / size;
      if (unit === 'year' && value >= 1e4) {
        const exponent = Math.floor(Math.log10(value));
        const mantissa = value / 10 ** exponent;
        return `${mantissa.toFixed(1)} × 10^${exponent} years`;
      }
      const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
      return `${rounded} ${unit}${rounded === 1 ? '' : 's'}`;
    }
  }
  return 'under a second';
}

/** Guesses per second written compactly: "22 billion", "8.9 million". */
export function formatRate(perSecond: number): string {
  const steps: [number, string][] = [
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ];
  for (const [size, word] of steps) {
    if (perSecond >= size) {
      const value = perSecond / size;
      return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${word}`;
    }
  }
  return perSecond >= 10 ? String(Math.round(perSecond)) : perSecond.toFixed(1);
}
