/**
 * UTF-8, implemented by hand (RFC 3629 §3).
 *
 * Module 1 teaches this encoding step by step, so core can't hand it to `TextEncoder`.
 * Both directions match the WHATWG Encoding Standard, which is what `TextEncoder` and
 * `TextDecoder` implement, and the tests check that on random input:
 *
 * - encoding replaces a lone surrogate with U+FFFD, as `TextEncoder` does;
 * - decoding replaces each maximal invalid subsequence with one U+FFFD, as
 *   `TextDecoder` does. It does **not** strip a leading byte-order mark: the bytes are
 *   shown as they are.
 */

const REPLACEMENT = 0xfffd;

/** The code points of `text`, with lone surrogates replaced by U+FFFD. */
function codePoints(text: string): number[] {
  const points: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        points.push(0x10000 + ((unit - 0xd800) << 10) + (next - 0xdc00));
        i += 1;
        continue;
      }
    }
    points.push(unit >= 0xd800 && unit <= 0xdfff ? REPLACEMENT : unit);
  }
  return points;
}

/** How many bytes UTF-8 uses for a code point: 1 to 4. */
export function utf8Length(codePoint: number): 1 | 2 | 3 | 4 {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/** Encode one code point, e.g. `0x20ac` (€) → `[0xe2, 0x82, 0xac]`. */
export function encodeCodePoint(codePoint: number): number[] {
  switch (utf8Length(codePoint)) {
    case 1:
      return [codePoint];
    case 2:
      return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
    case 3:
      return [
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      ];
    case 4:
      return [
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      ];
  }
}

export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const point of codePoints(text)) bytes.push(...encodeCodePoint(point));
  return Uint8Array.from(bytes);
}

/** `String.fromCodePoint` with many arguments overflows the stack, so go in chunks. */
function fromCodePoints(points: readonly number[]): string {
  const CHUNK = 4096;
  let text = '';
  for (let i = 0; i < points.length; i += CHUNK) {
    text += String.fromCodePoint(...points.slice(i, i + CHUNK));
  }
  return text;
}

/** The WHATWG UTF-8 decoder, replacement mode. */
export function utf8Decode(bytes: Uint8Array): string {
  const points: number[] = [];
  let codePoint = 0;
  let bytesSeen = 0;
  let bytesNeeded = 0;
  let lower = 0x80;
  let upper = 0xbf;

  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];

    if (bytesNeeded === 0) {
      if (byte <= 0x7f) {
        points.push(byte);
      } else if (byte >= 0xc2 && byte <= 0xdf) {
        bytesNeeded = 1;
        codePoint = byte & 0x1f;
      } else if (byte >= 0xe0 && byte <= 0xef) {
        if (byte === 0xe0) lower = 0xa0; // no overlong 3-byte forms
        if (byte === 0xed) upper = 0x9f; // no surrogates
        bytesNeeded = 2;
        codePoint = byte & 0x0f;
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        if (byte === 0xf0) lower = 0x90; // no overlong 4-byte forms
        if (byte === 0xf4) upper = 0x8f; // nothing above U+10FFFF
        bytesNeeded = 3;
        codePoint = byte & 0x07;
      } else {
        points.push(REPLACEMENT);
      }
      continue;
    }

    if (byte < lower || byte > upper) {
      // The sequence so far is invalid: replace it, then look at this byte afresh.
      codePoint = 0;
      bytesNeeded = 0;
      bytesSeen = 0;
      lower = 0x80;
      upper = 0xbf;
      points.push(REPLACEMENT);
      i -= 1;
      continue;
    }

    lower = 0x80;
    upper = 0xbf;
    codePoint = (codePoint << 6) | (byte & 0x3f);
    bytesSeen += 1;
    if (bytesSeen === bytesNeeded) {
      points.push(codePoint);
      codePoint = 0;
      bytesNeeded = 0;
      bytesSeen = 0;
    }
  }

  if (bytesNeeded !== 0) points.push(REPLACEMENT);
  return fromCodePoints(points);
}
