'use client';

import { useId } from 'react';

import { utf8Encode } from '@/core/bytes/utf8';
import { MAX_STEPPED_BYTES } from '@/core/sha256/sha256';
import { MAX_HMAC_KEY_BYTES, type HashingChapter } from '@/core/sha256/share';
import type { HashingShareState } from '@/core/sha256/state';

type Input = HashingShareState['input'];

export function FreePlayInputs({
  chapter,
  input,
  onChange,
  shareable,
}: {
  chapter: HashingChapter;
  input: Input;
  onChange: (patch: Partial<Input>) => void;
  shareable: boolean;
}) {
  const id = useId();
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';
  const bits = utf8Encode(input.message).length * 8;

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-message`}>
        Message (up to {MAX_STEPPED_BYTES} bytes, three blocks)
        <input
          id={`${id}-message`}
          className={field}
          value={input.message}
          onChange={(e) =>
            utf8Encode(e.target.value).length <= MAX_STEPPED_BYTES &&
            onChange({ message: e.target.value })
          }
        />
      </label>
      {chapter === 'avalanche' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-bit`}>
          Bit to flip (0 to {Math.max(0, bits - 1)}, from the left)
          <input
            id={`${id}-bit`}
            type="number"
            min={0}
            max={Math.max(0, bits - 1)}
            className={field}
            value={input.bit}
            onChange={(e) => {
              const bit = Number(e.target.value);
              if (Number.isInteger(bit) && bit >= 0 && bit < MAX_STEPPED_BYTES * 8)
                onChange({ bit });
            }}
          />
        </label>
      ) : null}
      {chapter === 'hmac' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-key`}>
          MAC key (up to {MAX_HMAC_KEY_BYTES} bytes; over 64 gets hashed first)
          <input
            id={`${id}-key`}
            className={field}
            value={input.key}
            onChange={(e) =>
              utf8Encode(e.target.value).length <= MAX_HMAC_KEY_BYTES &&
              onChange({ key: e.target.value })
            }
          />
        </label>
      ) : null}
      {!shareable ? (
        <p className="text-warn text-sm sm:col-span-2">
          This state is too large for a share link.
        </p>
      ) : null}
    </div>
  );
}
