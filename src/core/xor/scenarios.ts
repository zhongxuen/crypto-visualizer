import { utf8Encode } from '../bytes/utf8';
import type { Scenario } from '../scenarios';
import { encodeRun } from './encode';
import { otpKey, otpRun } from './otp';
import { TWO_TIME_PAD_EXAMPLE, twoTimePadRun } from './twoTimePad';
import { xorRun } from './xor';

/** The built-in runs of module 1. */
export const XOR_EXAMPLE_TEXT = 'Hi é 🔐';

export function xorExampleRun() {
  const a = Array.from(utf8Encode('Hi!'));
  return xorRun({
    a,
    b: otpKey(a.length, 'xor-example'),
    names: ['message', 'key', 'masked'],
  });
}

export const XOR_SCENARIOS: readonly Scenario[] = [
  { id: 'xor.encode', run: () => encodeRun(XOR_EXAMPLE_TEXT) },
  { id: 'xor.reversible', run: xorExampleRun },
  { id: 'xor.otp', run: () => otpRun('attack at dawn', 1) },
  {
    id: 'xor.two-time-pad',
    run: () => twoTimePadRun({ ...TWO_TIME_PAD_EXAMPLE, seed: 1 }),
  },
];
