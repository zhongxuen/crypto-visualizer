import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { measure, play } from './flip';
import { Flip, Morph, Pulse, Reveal, Travel, Wave } from './primitives';
import { describeStep, StepTransitionProvider } from './useStepTransition';

/**
 * Every primitive: it plays on one step, and shows its end frame at once on a seek of
 * more than one step and under reduced motion (docs/UIUX.md §6.1, §6.3).
 */

/** Pretend the viewer asked for reduced motion. */
function reduceMotion() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    ...original(query),
    matches: query.includes('reduce'),
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

/** Render `ui(step)` at step `from`, then move to step `to`. */
function stepFrom(from: number, to: number, ui: (step: number) => ReactNode) {
  const view = render(
    <StepTransitionProvider step={from}>{ui(from)}</StepTransitionProvider>,
  );
  view.rerender(<StepTransitionProvider step={to}>{ui(to)}</StepTransitionProvider>);
  return view;
}

/** jsdom has no layout: give each node a position from its `data-x`. */
function fakeLayout() {
  return vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      const x = Number(this.getAttribute('data-x') ?? 0);
      return {
        left: x,
        top: 0,
        x,
        y: 0,
        width: 10,
        height: 10,
        right: x + 10,
        bottom: 10,
        toJSON() {},
      } as DOMRect;
    });
}

describe('describeStep', () => {
  it('tells a step, a step back and a seek apart', () => {
    expect(describeStep(3, 4, false)).toMatchObject({
      direction: 'forward',
      isSeek: false,
      animate: true,
    });
    expect(describeStep(4, 3, false)).toMatchObject({ direction: 'back', animate: true });
    expect(describeStep(0, 9, false)).toMatchObject({
      isSeek: true,
      animate: false,
      motion: true,
    });
    expect(describeStep(2, 2, false)).toMatchObject({
      direction: 'none',
      animate: false,
    });
  });

  it('never animates under reduced motion', () => {
    expect(describeStep(3, 4, true)).toMatchObject({ animate: false, motion: false });
  });
});

describe('Reveal', () => {
  const ui = (step: number) => <Reveal trigger={step}>Step {step}</Reveal>;

  it('rises in on one step, and from the other side on a step back', () => {
    const { rerender } = stepFrom(1, 2, ui);
    const node = screen.getByText('Step 2');
    expect(node).toHaveClass('motion-reveal');
    expect(node.style.getPropertyValue('--reveal-dir')).toBe('1');
    rerender(<StepTransitionProvider step={1}>{ui(1)}</StepTransitionProvider>);
    expect(screen.getByText('Step 1').style.getPropertyValue('--reveal-dir')).toBe('-1');
  });

  it('only crossfades on a seek', () => {
    stepFrom(0, 7, ui);
    expect(screen.getByText('Step 7')).toHaveClass('motion-fade');
    expect(screen.getByText('Step 7')).not.toHaveClass('motion-reveal');
  });

  it('is still under reduced motion', () => {
    restore = reduceMotion();
    stepFrom(1, 2, ui);
    expect(screen.getByText('Step 2').className).not.toMatch(/motion-/);
  });
});

describe('Morph', () => {
  const values = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
  const ui = (step: number) => <Morph value={values[step]} />;

  it('flips only the digits that changed', () => {
    const { container } = stepFrom(1, 2, ui);
    expect(container).toHaveTextContent('12');
    const flipped = container.querySelectorAll('.motion-flip-card');
    expect([...flipped].map((node) => node.textContent)).toEqual(['2']);
  });

  it('shows the final value at once on a seek', () => {
    const { container } = stepFrom(0, 9, ui);
    expect(container).toHaveTextContent('19');
    expect(container.querySelector('.motion-flip-card')).toBeNull();
  });

  it('shows the final value at once under reduced motion', () => {
    restore = reduceMotion();
    const { container } = stepFrom(1, 2, ui);
    expect(container).toHaveTextContent('12');
    expect(container.querySelector('.motion-flip-card')).toBeNull();
  });

  it('does not animate an input edit within one step', () => {
    const { container, rerender } = render(
      <StepTransitionProvider step={0}>
        <Morph value="aa" />
      </StepTransitionProvider>,
    );
    rerender(
      <StepTransitionProvider step={0}>
        <Morph value="ab" />
      </StepTransitionProvider>,
    );
    expect(container.querySelector('.motion-flip-card')).toBeNull();
  });

  it('counts small numbers while saying the final value', () => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const { container } = stepFrom(1, 2, (step) => <Morph count value={step * 100} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('200');
    vi.unstubAllGlobals();
  });

  it('does not count on a seek', () => {
    const { container } = stepFrom(0, 5, (step) => <Morph count value={step * 100} />);
    expect(container.textContent).toBe('500');
  });
});

describe('Pulse', () => {
  const ui = (step: number) => (
    <Pulse trigger={step} active={step % 2 === 0}>
      v{step}
    </Pulse>
  );

  it('pulses what changed on one step', () => {
    stepFrom(1, 2, ui);
    expect(screen.getByText('v2')).toHaveClass('motion-pulse');
  });

  it('does not pulse what did not change', () => {
    stepFrom(2, 3, ui);
    expect(screen.getByText('v3')).not.toHaveClass('motion-pulse');
  });

  it('does not pulse on a seek', () => {
    stepFrom(0, 4, ui);
    expect(screen.getByText('v4')).not.toHaveClass('motion-pulse');
  });

  it('does not pulse under reduced motion', () => {
    restore = reduceMotion();
    stepFrom(1, 2, ui);
    expect(screen.getByText('v2')).not.toHaveClass('motion-pulse');
  });
});

describe('Wave', () => {
  const ui = (step: number) => (
    <Wave trigger={step}>
      <span>a{step}</span>
      <span>b{step}</span>
    </Wave>
  );

  it('staggers its children on one step', () => {
    stepFrom(1, 2, ui);
    expect(screen.getByText('a2').parentElement).toHaveClass('motion-wave');
    expect(screen.getByText('b2').style.getPropertyValue('--i')).toBe('1');
  });

  it('is still on a seek', () => {
    stepFrom(0, 3, ui);
    expect(screen.getByText('a3').parentElement).not.toHaveClass('motion-wave');
  });

  it('is still under reduced motion', () => {
    restore = reduceMotion();
    stepFrom(1, 2, ui);
    expect(screen.getByText('a2').parentElement).not.toHaveClass('motion-wave');
  });
});

describe('flip.ts', () => {
  it('starts each moved node from its old place', () => {
    const spy = fakeLayout();
    document.body.innerHTML =
      '<div id="r"><span data-flip-key="a" data-x="40"></span><span data-flip-key="b"></span></div>';
    const root = document.getElementById('r')!;
    const before = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 0, y: 0 }],
    ]);
    expect(play(root, before, measure(root))).toBe(1);
    const node = root.querySelector<HTMLElement>('[data-flip-key="a"]')!;
    expect(node.style.getPropertyValue('--from-x')).toBe('-40px');
    expect(node).toHaveClass('motion-move');
    spy.mockRestore();
    document.body.innerHTML = '';
  });
});

describe('Flip', () => {
  const ui = (step: number) => (
    <Flip trigger={step}>
      {/* The cell moves 30 px right on each step. */}
      <span data-flip-key="cell" data-x={step * 30}>
        cell
      </span>
    </Flip>
  );

  it('glides a cell on one step', () => {
    const spy = fakeLayout();
    stepFrom(1, 2, ui);
    expect(screen.getByText('cell')).toHaveClass('motion-move');
    expect(screen.getByText('cell').style.getPropertyValue('--from-x')).toBe('-30px');
    spy.mockRestore();
  });

  it('lands at once on a seek', () => {
    const spy = fakeLayout();
    stepFrom(0, 5, ui);
    expect(screen.getByText('cell')).not.toHaveClass('motion-move');
    spy.mockRestore();
  });

  it('lands at once under reduced motion', () => {
    const spy = fakeLayout();
    restore = reduceMotion();
    stepFrom(1, 2, ui);
    expect(screen.getByText('cell')).not.toHaveClass('motion-move');
    spy.mockRestore();
  });
});

describe('Travel', () => {
  const ui = (step: number) => (
    <>
      <span id="source" data-x="100">
        source
      </span>
      <Travel from="source" trigger={step}>
        <span>token {step}</span>
      </Travel>
    </>
  );

  it('flies from its source on one step', () => {
    const spy = fakeLayout();
    stepFrom(1, 2, ui);
    const token = screen.getByText('token 2').parentElement!;
    expect(token).toHaveClass('motion-move');
    expect(token.style.getPropertyValue('--from-x')).toBe('100px');
    spy.mockRestore();
  });

  it('is already home on a seek', () => {
    stepFrom(0, 6, ui);
    expect(screen.getByText('token 6').parentElement).not.toHaveClass('motion-move');
  });

  it('is already home under reduced motion', () => {
    restore = reduceMotion();
    stepFrom(1, 2, ui);
    expect(screen.getByText('token 2').parentElement).not.toHaveClass('motion-move');
  });
});
