import type { Metadata } from 'next';

import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About and accuracy',
  description:
    'What this site simplifies, what it only describes, and how its maths is checked.',
};

/**
 * The full disclaimers (docs/implementation/10 §2) and how accuracy is checked. Phase 10
 * finalises the wording; the substance is already true.
 */
export default function AboutPage() {
  return (
    <main id="main" className="prose-cv mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">About {SITE.name}</h1>
      <p className="text-fg-secondary text-lg">{SITE.tagline}</p>

      <h2>Built for teaching, not for security</h2>
      <ul>
        <li>
          The step implementations are deliberately slow, are not constant-time, and must
          never protect real data. The test suite checks their output against Node&apos;s
          crypto library and the published test vectors.
        </li>
        <li>
          Keys, salts and nonces come from a seeded, non-cryptographic random generator
          (mulberry32) so every state can be replayed and shared. That is exactly what
          real cryptography must never do.
        </li>
        <li>
          RSA and Diffie-Hellman use toy-sized numbers by default so every step can be
          checked by hand. Real key sizes appear only as digit counts.
        </li>
        <li>
          bcrypt, Argon2, OAEP, PSS and AES-GCM are explained, not computed. Elliptic
          curves (X25519) are described, not stepped, in v1.
        </li>
        <li>
          Password-cracking speeds are illustrative orders of magnitude from the cited
          source, not measurements.
        </li>
      </ul>

      <h2>How the maths is checked</h2>
      <p>
        Every algorithm is written by hand in plain TypeScript: no crypto library, no Web
        Crypto, not even the browser&apos;s text encoder. A lint rule forbids importing
        them, and a test proves the rule fires. That matters because the main quality
        claim rests on comparing this code with the real thing:
      </p>
      <ul>
        <li>
          <strong>Published test vectors.</strong> FIPS 180-4&apos;s SHA-256 examples, RFC
          4231&apos;s HMAC-SHA-256 cases and RFC 7914&apos;s PBKDF2-HMAC-SHA-256 vectors.
        </li>
        <li>
          <strong>Differential tests.</strong> Thousands of seeded random inputs run
          through both this site&apos;s implementation and Node&apos;s <code>crypto</code>{' '}
          module, and the outputs must match byte for byte, including the padding edge
          cases.
        </li>
        <li>
          <strong>Stepped equals fast.</strong> The version you step through and the fast
          version are the same code with a switch, and a test checks they agree.
        </li>
        <li>
          <strong>Determinism.</strong> Every built-in scenario runs twice and must
          produce identical results, so a share link always replays the same run.
        </li>
        <li>
          <strong>Citations.</strong> Every step names the section of the standard it
          comes from, and a test fails if one doesn&apos;t resolve.
        </li>
      </ul>

      <h2>Privacy</h2>
      <p>
        There is no account and no database. A share link carries the inputs of a run in
        the URL. A password you type in the passwords module is never put in a link or in
        your browser&apos;s storage; share links there only name built-in example
        passwords. Your progress and theme are kept in your own browser under{' '}
        <code>cv:v1</code>.
      </p>
    </main>
  );
}
