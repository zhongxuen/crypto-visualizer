'use client';

import { useProgress } from '@/components/state/useProgress';

/**
 * A learning-path node: the module number in a ring that fills in once its walkthrough
 * is finished (progress lives in the learner's own browser, `cv:v1`). The server render
 * and first paint show every ring empty; finished ones fill after hydration.
 */
export function ProgressNode({
  slug,
  number,
  ready,
}: {
  slug: string;
  number: number;
  ready: boolean;
}) {
  const { isComplete } = useProgress();
  const done = ready && isComplete(slug);
  return (
    <span className="relative inline-flex size-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 44 44" aria-hidden="true" className="absolute inset-0">
        <circle
          cx="22"
          cy="22"
          r="19"
          fill="var(--surface)"
          stroke={ready ? `var(--tint-${slug})` : 'var(--border-strong)'}
          strokeWidth="2"
          strokeDasharray={ready ? undefined : '3 4'}
        />
        {done ? (
          <circle
            cx="22"
            cy="22"
            r="19"
            fill={`var(--tint-${slug})`}
            className="motion-fade"
          />
        ) : null}
      </svg>
      <span
        aria-hidden="true"
        className="font-display relative text-base"
        style={{
          color: done ? 'var(--surface)' : ready ? `var(--tint-${slug})` : undefined,
        }}
      >
        {String(number).padStart(2, '0')}
      </span>
      {done ? <span className="sr-only">Finished.</span> : null}
    </span>
  );
}
