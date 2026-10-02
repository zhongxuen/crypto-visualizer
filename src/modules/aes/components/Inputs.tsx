'use client';

import { useId, useState } from 'react';

import { MAX_MODE_BYTES } from '@/core/aes/modes/common';
import type { AesChapter } from '@/core/aes/share';
import type { AesShareState } from '@/core/aes/state';
import { bytesToHex, hexToBytes } from '@/core/bytes/hex';
import { utf8Decode, utf8Encode } from '@/core/bytes/utf8';

import { inputProblem } from '../inputProblem';

type AesInput = AesShareState['input'];

/** Lowercase hex without spaces, or `null` if it isn't whole bytes of hex. */
function normalizeHex(text: string): string | null {
  const clean = text.replace(/\s+/g, '').toLowerCase();
  return /^(?:[0-9a-f]{2})*$/.test(clean) ? clean : null;
}

function decodeText(hex: string | undefined): string {
  if (!hex) return '';
  const text = utf8Decode(hexToBytes(hex));
  return text.includes('�') ? '' : text;
}

export function FreePlayInputs({
  chapter,
  input,
  seed,
  onChange,
  onSeed,
  shareable,
}: {
  chapter: AesChapter;
  input: AesInput;
  seed: number;
  onChange: (patch: Partial<AesInput>) => void;
  onSeed: (seed: number) => void;
  shareable: boolean;
}) {
  const id = useId();
  const [keyDraft, setKeyDraft] = useState(input.keyHex ?? '');
  const [ptDraft, setPtDraft] = useState(input.ptHex ?? '');
  const [textDraft, setTextDraft] = useState(() => decodeText(input.ptHex));
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';
  const keyValid = normalizeHex(keyDraft)?.length === 32;
  const blockSized = chapter === 'block' || chapter === 'avalanche';
  const ptValid = !blockSized || normalizeHex(ptDraft)?.length === 32;
  const problem = !keyValid
    ? 'The key must be 16 bytes (32 hex digits).'
    : !ptValid
      ? 'The block must be 16 bytes (32 hex digits).'
      : inputProblem(chapter, input);
  const keyed = chapter !== 'gcm';
  const seeded = chapter === 'modes' || chapter === 'penguin';

  const commitPt = (hex: string) => {
    if (hex.length / 2 <= MAX_MODE_BYTES) onChange({ ptHex: hex });
  };

  if (!keyed) {
    return (
      <p className="border-border bg-surface text-fg-muted rounded-lg border p-3 text-sm">
        GCM is described, not computed, so there is nothing to type here.
      </p>
    );
  }

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-key`}>
        Key (16 bytes as hex; display only, never a real key)
        <input
          id={`${id}-key`}
          className={field}
          value={keyDraft}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setKeyDraft(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex?.length === 32) onChange({ keyHex: hex });
          }}
        />
      </label>
      {chapter === 'modes' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-text`}>
          Message as text (up to {MAX_MODE_BYTES} bytes)
          <input
            id={`${id}-text`}
            className={field}
            value={textDraft}
            onChange={(e) => {
              const hex = bytesToHex(utf8Encode(e.target.value));
              if (hex.length / 2 > MAX_MODE_BYTES) return;
              setTextDraft(e.target.value);
              setPtDraft(hex);
              commitPt(hex);
            }}
          />
        </label>
      ) : null}
      {chapter !== 'penguin' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-pt`}>
          {blockSized ? 'Plaintext block (16 bytes as hex)' : 'Message as hex'}
          <input
            id={`${id}-pt`}
            className={field}
            value={ptDraft}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setPtDraft(e.target.value);
              const hex = normalizeHex(e.target.value);
              if (hex === null || (blockSized && hex.length !== 32)) return;
              setTextDraft(decodeText(hex));
              commitPt(hex);
            }}
          />
        </label>
      ) : null}
      {chapter === 'avalanche' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-bit`}>
          Bit to flip (0 to 127, from the left)
          <input
            id={`${id}-bit`}
            type="number"
            min={0}
            max={127}
            className={field}
            value={input.bit}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 0 && next <= 127)
                onChange({ bit: next });
            }}
          />
        </label>
      ) : null}
      {seeded ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-seed`}>
          Seed for the IV and nonce (not cryptographic)
          <input
            id={`${id}-seed`}
            type="number"
            min={0}
            max={4294967295}
            className={field}
            value={seed}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 0 && next <= 0xffffffff) onSeed(next);
            }}
          />
        </label>
      ) : null}
      {problem ? (
        <p className="text-warn text-sm sm:col-span-2" role="alert">
          {problem}
        </p>
      ) : null}
      {!shareable ? (
        <p className="text-warn text-sm sm:col-span-2">
          This state is too large for a share link.
        </p>
      ) : null}
    </div>
  );
}
