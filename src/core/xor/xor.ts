/**
 * XOR as a reversible mask: `a ⊕ b`, one byte at a time, then `(a ⊕ b) ⊕ b` to get `a`
 * back. The one-time pad (Vernam 1926) is exactly this with a random key as long as the
 * message.
 */

import { xorBytes } from '../bytes/bits';
import { utf8Decode } from '../bytes/utf8';
import { createRun, type RunBuilder } from '../events/builder';
import type { SimResult } from '../sim/result';
import type { XorEvent } from './events';

/** `a ⊕ b` for equal-length arrays. */
export function xor(a: ArrayLike<number>, b: ArrayLike<number>): number[] {
  return Array.from(xorBytes(Uint8Array.from(a), Uint8Array.from(b)));
}

/** Bytes as text if they are valid UTF-8 without control characters, else undefined. */
export function asText(bytes: readonly number[]): string | undefined {
  const text = utf8Decode(Uint8Array.from(bytes));
  // eslint-disable-next-line no-control-regex
  return /[�\u0000-\u0008\u000b-\u001f\u007f]/.test(text) ? undefined : text;
}

function bitColumns(a: number, b: number): string {
  const bits = (x: number) => x.toString(2).padStart(8, '0');
  return `${bits(a)} ⊕ ${bits(b)} = ${bits(a ^ b)}: each output bit is 1 where the two input bits differ.`;
}

/**
 * Emit one event per byte of `a ⊕ b` into `run`, returning the result. Used by every
 * run in this module so each byte is shown the same way.
 */
export function emitXorBytes(
  run: RunBuilder<XorEvent>,
  options: {
    idPrefix: string;
    pass: 'apply' | 'undo';
    a: readonly number[];
    b: readonly number[];
    names: [string, string, string];
  },
): number[] {
  const { idPrefix, pass, a, b, names } = options;
  const out = xor(a, b);
  for (let index = 0; index < a.length; index += 1) {
    run.step({
      kind: 'xor.byte',
      id: `${idPrefix}.${index}`,
      label: `Byte ${index + 1}: ${hex(a[index])} ⊕ ${hex(b[index])} = ${hex(out[index])}.`,
      detail: bitColumns(a[index], b[index]),
      citation: 'vernam1926',
      pass,
      index,
      a: a[index],
      b: b[index],
      out: out[index],
      names,
      aBytes: [...a],
      bBytes: [...b],
      outBytes: out.slice(0, index + 1),
    });
  }
  return out;
}

function hex(byte: number): string {
  return `0x${byte.toString(16).padStart(2, '0')}`;
}

export interface XorRunInput {
  a: readonly number[];
  b: readonly number[];
  names?: [string, string, string];
}

/** `a ⊕ b` byte by byte, then the same `b` again to get `a` back. */
export function xorRun({
  a,
  b,
  names = ['message', 'key', 'masked'],
}: XorRunInput): SimResult<XorEvent> {
  if (a.length !== b.length) {
    throw new RangeError(`xorRun needs equal lengths, got ${a.length} and ${b.length}`);
  }
  const run = createRun<XorEvent>();
  let out: number[] = [];

  run.group(
    `${names[0]} ⊕ ${names[1]}`,
    () => {
      out = emitXorBytes(run, { idPrefix: 'xor.apply', pass: 'apply', a, b, names });
      run.step({
        kind: 'xor.result',
        id: 'xor.apply.result',
        label: `The ${names[2]} bytes look nothing like the ${names[0]}.`,
        detail:
          'Wherever a key bit is 1, the message bit flipped; wherever it is 0, it stayed.',
        citation: 'vernam1926',
        names,
        a: [...a],
        b: [...b],
        out,
      });
    },
    { id: 'apply', description: `Combine each byte with ${names[1]}.` },
  );

  const undoNames: [string, string, string] = [names[2], names[1], names[0]];
  run.group(
    `${names[2]} ⊕ ${names[1]}`,
    () => {
      const back = emitXorBytes(run, {
        idPrefix: 'xor.undo',
        pass: 'undo',
        a: out,
        b,
        names: undoNames,
      });
      run.step({
        kind: 'xor.result',
        id: 'xor.undo.result',
        label: `XOR with the same ${names[1]} again, and the ${names[0]} is back.`,
        detail: 'x ⊕ k ⊕ k = x, because k ⊕ k = 0 and x ⊕ 0 = x. XOR undoes itself.',
        citation: 'vernam1926',
        names: undoNames,
        a: out,
        b: [...b],
        out: back,
        ...textField(back),
      });
    },
    { id: 'undo', description: 'The same key again undoes the mask.' },
  );

  return run.finish();
}

export function textField(bytes: readonly number[]): { text?: string } {
  const text = asText(bytes);
  return text === undefined ? {} : { text };
}
