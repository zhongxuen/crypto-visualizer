import { utf8Encode } from '../bytes/utf8';
import type { Scenario } from '../scenarios';
import { hmacRun } from './hmac';

/** RFC 4231 test case 2 (a short key), and a 131-byte key as in cases 6 and 7. */
export const HMAC_EXAMPLES = {
  key: 'Jefe',
  message: 'what do ya want for nothing?',
} as const;

export const HMAC_SCENARIOS: readonly Scenario[] = [
  {
    id: 'hmac.rfc4231-2',
    run: () => hmacRun(utf8Encode(HMAC_EXAMPLES.key), utf8Encode(HMAC_EXAMPLES.message)),
  },
  {
    id: 'hmac.long-key',
    run: () =>
      hmacRun(
        new Uint8Array(131).fill(0xaa),
        utf8Encode('Test Using Larger Than Block-Size Key - Hash Key First'),
      ),
  },
];
