/**
 * Why textbook RSA is unsafe, with three actors: a sender, an attacker who can change
 * messages in transit, and a receiver.
 *
 * RSA without padding is multiplicative: (m·k)ᵉ = mᵉ·kᵉ (mod n). So an attacker who sees
 * c = mᵉ and knows only the public key can send c·kᵉ, and the receiver decrypts k·m
 * without noticing. Then, separately, a small e with a small m: if mᵉ < n there is no
 * reduction and an ordinary root recovers m. OAEP (RFC 8017 §7.1) and PSS (§8.1) are
 * described as the fix, not implemented.
 */

import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import { iroot, modPow } from './bigmath';
import type { RsaEvent } from './events';
import { emitKeyPair, generateKey, type RsaKeyInput } from './keygen';
import { messageProblem } from './rsa';

/** The attacker's multiplier. */
export const MALLEABILITY_FACTOR = 2n;

/** The small-e example: a 3-digit message cubed is still far below any real n. */
export const CUBE_ROOT_EXAMPLE = { m: 42n, e: 3n } as const;

export function rsaMalleabilityRun(input: RsaKeyInput, m: bigint): SimResult<RsaEvent> {
  const { key } = generateKey(input);
  const problem = messageProblem(m, key.n);
  if (problem) throw new RangeError(problem);
  const { n, e, d } = key;
  const k = MALLEABILITY_FACTOR;
  const run = createRun<RsaEvent>();

  run.group('Key', () => emitKeyPair(run, key, 'rsa.mal.key'), {
    id: 'key',
    description: 'The receiver’s key pair. The attacker knows (n, e), like everyone.',
  });

  const c = modPow(m, e, n);
  const ke = modPow(k, e, n);
  const forged = (c * ke) % n;
  const recovered = modPow(forged, d, n);
  const km = (k * m) % n;

  run.group(
    'Tamper',
    () => {
      run.step({
        kind: 'rsa.mallSend',
        id: 'rsa.mal.send',
        label: `Sender: encrypts m = ${m} to c = ${m}^${e} mod ${n} = ${c} and sends it.`,
        detail:
          'Textbook RSA: no padding, no randomness. The same m always gives the same c, and nothing in c says whether it has been changed.',
        citation: 'rfc8017.5.1.1',
        actor: 'sender',
        m: String(m),
        c: String(c),
      });
      run.step({
        kind: 'rsa.mallFactor',
        id: 'rsa.mal.factor',
        label: `Attacker: using only the public key, computes ${k}^${e} mod ${n} = ${ke}.`,
        detail:
          'The attacker cannot decrypt c. They don’t need to: encrypting any number of their own choice needs only the public key.',
        citation: 'boneh1999',
        actor: 'attacker',
        k: String(k),
        ke: String(ke),
      });
      run.step({
        kind: 'rsa.mallForge',
        id: 'rsa.mal.forge',
        label: `Attacker: replaces c with c × ${ke} mod ${n} = ${forged}.`,
        detail: `c × ${k}ᵉ = mᵉ × ${k}ᵉ = (${k}m)ᵉ (mod n). The forgery is a valid encryption of ${k}m, made without the key.`,
        citation: 'boneh1999',
        actor: 'attacker',
        c: String(c),
        ke: String(ke),
        forged: String(forged),
      });
      run.step({
        kind: 'rsa.mallReceive',
        id: 'rsa.mal.receive',
        label: `Receiver: decrypts ${forged}^${d} mod ${n} = ${recovered}, which is ${k} × ${m}${k * m >= n ? ` mod ${n}` : ''}, and can’t tell.`,
        detail: `The receiver gets ${recovered} instead of ${m}. If m were an amount, the attacker just doubled it. RSA without padding is malleable: an attacker can change the plaintext in a predictable way without knowing it.`,
        citation: 'rfc8017.5.1.2',
        actor: 'receiver',
        forged: String(forged),
        recovered: String(recovered),
        m: String(m),
        km: String(km),
        ok: recovered === km,
      });
    },
    { id: 'tamper', description: 'Multiply the ciphertext, multiply the plaintext.' },
  );

  run.group(
    'Small e',
    () => {
      const { m: small, e: smallE } = CUBE_ROOT_EXAMPLE;
      const cube = small ** smallE;
      run.step({
        kind: 'rsa.cubeRoot',
        id: 'rsa.mal.cube',
        label: `With e = 3 and m = ${small}: m³ = ${cube}, below any real n, so c = ${cube} and ∛${cube} = ${iroot(cube, 3)}. No key needed.`,
        detail:
          'mod n only does something once mᵉ passes n. A short message under a small e (e = 3 was once common) is encrypted to a plain cube, and an ordinary cube root undoes it. Sending the same m to three people with e = 3 is just as bad (Håstad’s broadcast attack).',
        citation: 'boneh1999',
        actor: 'attacker',
        m: String(small),
        e: String(smallE),
        c: String(cube),
        root: String(iroot(cube, 3)),
      });
    },
    { id: 'small-e', description: 'A small exponent and a small message.' },
  );

  run.group(
    'The fix: padding',
    () => {
      run.step({
        kind: 'rsa.padding',
        id: 'rsa.mal.oaep',
        label:
          'OAEP pads the message with random bytes and structure before encrypting. Described, not computed here.',
        detail:
          'RSAES-OAEP mixes m with a random seed through a hash-based mask, so the same message encrypts differently each time, the padded number is always almost as big as n (no small-m roots), and a multiplied ciphertext decrypts to garbage that fails the padding check.',
        citation: 'rfc8017.7.1',
        scheme: 'oaep',
      });
      run.step({
        kind: 'rsa.padding',
        id: 'rsa.mal.pss',
        label:
          'PSS does the same for signatures: randomised, structured padding around the hash. Described, not computed here.',
        detail:
          'Textbook signatures are malleable too: s₁·s₂ is a valid signature on h₁·h₂. RSASSA-PSS encodes the hash with a random salt and a mask, so products of signatures don’t verify.',
        citation: 'rfc8017.8.1',
        scheme: 'pss',
      });
    },
    { id: 'padding', description: 'What OAEP and PSS change.' },
  );

  return run.finish();
}
