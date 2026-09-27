/**
 * Mallory in the middle. Nothing in plain Diffie-Hellman says who sent a share, so
 * Mallory catches A and B and forwards her own shares instead. Alice ends up with a
 * secret shared with Mallory, Bob with a different one, and Mallory holds both: she
 * decrypts what Alice sends, reads it, and re-encrypts it for Bob, who notices nothing.
 *
 * The cipher is a toy: c = m·s mod p, undone by multiplying by s⁻¹ (the core of ElGamal
 * encryption, HAC §8.4.1). The fix is to authenticate the shares, for example by signing
 * them (module 5) as TLS 1.3 does in CertificateVerify.
 */

import { createRun } from '../events/builder';
import { modInverse } from '../rsa/bigmath';
import type { SimResult } from '../sim/result';
import {
  dhExchange,
  dhPublic,
  dhSecret,
  drawPrivate,
  emitParams,
  emitPrivate,
  emitPublic,
  emitShared,
  type DhInput,
} from './dh';
import type { DhEvent, DhParty } from './events';
import type { DhGroup } from './params';

export interface DhMitm {
  group: DhGroup;
  a: bigint;
  b: bigint;
  A: bigint;
  B: bigint;
  /** Mallory's private keys: the one she uses with Alice, and the one with Bob. */
  mA: bigint;
  mB: bigint;
  /** g^mA, sent to Alice as if it were B; g^mB, sent to Bob as if it were A. */
  MA: bigint;
  MB: bigint;
  /** Alice's secret (shared with Mallory) and Bob's (shared with Mallory). */
  aliceSecret: bigint;
  bobSecret: bigint;
  malloryWithAlice: bigint;
  malloryWithBob: bigint;
}

/**
 * The attack as values. Mallory's key for Bob's side is redrawn (from the same seeded
 * stream) until the two secrets differ, which in a toy group they might not by chance.
 */
export function dhMitm(input: DhInput): DhMitm {
  const { group, a, b, A, B } = dhExchange(input);
  const mA = drawPrivate(group, input.seed, 'mallory-alice');
  const MA = dhPublic(group, mA);
  const aliceSecret = dhSecret(group, MA, a);

  let mB = 0n;
  let bobSecret = aliceSecret;
  for (let i = 0; bobSecret === aliceSecret; i += 1) {
    mB = drawPrivate(group, input.seed, `mallory-bob-${i}`);
    bobSecret = dhSecret(group, dhPublic(group, mB), b);
  }
  const MB = dhPublic(group, mB);

  return {
    group,
    a,
    b,
    A,
    B,
    mA,
    mB,
    MA,
    MB,
    aliceSecret,
    bobSecret,
    malloryWithAlice: dhSecret(group, A, mA),
    malloryWithBob: dhSecret(group, B, mB),
  };
}

/** Why m can't be the toy message in this group, or `null`. */
export function mitmMessageProblem(m: bigint, group: DhGroup): string | null {
  if (m < 1n || m >= group.p) return `The message must be between 1 and ${group.p - 1n}.`;
  return null;
}

export const DEFAULT_MITM_MESSAGE = 42n;

/** The MITM chapter: the swap, the two secrets, the relayed message, the fix. */
export function dhMitmRun(
  input: DhInput,
  message: bigint = DEFAULT_MITM_MESSAGE,
): SimResult<DhEvent> {
  const x = dhMitm(input);
  const { group, a, b } = x;
  const { p } = group;
  const problem = mitmMessageProblem(message, group);
  if (problem) throw new RangeError(problem);
  const toy = group.kind === 'toy';
  const show = (v: bigint) => (toy ? String(v) : `(${v.toString().length} digits)`);
  const run = createRun<DhEvent>();

  run.group(
    'Setup',
    () => {
      emitParams(run, group, 'dh.mitm.params');
      emitPrivate(run, {
        id: 'dh.mitm.a',
        actor: 'alice',
        name: 'a',
        value: a,
        group,
        source: input.a === undefined ? 'seed' : 'user',
      });
      emitPrivate(run, {
        id: 'dh.mitm.b',
        actor: 'bob',
        name: 'b',
        value: b,
        group,
        source: input.b === undefined ? 'seed' : 'user',
      });
      emitPrivate(run, {
        id: 'dh.mitm.mA',
        actor: 'mallory',
        name: 'm₁',
        value: x.mA,
        group,
        source: 'seed',
      });
      emitPrivate(run, {
        id: 'dh.mitm.mB',
        actor: 'mallory',
        name: 'm₂',
        value: x.mB,
        group,
        source: 'seed',
      });
    },
    {
      id: 'setup',
      description:
        'The same exchange, but Mallory sits on the channel with two keys of her own.',
    },
  );

  function intercept(
    from: DhParty,
    name: string,
    original: bigint,
    rName: string,
    replacement: bigint,
  ) {
    const to: DhParty = from === 'alice' ? 'bob' : 'alice';
    const who = from === 'alice' ? 'Alice' : 'Bob';
    const whom = to === 'alice' ? 'Alice' : 'Bob';
    run.step({
      kind: 'dh.mitmIntercept',
      id: `dh.mitm.swap.${name}`,
      label: `Mallory catches ${who}'s ${name} = ${show(original)} and sends ${whom} ${rName} = ${show(replacement)} instead.`,
      detail: `${rName} = g^${rName === 'M₁' ? 'm₁' : 'm₂'} mod p is a perfectly valid share: it passes the y^q mod p = 1 check, and nothing in it says who made it.`,
      citation: 'rfc2631.2.1.1',
      actor: 'mallory',
      from,
      to,
      name,
      original: String(original),
      replacement: String(replacement),
      replacementName: rName,
    });
  }

  // No per-bit steps here: the exchange chapter already showed them.
  const stepped = false;
  run.group(
    'Swap',
    () => {
      emitPublic(run, {
        id: 'dh.mitm.A',
        actor: 'alice',
        name: 'A',
        exp: a,
        expName: 'a',
        group,
        stepped,
      });
      intercept('alice', 'A', x.A, 'M₂', x.MB);
      emitPublic(run, {
        id: 'dh.mitm.B',
        actor: 'bob',
        name: 'B',
        exp: b,
        expName: 'b',
        group,
        stepped,
      });
      intercept('bob', 'B', x.B, 'M₁', x.MA);
    },
    { id: 'swap', description: 'Mallory replaces each share with her own.' },
  );

  run.group(
    'Two secrets',
    () => {
      emitShared(run, {
        id: 'dh.mitm.sA',
        actor: 'alice',
        withActor: 'mallory',
        y: x.MA,
        yName: 'M₁',
        yExpName: 'm₁',
        x: a,
        xName: 'a',
        group,
        stepped,
      });
      emitShared(run, {
        id: 'dh.mitm.sB',
        actor: 'bob',
        withActor: 'mallory',
        y: x.MB,
        yName: 'M₂',
        yExpName: 'm₂',
        x: b,
        xName: 'b',
        group,
        stepped,
      });
      run.step({
        kind: 'dh.mitmKeys',
        id: 'dh.mitm.keys',
        label: `Alice's secret ${show(x.aliceSecret)} and Bob's ${show(x.bobSecret)} differ, and Mallory has both.`,
        detail: `Mallory computes A^m₁ = ${show(x.malloryWithAlice)} (Alice's) and B^m₂ = ${show(x.malloryWithBob)} (Bob's). Alice and Bob each think they share a secret with the other; each shares one with Mallory.`,
        citation: 'rfc2631.2.1.1',
        alice: String(x.aliceSecret),
        bob: String(x.bobSecret),
        malloryWithAlice: String(x.malloryWithAlice),
        malloryWithBob: String(x.malloryWithBob),
        same: x.aliceSecret === x.bobSecret,
      });
    },
    { id: 'secrets', description: 'Alice–Mallory and Mallory–Bob, not Alice–Bob.' },
  );

  const c1 = (message * x.aliceSecret) % p;
  const read = (c1 * modInverse(x.malloryWithAlice, p)) % p;
  const c2 = (read * x.malloryWithBob) % p;
  const received = (c2 * modInverse(x.bobSecret, p)) % p;
  run.group(
    'Mallory reads',
    () => {
      const msg = (
        id: string,
        actor: DhParty | 'mallory',
        action: 'encrypt' | 'decrypt',
        key: bigint,
        input: bigint,
        output: bigint,
        label: string,
      ) =>
        run.step({
          kind: 'dh.mitmMessage',
          id,
          label,
          detail:
            'A toy cipher: encrypt by multiplying by the secret mod p, decrypt by multiplying by its inverse. Real protocols derive an AES key from the secret instead.',
          citation: 'hac.8.4.1',
          actor,
          action,
          key: String(key),
          input: String(input),
          output: String(output),
          p: String(p),
        });
      msg(
        'dh.mitm.msg.enc',
        'alice',
        'encrypt',
        x.aliceSecret,
        message,
        c1,
        `Alice encrypts ${message} with her secret: ${message} · ${show(x.aliceSecret)} mod p = ${show(c1)}.`,
      );
      msg(
        'dh.mitm.msg.read',
        'mallory',
        'decrypt',
        x.malloryWithAlice,
        c1,
        read,
        `Mallory decrypts it with Alice's secret and reads ${read}.`,
      );
      msg(
        'dh.mitm.msg.reenc',
        'mallory',
        'encrypt',
        x.malloryWithBob,
        read,
        c2,
        `Mallory re-encrypts ${read} with Bob's secret: ${show(c2)}, and passes it on.`,
      );
      msg(
        'dh.mitm.msg.dec',
        'bob',
        'decrypt',
        x.bobSecret,
        c2,
        received,
        `Bob decrypts ${received}. It looks exactly right, so he suspects nothing.`,
      );
    },
    { id: 'relay', description: 'Mallory decrypts, reads, and re-encrypts.' },
  );

  run.group(
    'The fix',
    () => {
      run.step({
        kind: 'dh.mitmFix',
        id: 'dh.mitm.fix',
        label: 'The fix: prove who sent each share, by signing it.',
        detail:
          'If Bob signs B with his RSA private key (module 5) and Alice checks it with his public key, Mallory can’t pass off M₁ as Bob’s: she can’t sign without Bob’s key. That public key needs vouching for too, which is what certificates do. TLS 1.3 does exactly this: the server signs the handshake, key shares included, in CertificateVerify.',
        citation: 'rfc8446.4.4.3',
      });
    },
    { id: 'fix', description: 'Authenticate the key shares.' },
  );

  return run.finish();
}
