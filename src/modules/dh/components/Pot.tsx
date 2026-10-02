import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';

/**
 * A pot of paint. Every colour here is one core produced (`#rrggbb` from its OKLab
 * model); the pot only paints it. The colour is decoration: the hex code is always
 * printed beside a pot, so nothing depends on seeing it.
 *
 * `pouring` shows the two paints that went in side by side, under the mixed colour,
 * and the mixed colour fades in over them: the blend. It is set only while a single step
 * animates, so a seek, a share link or reduced motion shows the mixed pot at once.
 */
export function Pot({
  colour,
  size = 'sm',
  pouring,
  className,
  style,
}: {
  colour: string;
  size?: 'sm' | 'md' | 'lg';
  /** The paints poured in, in order, while the blend plays. */
  pouring?: readonly string[];
  className?: string;
  style?: CSSProperties;
}) {
  const body = size === 'lg' ? 'h-20 w-18' : size === 'md' ? 'h-12 w-11' : 'h-7 w-6.5';
  const halves =
    pouring && pouring.length > 1
      ? `linear-gradient(90deg, ${pouring
          .map((c, i) => {
            const from = (i / pouring.length) * 100;
            const to = ((i + 1) / pouring.length) * 100;
            return `${c} ${from}% ${to}%`;
          })
          .join(', ')})`
      : undefined;
  return (
    <span
      aria-hidden="true"
      data-pot={colour}
      className={cn('inline-flex shrink-0 flex-col items-center', className)}
      style={style}
    >
      <span className="bg-border-strong h-1 w-[115%] rounded-full" />
      <span
        className={cn(
          'border-border-strong relative block overflow-hidden rounded-t-[3px] rounded-b-[45%] border-2 border-t-0',
          body,
        )}
      >
        {halves ? (
          <span className="absolute inset-0" style={{ background: halves }} />
        ) : null}
        <span
          data-blend={halves ? '' : undefined}
          className="absolute inset-0"
          style={{
            backgroundColor: colour,
            animation: halves
              ? 'cv-fade calc(var(--dur-step) * 0.8) var(--ease-in-out) calc(var(--dur-step) * 0.45) both'
              : undefined,
          }}
        />
        {/* A highlight on the paint's surface, so a pot reads as a pot. */}
        <span className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/25" />
      </span>
    </span>
  );
}
