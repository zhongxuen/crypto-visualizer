'use client';

import { TriangleAlert } from 'lucide-react';
import { useId } from 'react';

import { PBKDF2_EXAMPLES, type PasswordsChapter } from '@/core/kdf/share';
import type { PasswordsShareState } from '@/core/kdf/state';

type Input = PasswordsShareState['input'];

/**
 * PRIVACY: `typed` is the learner's own password. It belongs to the page's memory
 * (`PasswordsModule`); this form only shows it and reports edits.
 */
export function FreePlayInputs({
  chapter,
  input,
  onChange,
  typed,
  onTyped,
}: {
  chapter: PasswordsChapter;
  input: Input;
  onChange: (patch: Partial<Input>) => void;
  typed: string;
  onTyped: (value: string) => void;
}) {
  const id = useId();
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1 text-sm sm:col-span-2">
        <label htmlFor={`${id}-own`}>Try your own password</label>
        <input
          id={`${id}-own`}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={field}
          value={typed}
          maxLength={64}
          onChange={(e) => onTyped(e.target.value)}
          aria-describedby={`${id}-own-note`}
          data-private=""
        />
        <p
          id={`${id}-own-note`}
          className="border-warn text-fg bg-surface-overlay flex gap-2 rounded-md border-l-4 px-3 py-2 text-sm"
        >
          <TriangleAlert
            aria-hidden="true"
            className="text-warn mt-0.5 size-4 shrink-0"
          />
          <span>
            <strong className="font-semibold">Don’t type a real password.</strong> It
            stays in this page’s memory only: it is never put in the link, in your
            browser’s storage or in analytics, and a share link won’t include it.
          </span>
        </p>
      </div>
      {chapter === 'lookup' || chapter === 'salt' ? (
        <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-salt`}>
          <input
            id={`${id}-salt`}
            type="checkbox"
            checked={chapter === 'salt'}
            onChange={(e) => onChange({ chapter: e.target.checked ? 'salt' : 'lookup' })}
            className="accent-accent size-4"
          />
          Salt the hashes
        </label>
      ) : null}
      {chapter === 'pbkdf2' ? (
        <>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-example`}>
            Built-in example {typed ? '(its salt is used with your password)' : ''}
            <select
              id={`${id}-example`}
              className="border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-sans focus-visible:outline-2"
              value={input.exampleId}
              onChange={(e) =>
                onChange({ exampleId: e.target.value as Input['exampleId'] })
              }
            >
              {PBKDF2_EXAMPLES.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-iterations`}>
            Iterations
            <input
              id={`${id}-iterations`}
              type="number"
              min={1}
              max={10_000_000}
              className={field}
              value={input.iterations}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isInteger(value) && value >= 1 && value <= 10_000_000) {
                  onChange({ iterations: value });
                }
              }}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
