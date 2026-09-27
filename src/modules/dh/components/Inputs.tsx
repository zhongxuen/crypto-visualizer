'use client';

import { useId, useState } from 'react';

import { privateProblem, privateRange, REALISTIC_PRIVATE_BITS } from '@/core/dh/dh';
import { mitmMessageProblem } from '@/core/dh/mitm';
import { DH_GROUPS, getGroup, type DhGroupId } from '@/core/dh/params';
import type { DhScene, DhShareState } from '@/core/dh/state';
import { cn } from '@/lib/cn';

type Input = DhShareState['input'];

const FIELD =
  'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';

/** Drop typed values that don't fit a newly picked group. */
export function fitToGroup(input: Input, group: DhGroupId): Partial<Input> {
  const g = getGroup(group);
  const fits = (x: number | undefined, check: (v: bigint) => string | null) =>
    x !== undefined && check(BigInt(x)) === null ? x : undefined;
  // The 2048-bit group always draws a and b from the seed.
  const key = (x: number | undefined) =>
    g.kind === 'toy' ? fits(x, (v) => privateProblem(v, g)) : undefined;
  return {
    group,
    a: key(input.a),
    b: key(input.b),
    msg: fits(input.msg, (v) => mitmMessageProblem(v, g)),
  };
}

/** A number box that commits only what core accepts, and says why otherwise. */
function NumberField({
  label,
  value,
  blank,
  check,
  testId,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  blank: string;
  check: (value: bigint) => string | null;
  testId: string;
  onCommit: (value: number | undefined) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const text = draft.trim();
  const message =
    text === ''
      ? blank
      : !/^\d{1,9}$/.test(text)
        ? 'Whole numbers only.'
        : (check(BigInt(text)) ?? `${text} works.`);
  const ok = text === '' || (/^\d{1,9}$/.test(text) && check(BigInt(text)) === null);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={FIELD}
        value={draft}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={!ok}
        aria-describedby={`${id}-feedback`}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          const t = next.trim();
          if (t === '') onCommit(undefined);
          else if (/^\d{1,9}$/.test(t) && check(BigInt(t)) === null) onCommit(Number(t));
        }}
      />
      <p
        id={`${id}-feedback`}
        aria-live="polite"
        data-testid={testId}
        className={ok ? 'text-fg-secondary' : 'text-warn'}
      >
        {message}
      </p>
    </div>
  );
}

export function FreePlayInputs({
  scene,
  input,
  seed,
  problem,
  shareable,
  onChange,
  onSeed,
}: {
  scene: DhScene;
  input: Input;
  seed: number;
  problem: string | null;
  shareable: boolean;
  onChange: (patch: Partial<Input>) => void;
  onSeed: (seed: number) => void;
}) {
  const id = useId();
  if (scene === 'paint') {
    return (
      <p className="border-border bg-surface text-fg-secondary rounded-lg border p-3 text-sm">
        The paint analogy has no numbers to choose. Pick another chapter to set p, g and
        the private keys.
      </p>
    );
  }
  const group = getGroup(input.group);
  const toy = group.kind === 'toy';
  const { min, max } = privateRange(group);

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-1 text-sm">
        <span id={`${id}-group`}>Group (p and g)</span>
        <div
          role="group"
          aria-labelledby={`${id}-group`}
          className="flex flex-wrap gap-1.5"
        >
          {DH_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={g.id === input.group}
              onClick={() => onChange(fitToGroup(input, g.id))}
              className={cn(
                'focus-visible:outline-focus rounded-md border px-3 py-1 text-sm focus-visible:outline-2',
                g.id === input.group
                  ? 'border-accent bg-accent text-accent-fg font-medium'
                  : 'border-border bg-surface text-fg-secondary hover:text-fg',
              )}
            >
              {g.kind === 'toy' ? `${g.name}, g = ${g.g}` : '2048-bit (RFC 3526)'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2" key={input.group}>
        {toy ? (
          <>
            <NumberField
              label={`Alice's private a (${min} to ${max})`}
              value={input.a}
              blank="Blank: a is drawn from the seed."
              check={(v) => privateProblem(v, group)}
              testId="dh-a-feedback"
              onCommit={(a) => onChange({ a })}
            />
            <NumberField
              label={`Bob's private b (${min} to ${max})`}
              value={input.b}
              blank="Blank: b is drawn from the seed."
              check={(v) => privateProblem(v, group)}
              testId="dh-b-feedback"
              onCommit={(b) => onChange({ b })}
            />
          </>
        ) : (
          <p className="text-fg-secondary text-sm sm:col-span-2">
            In the 2048-bit group a and b are {REALISTIC_PRIVATE_BITS}-bit numbers drawn
            from the seed, and each exponentiation is shown as one step.
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-seed`}>
          Seed for drawn keys (not cryptographic)
          <input
            id={`${id}-seed`}
            type="number"
            min={0}
            max={4294967295}
            className={FIELD}
            value={seed}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 0 && next <= 0xffffffff) onSeed(next);
            }}
          />
        </label>
        {scene === 'mitm' ? (
          <NumberField
            label={`Alice's message m (1 to ${group.p > 1_000_000_000n ? '999999999' : String(group.p - 1n)})`}
            value={input.msg}
            blank="Blank: 42, or p − 1 if p is smaller."
            check={(v) => mitmMessageProblem(v, group)}
            testId="dh-msg-feedback"
            onCommit={(msg) => onChange({ msg })}
          />
        ) : null}
      </div>
      {problem ? (
        <p className="text-warn text-sm" role="alert">
          {problem}
        </p>
      ) : null}
      {!shareable ? (
        <p className="text-warn text-sm">This state is too large for a share link.</p>
      ) : null}
    </div>
  );
}
