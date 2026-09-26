/**
 * The two-time pad: one key used for two messages.
 *
 *   c1 ⊕ c2 = (p1 ⊕ k) ⊕ (p2 ⊕ k) = p1 ⊕ p2
 *
 * The key cancels, leaving the two plaintexts XORed together, with no key in sight. An
 * attacker then slides a guessed word (a "crib", e.g. " the ") along `p1 ⊕ p2`. Where the
 * guess really is in one message, XORing it out leaves the other message's text at that
 * spot, and it reads as English. This is how reused Soviet pad pages were read in the
 * Venona project.
 */

import { utf8Decode, utf8Encode } from '../bytes/utf8';
import { createRun } from '../events/builder';
import { hashSeed } from '../sim/rng';
import type { SimResult } from '../sim/result';
import { truncateUtf8 } from './encode';
import type { XorEvent } from './events';
import { otpKey } from './otp';
import { textField, xor } from './xor';

/**
 * Built-in messages, chosen so the crib always lands: " the " appears in both. They are
 * the same length (31 bytes), so nothing is cut.
 */
export const TWO_TIME_PAD_EXAMPLE = {
  p1: 'meet me by the old mill at noon',
  p2: 'send the ships round the island',
  crib: ' the ',
} as const;

/** Letters, digits, spaces and light punctuation: what English looks like. */
export function isReadable(bytes: readonly number[]): boolean {
  return (
    bytes.length > 0 &&
    bytes.every(
      (byte) =>
        (byte >= 0x61 && byte <= 0x7a) || // a-z
        (byte >= 0x41 && byte <= 0x5a) || // A-Z
        (byte >= 0x30 && byte <= 0x39) || // 0-9
        byte === 0x20 ||
        byte === 0x2c || // ,
        byte === 0x2e || // .
        byte === 0x27 || // '
        byte === 0x21 || // !
        byte === 0x3f, // ?
    )
  );
}

export interface CribPosition {
  offset: number;
  revealed: number[];
  revealedText: string;
  readable: boolean;
}

/** Slide `crib` along `xored`, XORing it in at every offset. */
export function cribDrag(
  xored: readonly number[],
  crib: readonly number[],
): CribPosition[] {
  const positions: CribPosition[] = [];
  for (let offset = 0; offset + crib.length <= xored.length; offset += 1) {
    const revealed = xor(crib, xored.slice(offset, offset + crib.length));
    positions.push({
      offset,
      revealed,
      revealedText: utf8Decode(Uint8Array.from(revealed)),
      readable: isReadable(revealed),
    });
  }
  return positions;
}

export interface TwoTimePadInput {
  p1: string;
  p2: string;
  crib: string;
  seed: number;
}

export function twoTimePadRun({
  p1,
  p2,
  crib,
  seed,
}: TwoTimePadInput): SimResult<XorEvent> {
  const run = createRun<XorEvent>();
  const m1 = Array.from(utf8Encode(truncateUtf8(p1)));
  const m2 = Array.from(utf8Encode(truncateUtf8(p2)));
  const length = Math.min(m1.length, m2.length);
  const a = m1.slice(0, length);
  const b = m2.slice(0, length);
  const key = otpKey(length, seed);
  const c1 = xor(a, key);
  const c2 = xor(b, key);
  const xored = xor(c1, c2);
  const cribBytes = Array.from(utf8Encode(truncateUtf8(crib, 16)));

  run.group(
    'One key, two messages',
    () => {
      run.step({
        kind: 'xor.message',
        id: 'xor.ttp.p1',
        label: 'Message 1.',
        ...(length < m1.length || length < m2.length
          ? { detail: `Both messages are cut to ${length} bytes, the shorter length.` }
          : {}),
        citation: 'rfc3629.3',
        name: 'p1',
        text: utf8Decode(Uint8Array.from(a)),
        bytes: a,
      });
      run.step({
        kind: 'xor.message',
        id: 'xor.ttp.p2',
        label: 'Message 2.',
        citation: 'rfc3629.3',
        name: 'p2',
        text: utf8Decode(Uint8Array.from(b)),
        bytes: b,
      });
      run.step({
        kind: 'xor.key',
        id: 'xor.ttp.key',
        label: 'One key, used for both. This is the mistake.',
        detail: 'A one-time pad is only secret if each key is used once.',
        citation: 'shannon1949',
        name: 'key',
        key,
        seed: hashSeed(seed),
      });
      run.step({
        kind: 'xor.result',
        id: 'xor.ttp.c1',
        label: 'Ciphertext 1 = message 1 ⊕ key.',
        citation: 'vernam1926',
        names: ['p1', 'key', 'c1'],
        a,
        b: key,
        out: c1,
      });
      run.step({
        kind: 'xor.result',
        id: 'xor.ttp.c2',
        label: 'Ciphertext 2 = message 2 ⊕ key. Each on its own still looks random.',
        citation: 'vernam1926',
        names: ['p2', 'key', 'c2'],
        a: b,
        b: key,
        out: c2,
      });
    },
    { id: 'ttp-setup', description: 'Two messages encrypted with the same key.' },
  );

  run.group(
    'The key cancels',
    () => {
      run.step({
        kind: 'xor.result',
        id: 'xor.ttp.cancel',
        label: 'c1 ⊕ c2 = p1 ⊕ p2. The key is gone.',
        detail:
          '(p1 ⊕ k) ⊕ (p2 ⊕ k) = p1 ⊕ p2 ⊕ (k ⊕ k) = p1 ⊕ p2. An eavesdropper who has both ciphertexts now holds the two messages mixed together, with no key in the way.',
        citation: 'venona',
        names: ['c1', 'c2', 'p1 ⊕ p2'],
        a: c1,
        b: c2,
        out: xored,
        ...textField(xored),
      });
    },
    { id: 'ttp-cancel', description: 'XOR the two ciphertexts.' },
  );

  run.group(
    'Crib drag',
    () => {
      for (const position of cribDrag(xored, cribBytes)) {
        run.step({
          kind: 'xor.crib',
          id: `xor.ttp.crib.${position.offset}`,
          label: position.readable
            ? `Offset ${position.offset}: “${position.revealedText}”, which reads as text.`
            : `Offset ${position.offset}: gibberish, so the guess is not here.`,
          ...(position.readable
            ? {
                detail: `If one message has “${crib}” at byte ${position.offset}, the other has “${position.revealedText}” there.`,
              }
            : {}),
          citation: 'venona',
          crib,
          cribBytes,
          offset: position.offset,
          xored,
          revealed: position.revealed,
          revealedText: position.revealedText,
          readable: position.readable,
        });
      }
    },
    {
      id: 'ttp-crib',
      description: 'Slide a guessed word along p1 ⊕ p2 and look for readable text.',
    },
  );

  return run.finish();
}
