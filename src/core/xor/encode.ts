/**
 * Text → UTF-8 bytes, one character per step (RFC 3629 §3).
 *
 * Every later module shows bytes in hex, so this is where the encoding is taught once. A
 * character outside ASCII becomes two to four bytes, and the run shows each one split.
 */

import { encodeCodePoint, utf8Encode } from '../bytes/utf8';
import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import type { XorEvent } from './events';

/** Longest text the module takes, in UTF-8 bytes. */
export const MAX_TEXT_BYTES = 64;

/** The characters of `text` as code points, lone surrogates replaced by U+FFFD. */
export function characters(text: string): { char: string; codePoint: number }[] {
  const out: { char: string; codePoint: number }[] = [];
  for (const char of text) {
    const codePoint = char.codePointAt(0)!;
    const lone = codePoint >= 0xd800 && codePoint <= 0xdfff;
    out.push(lone ? { char: '�', codePoint: 0xfffd } : { char, codePoint });
  }
  return out;
}

/** Cut `text` at a character boundary so it fits in `maxBytes` of UTF-8. */
export function truncateUtf8(text: string, maxBytes = MAX_TEXT_BYTES): string {
  let bytes = 0;
  let out = '';
  for (const { char, codePoint } of characters(text)) {
    const length = encodeCodePoint(codePoint).length;
    if (bytes + length > maxBytes) break;
    bytes += length;
    out += char;
  }
  return out;
}

function describe(codePoint: number, bytes: number[]): string {
  const hex = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
  switch (bytes.length) {
    case 1:
      return `${hex} is below 128, so it is one byte, the same as ASCII.`;
    case 2:
      return `${hex} needs 11 bits: 110xxxxx 10xxxxxx, two bytes.`;
    case 3:
      return `${hex} needs 16 bits: 1110xxxx 10xxxxxx 10xxxxxx, three bytes.`;
    default:
      return `${hex} is above U+FFFF, so it needs 21 bits: 11110xxx then three 10xxxxxx bytes.`;
  }
}

export function encodeRun(text: string): SimResult<XorEvent> {
  const run = createRun<XorEvent>();
  const fitted = truncateUtf8(text);
  const encoded: number[] = [];

  run.group(
    'Text to bytes',
    () => {
      characters(fitted).forEach(({ char, codePoint }, index) => {
        const bytes = encodeCodePoint(codePoint);
        const offset = encoded.length;
        encoded.push(...bytes);
        run.step({
          kind: 'xor.char',
          id: `xor.encode.${index}`,
          label: `“${char}” becomes ${bytes.length} byte${bytes.length === 1 ? '' : 's'}.`,
          detail: describe(codePoint, bytes),
          citation: 'rfc3629.3',
          char,
          codePoint,
          bytes,
          offset,
          encoded: [...encoded],
        });
      });
    },
    {
      id: 'encode',
      description: 'Each character becomes one to four UTF-8 bytes.',
    },
  );

  const bytes = Array.from(utf8Encode(fitted));
  run.group(
    'All the bytes',
    () => {
      run.step({
        kind: 'xor.message',
        id: 'xor.encode.done',
        label: `${bytes.length} bytes in all. From here on, everything works on bytes.`,
        detail:
          'Hex writes each byte as two digits from 0–9 and a–f; binary writes its eight bits.',
        citation: 'rfc4648.8',
        name: 'text',
        text: fitted,
        bytes,
      });
    },
    { id: 'encode-done', description: 'The whole text as bytes.' },
  );

  return run.finish();
}
