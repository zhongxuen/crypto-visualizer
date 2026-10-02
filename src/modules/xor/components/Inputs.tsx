'use client';

import { RefreshCw } from 'lucide-react';
import { useId } from 'react';

import { BUTTON } from '@/components/timeline';
import { utf8Encode } from '@/core/bytes/utf8';
import { MAX_TEXT_BYTES } from '@/core/xor/encode';
import { XOR_SHARE, type XorChapter } from '@/core/xor/share';

const DEFAULTS = XOR_SHARE.defaults.input;

/** Free play's inputs: loaded after hydration with the runs (`../runs.ts`). */
export function FreePlayInputs({
  chapter,
  input,
  onChange,
  onNewKey,
  shareable,
}: {
  chapter: XorChapter;
  input: typeof DEFAULTS;
  onChange: (patch: Partial<typeof DEFAULTS>) => void;
  onNewKey: () => void;
  shareable: boolean;
}) {
  const id = useId();
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';
  const fits = (text: string) => utf8Encode(text).length <= MAX_TEXT_BYTES;

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-a`}>
        {chapter === 'ttp' ? 'Message 1' : 'Your text'} (up to {MAX_TEXT_BYTES} bytes)
        <input
          id={`${id}-a`}
          className={field}
          value={input.a}
          onChange={(e) => fits(e.target.value) && onChange({ a: e.target.value })}
        />
      </label>
      {chapter === 'ttp' ? (
        <>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-b`}>
            Message 2, encrypted with the same key
            <input
              id={`${id}-b`}
              className={field}
              value={input.b}
              onChange={(e) => fits(e.target.value) && onChange({ b: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-crib`}>
            Crib: a word you guess is in one message
            <input
              id={`${id}-crib`}
              className={field}
              value={input.crib}
              maxLength={16}
              onChange={(e) => onChange({ crib: e.target.value })}
            />
          </label>
        </>
      ) : null}
      {chapter === 'xor' || chapter === 'otp' || chapter === 'ttp' ? (
        <div className="flex items-end">
          <button type="button" className={BUTTON} onClick={onNewKey}>
            <RefreshCw aria-hidden="true" className="size-4" />
            New random key
          </button>
        </div>
      ) : null}
      {!shareable ? (
        <p className="text-warn text-sm sm:col-span-2">
          This state is too large to fit in a share link.
        </p>
      ) : null}
    </div>
  );
}
