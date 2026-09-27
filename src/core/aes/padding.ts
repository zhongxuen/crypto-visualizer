/**
 * PKCS#7 padding (RFC 5652 §6.3): append n bytes of value n, 1 ≤ n ≤ 16, so the length
 * becomes a whole number of blocks. A message that is already whole blocks gets a full
 * block of 0x10, so unpadding is never ambiguous. SP 800-38A leaves padding to the
 * application (its Appendix A); this is the scheme TLS 1.2 CBC suites, CMS and node's
 * `setAutoPadding(true)` use.
 */

import { BLOCK_BYTES } from './round';

/** How many bytes PKCS#7 adds to a message of `length` bytes: 1 to 16. */
export function padLength(length: number, blockSize = BLOCK_BYTES): number {
  return blockSize - (length % blockSize);
}

export function pkcs7Pad(message: Uint8Array, blockSize = BLOCK_BYTES): Uint8Array {
  const n = padLength(message.length, blockSize);
  const out = new Uint8Array(message.length + n);
  out.set(message);
  out.fill(n, message.length);
  return out;
}

/** Thrown when padding doesn't check out. The message is kept generic on purpose. */
export class PaddingError extends Error {
  constructor() {
    super('Invalid PKCS#7 padding');
    this.name = 'PaddingError';
  }
}

/**
 * Remove and check PKCS#7 padding. Throws `PaddingError` if the length isn't whole
 * blocks, the last byte isn't 1–16, or the padding bytes aren't all equal to it.
 *
 * (A server that tells the two failure cases apart is a padding oracle, which is how
 * CBC with PKCS#7 has been broken in practice. This one doesn't, but it is not written
 * to be constant-time either: it is a teaching implementation.)
 */
export function pkcs7Unpad(padded: Uint8Array, blockSize = BLOCK_BYTES): Uint8Array {
  if (padded.length === 0 || padded.length % blockSize !== 0) throw new PaddingError();
  const n = padded[padded.length - 1];
  if (n < 1 || n > blockSize) throw new PaddingError();
  for (let i = padded.length - n; i < padded.length; i += 1) {
    if (padded[i] !== n) throw new PaddingError();
  }
  return padded.slice(0, padded.length - n);
}
