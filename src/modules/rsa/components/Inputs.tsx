'use client';

import { useId, useState } from 'react';

import { utf8Encode } from '@/core/bytes/utf8';
import { primeProblem, REALISTIC_BITS } from '@/core/rsa/keygen';
import { trialDivision } from '@/core/rsa/primes';
import { MAX_SIGN_TEXT_BYTES } from '@/core/rsa/sign';
import {
  MAX_MESSAGE_DIGITS,
  RSA_MODES,
  type RsaChapter,
  type RsaShareState,
} from '@/core/rsa/state';
import { cn } from '@/lib/cn';

type Input = RsaShareState['input'];

const FIELD =
  'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';

const MODE_NAMES = { paper: 'Paper (small primes)', realistic: 'Realistic (big primes)' };

function Toggle<T extends string | number>({
  label,
  options,
  value,
  names,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  names: (option: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'focus-visible:outline-focus rounded-md border px-3 py-1 text-sm focus-visible:outline-2',
            option === value
              ? 'border-accent bg-accent text-accent-fg font-medium'
              : 'border-border bg-surface text-fg-secondary hover:text-fg',
          )}
        >
          {names(option)}
        </button>
      ))}
    </div>
  );
}

/** The paper / realistic switch. */
export function NumberModeToggle({
  value,
  onChange,
}: {
  value: Input['mode'];
  onChange: (mode: Input['mode']) => void;
}) {
  return (
    <Toggle
      label="Number size"
      options={RSA_MODES}
      value={value}
      names={(m) => MODE_NAMES[m]}
      onChange={onChange}
    />
  );
}

/** "Is it prime?" for what's typed, in words. Uses core's trial division. */
function primeFeedback(text: string, name: string): { ok: boolean; message: string } {
  if (text.trim() === '') {
    return { ok: true, message: `Blank: ${name} is drawn from the seed.` };
  }
  if (!/^\d+$/.test(text.trim())) return { ok: false, message: 'Whole numbers only.' };
  const value = BigInt(text.trim());
  const problem = primeProblem(value, name);
  if (problem) return { ok: false, message: problem };
  const { checkedUpTo } = trialDivision(value);
  return {
    ok: true,
    message: `${value} is prime: nothing from 2 to ${checkedUpTo} divides it.`,
  };
}

/** A number box for p or q, with "is it prime?" feedback as you type. */
function PrimePicker({
  name,
  value,
  onCommit,
}: {
  name: 'p' | 'q';
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const feedback = primeFeedback(draft, name);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>Prime {name} (below 1,000,000)</label>
      <input
        id={id}
        className={FIELD}
        value={draft}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={!feedback.ok}
        aria-describedby={`${id}-feedback`}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          if (text.trim() === '') onCommit(undefined);
          else if (primeFeedback(text, name).ok) onCommit(Number(text.trim()));
        }}
      />
      <p
        id={`${id}-feedback`}
        aria-live="polite"
        data-testid={`rsa-${name}-feedback`}
        className={feedback.ok ? 'text-fg-secondary' : 'text-warn'}
      >
        {feedback.message}
      </p>
    </div>
  );
}

export function FreePlayInputs({
  chapter,
  input,
  seed,
  problem,
  shareable,
  onChange,
  onSeed,
}: {
  chapter: RsaChapter;
  input: Input;
  seed: number;
  problem: string | null;
  shareable: boolean;
  onChange: (patch: Partial<Input>) => void;
  onSeed: (seed: number) => void;
}) {
  const id = useId();
  const [eDraft, setEDraft] = useState(input.e === undefined ? '' : String(input.e));
  const [msgDraft, setMsgDraft] = useState(input.msg);
  const [textDraft, setTextDraft] = useState(input.text);
  const paper = input.mode === 'paper';
  const usesMessage = chapter === 'encrypt' || chapter === 'malleability';

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3">
      <NumberModeToggle value={input.mode} onChange={(mode) => onChange({ mode })} />
      <div className="grid gap-3 sm:grid-cols-2">
        {paper ? (
          <>
            <PrimePicker name="p" value={input.p} onCommit={(p) => onChange({ p })} />
            <PrimePicker name="q" value={input.q} onCommit={(q) => onChange({ q })} />
            <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-e`}>
              Public exponent e (blank: 65537 or the smallest that works)
              <input
                id={`${id}-e`}
                className={FIELD}
                value={eDraft}
                inputMode="numeric"
                autoComplete="off"
                onChange={(e) => {
                  const text = e.target.value.trim();
                  setEDraft(e.target.value);
                  if (text === '') onChange({ e: undefined });
                  else if (/^\d{1,15}$/.test(text) && Number(text) >= 2) {
                    onChange({ e: Number(text) });
                  }
                }}
              />
            </label>
          </>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            <span>Size of n (bits)</span>
            <Toggle
              label="Size of n"
              options={REALISTIC_BITS}
              value={input.bits}
              names={(b) => `${b}-bit`}
              onChange={(bits) => onChange({ bits })}
            />
            <span className="text-fg-muted text-xs">
              e = 65537. Real RSA uses 2048 bits or more.
            </span>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-seed`}>
          Seed for drawn primes (not cryptographic)
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
        {usesMessage ? (
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-m`}>
            Message m (a whole number below n)
            <input
              id={`${id}-m`}
              className={FIELD}
              value={msgDraft}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => {
                const text = e.target.value.trim();
                setMsgDraft(e.target.value);
                if (/^\d+$/.test(text) && text.length <= MAX_MESSAGE_DIGITS) {
                  onChange({ msg: text });
                }
              }}
            />
          </label>
        ) : null}
        {chapter === 'sign' ? (
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-text`}>
            Message to sign (up to {MAX_SIGN_TEXT_BYTES} bytes)
            <input
              id={`${id}-text`}
              className={FIELD}
              value={textDraft}
              onChange={(e) => {
                if (utf8Encode(e.target.value).length > MAX_SIGN_TEXT_BYTES) return;
                setTextDraft(e.target.value);
                onChange({ text: e.target.value });
              }}
            />
          </label>
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
