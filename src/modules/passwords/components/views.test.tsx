import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StepTransitionProvider } from '@/components/motion';
import type { KdfEvent } from '@/core/kdf/events';
import { passwordTableRun } from '@/core/kdf/lookupTable';
import { pbkdf2Run } from '@/core/kdf/pbkdf2';
import { PASSWORDS_SHARE } from '@/core/kdf/share';

import {
  PROGRESS_INTERVAL_MS,
  usePbkdf2Worker,
  type Pbkdf2Job,
} from '../usePbkdf2Worker';
import { CostView, ITERATION_STOPS, nearestStop } from './CostView';
import { Odometer, odometerText } from './Odometer';
import { Pbkdf2View } from './Pbkdf2View';
import { Phase, PhaseContext } from './Phase';
import { AttackerTable, PairView, tableStateAt, UsersTable } from './UsersView';

/**
 * The module's own animations (UIUX §7.2, module 3): each plays on a single step, and
 * a seek or reduced motion shows the same end state at once.
 */

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

/** jsdom has no Web Animations API: record what would have played. */
let played: { node: Element; keyframes: Keyframe[] }[] = [];
let restore: (() => void) | null = null;
beforeEach(() => {
  played = [];
  Element.prototype.animate = function (this: Element, keyframes: Keyframe[]) {
    played.push({ node: this, keyframes });
    return { cancel() {} } as Animation;
  } as Element['animate'];
});
afterEach(() => {
  restore?.();
  restore = null;
  delete (Element.prototype as Partial<Element>).animate;
});

const unsalted = passwordTableRun({ seed: null }).events;
const salted = passwordTableRun({ seed: 7 }).events;

/** The users and attacker views for step `index` of a password-table run. */
function TableStep({ events, index }: { events: readonly KdfEvent[]; index: number }) {
  const event = events[index];
  const state = tableStateAt(events, index);
  return (
    <>
      <UsersTable
        users={state.users}
        salted={state.salted}
        lookups={state.lookups}
        current={event.kind === 'kdf.lookup' ? event.name : undefined}
        pair={event.kind === 'kdf.collision' ? event.names : undefined}
        step={index}
      />
      {event.kind === 'kdf.collision' ? (
        <PairView event={event} users={state.users} step={index} />
      ) : null}
      {state.table || state.lookups.length > 0 ? (
        <AttackerTable
          table={state.table}
          lookups={state.lookups}
          current={event.kind === 'kdf.lookup' ? event : undefined}
          salted={state.salted}
          step={index}
        />
      ) : null}
    </>
  );
}

function stepFrom(events: readonly KdfEvent[], from: number, to: number) {
  const ui = (step: number): ReactNode => (
    <StepTransitionProvider step={step}>
      <TableStep events={events} index={step} />
    </StepTransitionProvider>
  );
  const view = render(ui(from));
  view.rerender(ui(to));
  return view;
}

const indexOf = (events: readonly KdfEvent[], test: (e: KdfEvent) => boolean) =>
  events.findIndex(test);

// The first render builds the attacker's table; under a loaded run that can pass 5 s.
describe('the unsalted lookup', { timeout: 20_000 }, () => {
  const hit = indexOf(unsalted, (e) => e.kind === 'kdf.lookup' && e.hit);
  const miss = indexOf(unsalted, (e) => e.kind === 'kdf.lookup' && !e.hit);

  it('sends the hash to the table, lights the matched row and stamps the user', () => {
    const { container } = stepFrom(unsalted, hit - 1, hit);
    const travel = container.querySelector('[data-travel="pw-hash-alice"]');
    expect(travel).not.toBeNull();
    expect(container.querySelector('[data-lookup="hit"]')).toHaveTextContent(
      'found “sunshine”',
    );
    // The attacker's table gained alice's row, lit as the current one.
    const table = screen.getByRole('table', { name: /attacker’s table/ });
    const row = within(table).getByText('sunshine').closest('tr')!;
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(row.querySelector('[data-pulse]')).not.toBeNull();
    // The stamp lands on alice's row.
    const stamp = container.querySelector('[data-stamp]')!;
    expect(stamp).toHaveTextContent('Cracked');
    expect(played.some((p) => p.node === stamp)).toBe(true);
  });

  it('shakes a miss once', () => {
    const { container } = stepFrom(unsalted, miss - 1, miss);
    const line = container.querySelector('[data-lookup="miss"]')!;
    expect(line).toHaveTextContent('no match');
    expect(played.filter((p) => p.node === line)).toHaveLength(1);
  });

  it('shows the end state at once on a seek', () => {
    const last = unsalted.length - 1;
    const { container } = stepFrom(unsalted, 0, last);
    expect(played).toHaveLength(0);
    expect(container.querySelector('.motion-move')).toBeNull();
    expect(screen.getAllByText('Cracked')).toHaveLength(4);
  });

  it('shows the end state at once under reduced motion', () => {
    restore = reduceMotion();
    const { container } = stepFrom(unsalted, hit - 1, hit);
    expect(played).toHaveLength(0);
    expect(container.querySelector('[data-pulse]')).toBeNull();
    expect(container.querySelector('.motion-move')).toBeNull();
    expect(screen.getByText('Cracked')).toBeInTheDocument();
    expect(container.querySelector('[data-lookup="hit"]')).toBeInTheDocument();
  });
});

describe('the salt drop', () => {
  const collision = indexOf(salted, (e) => e.kind === 'kdf.collision');

  it('drops each salt onto the password, and the two hashes come out different', () => {
    const { container } = stepFrom(salted, collision - 1, collision);
    const group = screen.getByRole('group', { name: /alice and carol/ });
    const chips = group.querySelectorAll('[data-salt-drop]');
    expect(chips).toHaveLength(2);
    expect(played.filter((p) => p.node.hasAttribute('data-salt-drop'))).toHaveLength(2);
    expect(group).toHaveTextContent('Different hashes from the same password');
    expect(group.querySelectorAll('mark').length).toBeGreaterThan(0);
    expect(container.querySelector('.motion-reveal')).not.toBeNull();
  });

  it('shows the dropped salts at once under reduced motion', () => {
    restore = reduceMotion();
    stepFrom(salted, collision - 1, collision);
    const group = screen.getByRole('group', { name: /alice and carol/ });
    expect(group.querySelectorAll('[data-salt-drop]')).toHaveLength(2);
    expect(played).toHaveLength(0);
  });

  it('unsalted, the two lanes give the same hash', () => {
    const at = indexOf(unsalted, (e) => e.kind === 'kdf.collision');
    stepFrom(unsalted, at - 1, at);
    const group = screen.getByRole('group', { name: /alice and carol/ });
    expect(group).toHaveTextContent('The same hash');
    expect(group.querySelectorAll('mark')).toHaveLength(0);
  });

  it('every salted lookup misses', () => {
    const last = salted.length - 1;
    stepFrom(salted, last - 1, last);
    expect(screen.queryByText('Cracked')).toBeNull();
    expect(screen.getByText(/the table has no salted hashes/)).toBeInTheDocument();
  });
});

describe('the PBKDF2 odometer', () => {
  it('pads to the total and groups digits', () => {
    expect(odometerText(3, 600_000)).toBe('000,003');
    expect(odometerText(600_000, 600_000)).toBe('600,000');
    expect(odometerText(12, 1)).toBe('12');
  });

  it('rolls each digit to its value, and speaks the number once', () => {
    const { container } = render(
      <Odometer value={125_000} max={600_000} label="iterations" />,
    );
    const wheels = container.querySelectorAll<HTMLElement>('[aria-hidden] .flex-col');
    expect(wheels).toHaveLength(6);
    expect(wheels[0].style.transform).toBe('translateY(-10%)');
    expect(wheels[1].style.transform).toBe('translateY(-20%)');
    expect(screen.getByText('125,000 iterations')).toHaveClass('sr-only');
  });

  it('jumps without a transition when not smooth (a seek)', () => {
    const { container } = render(
      <Odometer value={3} max={600_000} smooth={false} label="iterations" />,
    );
    expect(container.querySelector('.transition-transform')).toBeNull();
  });
});

/** A stand-in Worker that the test drives by hand. */
class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  terminated = false;
  constructor() {
    FakeWorker.last = this;
  }
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe('the Worker feeding the odometer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('re-renders at most ten times a second however often the Worker reports', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return usePbkdf2Worker();
    });
    act(() =>
      result.current.start({ password: [1], salt: [2], iterations: 600_000, dkLen: 32 }),
    );
    const before = renders;
    const worker = FakeWorker.last!;
    // 120 reports inside one 100 ms window.
    act(() => {
      for (let done = 5_000; done <= 600_000; done += 5_000) {
        worker.emit({ type: 'progress', done, total: 600_000 });
      }
    });
    expect(renders).toBe(before);
    act(() => {
      vi.advanceTimersByTime(PROGRESS_INTERVAL_MS);
    });
    expect(renders).toBe(before + 1);
    expect(result.current.done).toBe(600_000);

    act(() => worker.emit({ type: 'done', dk: [9, 9], ms: 750 }));
    expect(result.current.status).toBe('done');
    expect(result.current.ms).toBe(750);
    expect(worker.terminated).toBe(true);
  });

  it('cancel stops the Worker and drops a pending update', () => {
    const { result } = renderHook(() => usePbkdf2Worker());
    act(() =>
      result.current.start({ password: [1], salt: [2], iterations: 600_000, dkLen: 32 }),
    );
    const worker = FakeWorker.last!;
    act(() => worker.emit({ type: 'progress', done: 5_000, total: 600_000 }));
    act(() => result.current.cancel());
    act(() => {
      vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 2);
    });
    expect(result.current.status).toBe('cancelled');
    expect(result.current.done).toBe(0);
    expect(worker.terminated).toBe(true);
  });
});

describe('the time-to-crack bars', () => {
  const input = { ...PASSWORDS_SHARE.defaults.input };

  it('snaps the iteration slider to its stops', () => {
    expect(nearestStop(600_000)).toBe(ITERATION_STOPS.indexOf(600_000));
    expect(nearestStop(550_000)).toBe(ITERATION_STOPS.indexOf(600_000));
    expect(nearestStop(1)).toBe(0);
  });

  it('grows a bar and morphs its label when a slider moves', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <CostView input={input} onChange={onChange} />,
    );
    const widths = () =>
      [...container.querySelectorAll('[data-bar-width]')].map((bar) =>
        Number(bar.getAttribute('data-bar-width')),
      );
    const before = widths();
    expect(container.querySelector('.motion-reveal')).toBeNull();

    fireEvent.change(screen.getByLabelText(/^PBKDF2 iterations/), {
      target: { value: String(ITERATION_STOPS.length - 1) },
    });
    expect(onChange).toHaveBeenCalledWith({ iterations: 10_000_000 });

    rerender(
      <CostView input={{ ...input, iterations: 10_000_000 }} onChange={onChange} />,
    );
    const after = widths();
    // PBKDF2's bar (and only the schemes it drives) grew.
    expect(after.some((width, i) => width > before[i])).toBe(true);
    expect(container.querySelector('.motion-reveal')).not.toBeNull();
    expect(container.querySelector('.transition-\\[width\\]')).not.toBeNull();
  });

  it('changes the label without motion under reduced motion', () => {
    restore = reduceMotion();
    const { container, rerender } = render(
      <CostView input={input} onChange={() => {}} />,
    );
    rerender(<CostView input={{ ...input, gpus: 1_000 }} onChange={() => {}} />);
    expect(container.querySelector('.motion-reveal')).toBeNull();
  });
});

describe('the lesson follows the timeline', () => {
  it('marks the current phase’s paragraph and mutes the rest', () => {
    render(
      <PhaseContext.Provider value="b">
        <Phase id="a">First</Phase>
        <Phase id="b">Second</Phase>
      </PhaseContext.Provider>,
    );
    expect(screen.getByText('Second')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('First')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('First')).toHaveClass('text-fg-muted');
  });

  it('reads every paragraph normally with no run', () => {
    render(<Phase id="a">Only</Phase>);
    expect(screen.getByText('Only')).not.toHaveClass('text-fg-muted');
  });
});

describe('the PBKDF2 steps', () => {
  const bytes = (text: string) => Uint8Array.from([...text].map((c) => c.charCodeAt(0)));
  const run = pbkdf2Run({
    password: bytes('passwd'),
    salt: bytes('salt'),
    iterations: 600_000,
    dkLen: 32,
    finish: false,
  });
  const job = (patch: Partial<Pbkdf2Job>): Pbkdf2Job => ({
    status: 'idle',
    done: 0,
    total: 600_000,
    elapsed: 0,
    dk: null,
    ms: null,
    error: null,
    start() {},
    cancel() {},
    reset() {},
    ...patch,
  });
  const at = (index: number, j: Pbkdf2Job = job({})) => (
    <StepTransitionProvider step={index}>
      <Pbkdf2View
        event={run.events[index]}
        step={index}
        total={600_000}
        format="hex"
        job={j}
        onStart={() => {}}
      />
    </StepTransitionProvider>
  );

  it('counts each stepped iteration and folds the new U into T with a pulse', () => {
    const { container, rerender } = render(at(1));
    rerender(at(2));
    expect(container.querySelector('[data-odometer]')).toHaveAttribute(
      'data-odometer',
      '2',
    );
    expect(screen.getByLabelText('T = U1 XOR … XOR U2')).toBeInTheDocument();
    expect(container.querySelector('[data-pulse]')).not.toBeNull();
    expect(container.querySelector('.motion-reveal')).toHaveTextContent('U2');
  });

  it('shows the fold without motion under reduced motion', () => {
    restore = reduceMotion();
    const { container, rerender } = render(at(1));
    rerender(at(2));
    expect(container.querySelector('[data-pulse]')).toBeNull();
    expect(container.querySelector('.motion-reveal')).toBeNull();
    expect(container.querySelector('.transition-transform')).toBeNull();
    expect(screen.getByLabelText('T = U1 XOR … XOR U2')).toBeInTheDocument();
  });

  it('drives the odometer from the Worker, with this device’s time per guess', () => {
    const rest = run.events.length - 1;
    const { container, rerender } = render(at(rest));
    expect(container.querySelector('[data-odometer]')).toHaveAttribute(
      'data-odometer',
      '3',
    );
    rerender(at(rest, job({ status: 'running', done: 300_000, elapsed: 500 })));
    expect(container.querySelector('[data-odometer]')).toHaveAttribute(
      'data-odometer',
      '300000',
    );
    expect(container.querySelector('[data-per-guess]')).toHaveTextContent(
      'About 1.0 s per guess on this device',
    );
    rerender(
      at(rest, job({ status: 'done', done: 600_000, elapsed: 750, ms: 750, dk: [1, 2] })),
    );
    expect(container.querySelector('[data-per-guess]')).toHaveTextContent(
      'One guess took 750 ms on this device',
    );
    expect(screen.getByText(/Derived key:/).parentElement).toHaveTextContent('0102');
  });
});
