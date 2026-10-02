'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

import { measure, play, restartClass, type FlipRects } from './flip';
import { useStepTransition } from './useStepTransition';

/**
 * The motion primitives (docs/UIUX.md §6.3). Every one follows the same rules:
 *
 * - it animates only on a single step (`useStepTransition().animate`);
 * - a seek of more than one step shows the end frame at once (a 120 ms crossfade at
 *   most), and so does reduced motion, with nothing at all;
 * - the end frame is what the DOM holds from the first render, so the meaning never
 *   depends on the motion having run.
 *
 * The animation itself is a CSS keyframe in globals.css; these components only decide
 * whether to run it and restart it.
 */

type Trigger = string | number | boolean | null | undefined;

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Fade in and rise 4 px whenever `trigger` changes (the offset flips when stepping back).
 * `index` staggers siblings by `--stagger`.
 */
export function Reveal({
  trigger,
  index = 0,
  className,
  children,
}: {
  trigger: Trigger;
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const { animate, motion, direction } = useStepTransition();
  const style = {
    '--i': index,
    '--reveal-dir': direction === 'back' ? -1 : 1,
  } as CSSProperties;
  return (
    <span
      key={String(trigger)}
      style={style}
      className={cn(
        'block',
        animate ? 'motion-reveal' : motion ? 'motion-fade' : undefined,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A one-shot highlighter swipe on something that just changed. */
export function Pulse({
  trigger,
  active = true,
  className,
  children,
}: {
  trigger: Trigger;
  /** Only what changed pulses. */
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { animate } = useStepTransition();
  return (
    <span
      key={active && animate ? String(trigger) : 'still'}
      data-pulse={active && animate ? '' : undefined}
      className={cn('inline-block rounded-cell', active && animate && 'motion-pulse', className)}
    >
      {children}
    </span>
  );
}

/**
 * A staggered fill across a row of cells: each child gets `--i`, and the row restarts the
 * `cv-wave` keyframe when `trigger` changes.
 */
export function Wave({
  trigger,
  stagger = 8,
  className,
  children,
}: {
  trigger: Trigger;
  /** Milliseconds between neighbours. */
  stagger?: number;
  className?: string;
  children: ReactNode;
}) {
  const { animate } = useStepTransition();
  let i = 0;
  const items = Children.map(children, (child) => {
    if (!isValidElement<{ style?: CSSProperties }>(child)) return child;
    const style = { ...child.props.style, '--i': i++ } as CSSProperties;
    return cloneElement(child as ReactElement<{ style?: CSSProperties }>, { style });
  });
  return (
    <div
      key={animate ? String(trigger) : 'still'}
      style={{ '--wave-stagger': `${stagger}ms` } as CSSProperties}
      className={cn(animate && 'motion-wave', className)}
    >
      {items}
    </div>
  );
}

/**
 * Elements carrying `data-flip-key` glide from their old place to their new one when
 * `trigger` changes. Positions are measured relative to this container.
 */
export function Flip({
  trigger,
  className,
  children,
}: {
  trigger: Trigger;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rects = useRef<FlipRects>(new Map());
  const { animate } = useStepTransition();

  useIsomorphicLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const next = measure(root);
    if (animate) play(root, rects.current, next);
    rects.current = next;
  }, [trigger, animate]);

  return (
    <div ref={ref} data-flip-root="" className={className}>
      {children}
    </div>
  );
}

/**
 * A token that flies to where it is rendered from the element with id `from` (a byte to
 * the tape, a hash to the attacker's table, a mixture across the channel).
 */
export function Travel({
  from,
  trigger,
  className,
  children,
}: {
  /** The `id` of the element the token starts on. */
  from: string;
  trigger: Trigger;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { animate } = useStepTransition();

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    const source = document.getElementById(from);
    if (!node || !source || !animate) return;
    const a = source.getBoundingClientRect();
    const b = node.getBoundingClientRect();
    node.style.setProperty('--from-x', `${a.left - b.left}px`);
    node.style.setProperty('--from-y', `${a.top - b.top}px`);
    restartClass(node, 'motion-move');
  }, [trigger, animate, from]);

  return (
    <span ref={ref} data-travel={from} className={cn('inline-block', className)}>
      {children}
    </span>
  );
}

/** Below this, a decimal value counts up instead of flipping digits (UIUX §4.2). */
const COUNT_LIMIT = 1_000_000;

/**
 * A value that changes visibly: each digit that differs from the last step's flips
 * (`cv-flip-card`). With `count`, a whole number under 10⁶ counts to its new value
 * instead. The final text is in the DOM from the first frame either way (spoken by an
 * `sr-only` copy while counting), so nothing reads a half-way value.
 */
export function Morph({
  value,
  count = false,
  className,
}: {
  value: string | number;
  count?: boolean;
  className?: string;
}) {
  const text = String(value);
  const { animate, to } = useStepTransition();
  // What the value was on the previous step, kept for as long as this step is on screen.
  const [memory, setMemory] = useState({ text, step: to, before: text });
  let current = memory;
  if (memory.step !== to) {
    current = { text, step: to, before: memory.text };
    setMemory(current);
  } else if (memory.text !== text) {
    // The value changed without a step (an input edit): nothing to animate from.
    current = { text, step: to, before: text };
    setMemory(current);
  }
  const before = current.before;

  const from = Number(before);
  const target = Number(text);
  const counts =
    count &&
    animate &&
    before !== text &&
    Number.isInteger(from) &&
    Number.isInteger(target) &&
    Math.abs(from) < COUNT_LIMIT &&
    Math.abs(target) < COUNT_LIMIT;

  const shown = useCountUp(counts ? from : target, target, counts);

  if (counts) {
    return (
      <span className={cn('tabular-nums', className)}>
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{text}</span>
      </span>
    );
  }

  const flip = animate && before !== text;
  return (
    <span className={cn('tabular-nums', className)}>
      {flip
        ? [...text].map((char, i) => (
            <span
              key={`${i}:${char}:${to}`}
              className={
                char !== before[i] ? 'motion-flip-card inline-block' : undefined
              }
            >
              {char}
            </span>
          ))
        : text}
    </span>
  );
}

/** Count from `from` to `to` over one step's duration, once per change. */
function useCountUp(from: number, to: number, active: boolean): number {
  const [shown, setShown] = useState(to);
  useEffect(() => {
    if (!active || typeof requestAnimationFrame !== 'function') return;
    const duration = 320;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, active]);
  return active ? shown : to;
}
