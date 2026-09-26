import { utf8Encode } from '../bytes/utf8';
import type { Scenario } from '../scenarios';
import { passwordTableRun } from './lookupTable';
import { pbkdf2Run } from './pbkdf2';

export const KDF_SCENARIOS: readonly Scenario[] = [
  { id: 'kdf.unsalted', run: () => passwordTableRun({ seed: null }) },
  { id: 'kdf.salted', run: () => passwordTableRun({ seed: 1 }) },
  {
    // Two blocks, so the summarised second block shows too. A small count keeps the
    // determinism suite fast; the UI runs 600,000 in a Worker.
    id: 'kdf.pbkdf2',
    run: () =>
      pbkdf2Run({
        password: utf8Encode('passwd'),
        salt: utf8Encode('salt'),
        iterations: 1000,
        dkLen: 64,
      }),
  },
];
