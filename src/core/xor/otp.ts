/**
 * The one-time pad: XOR the message with a random key as long as itself, used once
 * (Vernam 1926). Shannon (1949) proved that, done that way, the ciphertext says nothing
 * about the message.
 *
 * The key here comes from the seeded mulberry32 generator so a run can be replayed and
 * shared. That makes it a picture of a one-time pad, not one: a real pad needs true
 * randomness, and the UI says so.
 */

import { utf8Encode } from '../bytes/utf8';
import { createRun } from '../events/builder';
import { createRng, hashSeed } from '../sim/rng';
import type { SimResult } from '../sim/result';
import { truncateUtf8 } from './encode';
import type { XorEvent } from './events';
import { emitXorBytes, textField, xor } from './xor';

/** `length` bytes from the seeded generator. Display only: not cryptographic. */
export function otpKey(length: number, seed: number | string): number[] {
  const rng = createRng(seed).fork('otp');
  return Array.from({ length }, () => rng.int(256));
}

export function otpRun(text: string, seed: number): SimResult<XorEvent> {
  const run = createRun<XorEvent>();
  const fitted = truncateUtf8(text);
  const message = Array.from(utf8Encode(fitted));
  const key = otpKey(message.length, seed);
  const names: [string, string, string] = ['plaintext', 'key', 'ciphertext'];
  let cipher: number[] = [];

  run.group(
    'Message and key',
    () => {
      run.step({
        kind: 'xor.message',
        id: 'xor.otp.message',
        label: `The message is ${message.length} bytes.`,
        citation: 'rfc3629.3',
        name: 'plaintext',
        text: fitted,
        bytes: message,
      });
      run.step({
        kind: 'xor.key',
        id: 'xor.otp.key',
        label: `A key of ${key.length} random bytes: one for every message byte.`,
        detail:
          'A real one-time pad needs truly random bytes, used once and then destroyed. These come from a seeded generator so the run can be replayed: fine for a picture, never for a secret.',
        citation: 'shannon1949',
        name: 'key',
        key,
        seed: hashSeed(seed),
      });
    },
    { id: 'otp-setup', description: 'A message, and a random key just as long.' },
  );

  run.group(
    'Encrypt',
    () => {
      cipher = emitXorBytes(run, {
        idPrefix: 'xor.otp.enc',
        pass: 'apply',
        a: message,
        b: key,
        names,
      });
      run.step({
        kind: 'xor.result',
        id: 'xor.otp.cipher',
        label:
          'The ciphertext. Without the key, every message of this length is equally likely.',
        detail:
          'For any message you guess, there is exactly one key that turns it into this ciphertext, and every key was equally likely. That is perfect secrecy.',
        citation: 'shannon1949',
        names,
        a: message,
        b: key,
        out: cipher,
      });
    },
    { id: 'otp-encrypt', description: 'plaintext ⊕ key = ciphertext.' },
  );

  run.group(
    'Decrypt',
    () => {
      const back = xor(cipher, key);
      run.step({
        kind: 'xor.result',
        id: 'xor.otp.plain',
        label: 'The receiver XORs with the same key and reads the message.',
        citation: 'vernam1926',
        names: ['ciphertext', 'key', 'plaintext'],
        a: cipher,
        b: key,
        out: back,
        ...textField(back),
      });
    },
    { id: 'otp-decrypt', description: 'ciphertext ⊕ key = plaintext.' },
  );

  return run.finish();
}
