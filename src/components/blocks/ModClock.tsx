import { memo } from 'react';

import { cn } from '@/lib/cn';

/**
 * Arithmetic modulo m as a clock face: m positions round a circle, the current value
 * marked, and an arrow from the previous value when there is one. Position numbers are
 * printed only when m ≤ 60; above 120 positions a clock is unreadable, so it becomes a
 * number line from 0 to m − 1.
 */

export interface ModClockProps {
  modulus: number | bigint;
  value: number | bigint;
  /** Where the hand was before this step. */
  from?: number | bigint;
  label: string;
  className?: string;
}

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 88;

function angleOf(position: number, modulus: number): number {
  return (position / modulus) * 2 * Math.PI - Math.PI / 2;
}

function point(position: number, modulus: number, radius = RADIUS) {
  const angle = angleOf(position, modulus);
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

export const ModClock = memo(function ModClock({
  modulus,
  value,
  from,
  label,
  className,
}: ModClockProps) {
  const m = BigInt(modulus);
  if (m <= 0n) throw new RangeError('ModClock needs a positive modulus');
  const v = ((BigInt(value) % m) + m) % m;
  const f = from === undefined ? undefined : ((BigInt(from) % m) + m) % m;
  const description = `${label}: ${f !== undefined ? `${f} → ` : ''}${v} (mod ${m})`;

  if (m > 120n) {
    // Number line. Positions as fractions of m, computed in bigint then scaled.
    const frac = (x: bigint) => Number((x * 10_000n) / (m - 1n)) / 100;
    return (
      <figure className={cn('flex flex-col gap-2', className)}>
        <svg
          role="img"
          aria-label={description}
          viewBox="0 0 400 60"
          className="text-fg w-full max-w-xl"
        >
          <line x1="10" y1="30" x2="390" y2="30" stroke="currentColor" strokeWidth="2" />
          <text x="10" y="54" fontSize="11" fill="currentColor" textAnchor="start">
            0
          </text>
          <text x="390" y="54" fontSize="11" fill="currentColor" textAnchor="end">
            {String(m - 1n)}
          </text>
          {f !== undefined ? (
            <circle
              cx={10 + (380 * frac(f)) / 100}
              cy="30"
              r="6"
              fill="none"
              stroke="var(--diff-off)"
              strokeWidth="2"
            />
          ) : null}
          <rect
            x={10 + (380 * frac(v)) / 100 - 6}
            y="24"
            width="12"
            height="12"
            fill="var(--diff-on)"
          />
        </svg>
        <figcaption className="font-mono text-sm">{description}</figcaption>
      </figure>
    );
  }

  const n = Number(m);
  const vn = Number(v);
  const fn = f === undefined ? undefined : Number(f);
  const hand = point(vn, n, RADIUS - 18);
  const numbers = n <= 60;

  return (
    <figure className={cn('flex flex-col items-center gap-2', className)}>
      <svg
        role="img"
        aria-label={description}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="text-fg size-56"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="2"
        />
        {Array.from({ length: n }, (_, i) => {
          const outer = point(i, n, RADIUS);
          const inner = point(i, n, RADIUS - 5);
          const text = point(i, n, RADIUS + 12);
          return (
            <g key={i}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--border-strong)"
              />
              {numbers ? (
                <text
                  x={text.x}
                  y={text.y}
                  fontSize={n > 30 ? 7 : 10}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="currentColor"
                  fontWeight={i === vn ? 700 : 400}
                >
                  {i}
                </text>
              ) : null}
            </g>
          );
        })}
        {fn !== undefined ? (
          <circle
            cx={point(fn, n).x}
            cy={point(fn, n).y}
            r="6"
            fill="none"
            stroke="var(--diff-off)"
            strokeWidth="2"
          />
        ) : null}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={hand.x}
          y2={hand.y}
          stroke="var(--diff-on)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect
          x={point(vn, n).x - 6}
          y={point(vn, n).y - 6}
          width="12"
          height="12"
          fill="var(--diff-on)"
        />
        <circle cx={CENTER} cy={CENTER} r="4" fill="currentColor" />
      </svg>
      <figcaption className="font-mono text-sm">{description}</figcaption>
    </figure>
  );
});
