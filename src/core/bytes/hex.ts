/** Hex (base 16) encoding, RFC 4648 §8. Lowercase out; either case in. */

const HEX_DIGITS = '0123456789abcdef';

/** `Uint8Array.of(0xde, 0xad)` → `'dead'`. `separator` goes between bytes, e.g. `' '`. */
export function bytesToHex(bytes: Uint8Array, separator = ''): string {
  const parts: string[] = [];
  for (const byte of bytes) parts.push(HEX_DIGITS[byte >>> 4] + HEX_DIGITS[byte & 0x0f]);
  return parts.join(separator);
}

function nibble(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30; // 0-9
  if (code >= 0x61 && code <= 0x66) return code - 0x61 + 10; // a-f
  if (code >= 0x41 && code <= 0x46) return code - 0x41 + 10; // A-F
  return -1;
}

/**
 * `'de ad'` → `Uint8Array.of(0xde, 0xad)`.
 *
 * Whitespace is ignored so pasted, spaced-out hex works. Throws `RangeError` for any other
 * non-hex character or an odd number of digits. Callers handling user input catch it.
 */
export function hexToBytes(hex: string): Uint8Array {
  const digits = hex.replace(/\s+/g, '');
  if (digits.length % 2 !== 0) {
    throw new RangeError(`Hex needs an even number of digits, got ${digits.length}`);
  }

  const bytes = new Uint8Array(digits.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    const high = nibble(digits.charCodeAt(2 * i));
    const low = nibble(digits.charCodeAt(2 * i + 1));
    if (high < 0 || low < 0) {
      throw new RangeError(`Not a hex digit in "${digits.slice(2 * i, 2 * i + 2)}"`);
    }
    bytes[i] = (high << 4) | low;
  }
  return bytes;
}
