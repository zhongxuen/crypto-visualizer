'use client';

import { cn } from '@/lib/cn';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** `value` padded to as many digits as `max`, grouped by threes: 3 of 600000 → 000,003. */
export function odometerText(value: number, max: number): string {
  const width = String(Math.max(max, value)).length;
  const digits = String(value).padStart(width, '0');
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return out;
}

/**
 * An iteration counter whose digits roll like a mechanical odometer (UIUX §7.2,
 * PBKDF2). Each digit is a column of 0–9 translated to its value; the roll is a CSS
 * transition, so reduced motion (globals.css) shows the number at once. `smooth` is off
 * for a seek, which jumps. The number itself is spoken from an `sr-only` copy.
 */
export function Odometer({
  value,
  max,
  smooth = true,
  label,
  className,
}: {
  value: number;
  max: number;
  smooth?: boolean;
  /** Read after the number, e.g. "iterations of 600,000". */
  label: string;
  className?: string;
}) {
  const text = odometerText(value, max);
  return (
    <span
      data-odometer={value}
      className={cn('inline-flex font-mono tabular-nums', className)}
    >
      <span aria-hidden="true" className="inline-flex leading-none">
        {[...text].map((char, i) =>
          char === ',' ? (
            <span key={i}>,</span>
          ) : (
            <span key={i} className="inline-block h-[1em] overflow-hidden">
              <span
                className={cn(
                  'flex flex-col',
                  smooth && 'transition-transform duration-100 ease-linear',
                )}
                style={{ transform: `translateY(-${Number(char) * 10}%)` }}
              >
                {DIGITS.map((d) => (
                  <span key={d} className="block h-[1em]">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          ),
        )}
      </span>
      <span className="sr-only">
        {value.toLocaleString('en-US')} {label}
      </span>
    </span>
  );
}
