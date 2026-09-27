/**
 * GCM (SP 800-38D), explained but not computed. v1 describes it in one group of steps;
 * phase 2 (TLS 1.3) adds GHASH and the real tag. The steps carry no values on purpose,
 * so nothing here looks like a GCM result it isn't.
 */

import { createRun } from '../../events/builder';
import type { SimResult } from '../../sim/result';
import type { AesEvent, AesGcmEvent } from '../events';

const STEPS: Omit<AesGcmEvent, 'kind' | 'id'>[] = [
  {
    stage: 'overview',
    label: 'GCM = CTR mode for secrecy + a GHASH tag for integrity.',
    detail:
      'CBC and CTR hide the plaintext but do nothing if someone flips bits in the ciphertext. GCM adds a 128-bit authentication tag over the ciphertext and any unencrypted header data. It is the mode TLS 1.3 uses.',
    citation: 'sp800-38d.7.1',
  },
  {
    stage: 'ctr',
    label: 'Encrypt with counter mode (GCTR), starting one counter after J0.',
    detail:
      'From a 96-bit IV, J0 = IV ‖ 0x00000001. The plaintext is XORed with AES_K(inc32(J0)), AES_K(inc32²(J0)), …: CTR as in the last chapter. J0 itself is kept back for the tag.',
    citation: 'sp800-38d.6.5',
  },
  {
    stage: 'ghash',
    label: 'GHASH: fold every ciphertext block into a running value with multiply-by-H.',
    detail:
      'H = AES_K(0^128). Each 16-byte block of header data, then ciphertext, then the lengths, is XORed in and the total multiplied by H in GF(2^128). It is a polynomial in H, which is fast but only secure while H stays secret.',
    citation: 'sp800-38d.6.4',
  },
  {
    stage: 'tag',
    label:
      'The tag T = GHASH result ⊕ AES_K(J0). The receiver recomputes it before decrypting.',
    detail:
      'If one bit of the ciphertext, header or tag has changed, the tags don’t match and the receiver rejects the message without releasing any plaintext.',
    citation: 'sp800-38d.7.1',
  },
  {
    stage: 'nonce',
    label: 'Never reuse a nonce with the same key.',
    detail:
      'A repeated IV repeats the CTR keystream, so XORing two ciphertexts gives the XOR of the plaintexts. Worse, two tags under one IV let an attacker solve for H and forge tags for any message from then on.',
    citation: 'sp800-38d.8',
  },
];

export function gcmExplanationRun(): SimResult<AesEvent> {
  const run = createRun<AesEvent>();
  run.group(
    'GCM',
    () => {
      for (const step of STEPS) {
        run.step({ kind: 'aes.gcm', id: `aes.gcm.${step.stage}`, ...step });
      }
    },
    {
      id: 'gcm',
      description: 'Authenticated encryption, described. Not computed in this version.',
    },
  );
  return run.finish();
}
