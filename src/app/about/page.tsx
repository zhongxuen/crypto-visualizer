import { CircleCheck, FlaskConical, MessageSquareText, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE } from '@/lib/site';

import { VECTOR_CARDS } from './facts';

export const metadata: Metadata = {
  title: 'About and accuracy',
  description:
    'What this site simplifies, what it only describes, and how its maths is checked.',
};

/**
 * `/about` (docs/UIUX.md §2.3, §4.1): the full disclaimers (docs/implementation/10 §2,
 * every sentence kept: aim 4), what is real, simplified or only described, how the maths
 * is checked, and the test-vector cards. Sectioned, with a table of contents that stays
 * in view on a wide screen. A server component with no JS of its own.
 */

const SECTIONS = [
  { id: 'teaching-not-security', title: 'Built for teaching, not for security' },
  { id: 'real-simplified-described', title: 'Real, simplified, described' },
  { id: 'how-the-maths-is-checked', title: 'How the maths is checked' },
  { id: 'test-vectors', title: 'Test vectors' },
  { id: 'privacy', title: 'Privacy' },
] as const;

const SUMMARY = [
  {
    title: 'Real',
    icon: CircleCheck,
    intro: 'Computed here, step by step, and checked against the real thing.',
    items: [
      'UTF-8, hex, binary and XOR',
      'SHA-256, every round, and HMAC-SHA-256',
      'PBKDF2-HMAC-SHA-256 at real iteration counts: the first three steps on screen, the rest in a worker',
      'AES-128 encryption and decryption, its key schedule, and the ECB, CBC and CTR modes with PKCS#7 padding',
      'RSA key generation, encryption, decryption and signing, with exact big-number arithmetic',
      'Diffie-Hellman, in toy groups and in RFC 3526’s 2048-bit group',
    ],
  },
  {
    title: 'Simplified',
    icon: FlaskConical,
    intro: 'Real maths on teaching-sized inputs, so every step can be checked by eye.',
    items: [
      'RSA and Diffie-Hellman default to numbers small enough to check on paper',
      'Keys, salts and nonces come from a seeded generator, so a run can be replayed',
      'RSA is shown unpadded (“textbook”), which is exactly why it is unsafe',
      'Paint mixing stands in for modular exponentiation before the real numbers arrive',
      'Cracking speeds are orders of magnitude from a cited benchmark',
    ],
  },
  {
    title: 'Only described',
    icon: MessageSquareText,
    intro: 'Explained with their sources, but never computed here.',
    items: [
      'bcrypt and Argon2',
      'RSA-OAEP and RSA-PSS padding',
      'AES-GCM’s authentication tag',
      'Elliptic curves (X25519)',
      'TLS 1.3, which comes next',
    ],
  },
] as const;

const H2 = 'font-display scroll-mt-6 text-3xl';

export default function AboutPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
      <header className="flex max-w-3xl flex-col gap-3">
        <p className="text-accent text-sm font-semibold tracking-wide uppercase">
          About and accuracy
        </p>
        <h1 className="font-display text-4xl">About {SITE.name}</h1>
        <p className="text-fg-secondary text-lg leading-8">{SITE.tagline}</p>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          aria-label="On this page"
          className="border-border flex flex-col gap-2 border-l-2 pl-4 lg:sticky lg:top-6 lg:self-start"
        >
          <p className="text-fg-muted text-sm font-semibold">On this page</p>
          <ol className="flex flex-col">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-fg-secondary hover:text-fg focus-visible:outline-focus min-h-target inline-flex items-center rounded-sm text-sm focus-visible:outline-2 md:min-h-8"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-14">
          <section
            aria-labelledby="teaching-not-security"
            className="flex flex-col gap-4"
          >
            <h2 id="teaching-not-security" className={H2}>
              Built for teaching, not for security
            </h2>
            <ul className="border-warn bg-surface flex flex-col gap-3 rounded-(--radius) border border-l-4 p-4 md:p-5">
              {[
                <>
                  The step implementations are deliberately slow, are not constant-time,
                  and must never protect real data. The test suite checks their output
                  against Node&apos;s crypto library and the published test vectors.
                </>,
                <>
                  Keys, salts and nonces come from a seeded, non-cryptographic random
                  generator (mulberry32) so every state can be replayed and shared. That
                  is exactly what real cryptography must never do.
                </>,
                <>
                  RSA and Diffie-Hellman use toy-sized numbers by default so every step
                  can be checked by hand. Real key sizes appear only as digit counts.
                </>,
                <>
                  bcrypt, Argon2, OAEP, PSS and AES-GCM are explained, not computed.
                  Elliptic curves (X25519) are described, not stepped, in v1.
                </>,
                <>
                  Password-cracking speeds are illustrative orders of magnitude from the
                  cited source, not measurements.
                </>,
              ].map((sentence, i) => (
                <li key={i} className="flex gap-3 leading-7">
                  <ShieldAlert
                    aria-hidden="true"
                    className="text-warn mt-1.5 size-4 shrink-0"
                  />
                  <span>{sentence}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="real-simplified-described"
            className="flex flex-col gap-4"
          >
            <h2 id="real-simplified-described" className={H2}>
              What’s real, what’s simplified, what’s only described
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {SUMMARY.map(({ title, icon: Icon, intro, items }) => (
                <article
                  key={title}
                  aria-labelledby={`summary-${title}`}
                  className="border-border bg-surface flex flex-col gap-3 rounded-(--radius) border p-4"
                >
                  <h3
                    id={`summary-${title}`}
                    className="font-display flex items-center gap-2 text-xl"
                  >
                    <Icon aria-hidden="true" className="text-accent size-5" />
                    {title}
                  </h3>
                  <p className="text-fg-secondary text-sm">{intro}</p>
                  <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm leading-6">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="how-the-maths-is-checked"
            className="flex max-w-3xl flex-col gap-2"
          >
            <h2 id="how-the-maths-is-checked" className={H2}>
              How the maths is checked
            </h2>
            <div className="prose-cv">
              <p>
                Every algorithm is written by hand in plain TypeScript: no crypto library,
                no Web Crypto, not even the browser&apos;s text encoder. A lint rule
                forbids importing them, and a test proves the rule fires. That matters
                because the main quality claim rests on comparing this code with the real
                thing:
              </p>
              <ul>
                <li>
                  <strong>Published test vectors.</strong> FIPS 180-4&apos;s SHA-256
                  examples, RFC 4231&apos;s HMAC-SHA-256 cases and RFC 7914&apos;s
                  PBKDF2-HMAC-SHA-256 vectors.
                </li>
                <li>
                  <strong>Differential tests.</strong> Thousands of seeded random inputs
                  run through both this site&apos;s implementation and Node&apos;s{' '}
                  <code>crypto</code> module, and the outputs must match byte for byte,
                  including the padding edge cases.
                </li>
                <li>
                  <strong>Stepped equals fast.</strong> The version you step through and
                  the fast version are the same code with a switch, and a test checks they
                  agree.
                </li>
                <li>
                  <strong>Determinism.</strong> Every built-in scenario runs twice and
                  must produce identical results, so a share link always replays the same
                  run.
                </li>
                <li>
                  <strong>Citations.</strong> Every step names the section of the standard
                  it comes from, and a test fails if one doesn&apos;t resolve. The full
                  list, module by module, is in{' '}
                  <a href={`${SITE.repoUrl}/blob/main/docs/ACCURACY.md`}>
                    docs/ACCURACY.md
                  </a>
                  .
                </li>
              </ul>
            </div>
          </section>

          <section aria-labelledby="test-vectors" className="flex flex-col gap-4">
            <h2 id="test-vectors" className={H2}>
              Test vectors
            </h2>
            <p className="text-fg-secondary max-w-3xl leading-7">
              One test file per algorithm, run on every build. Each card says what it is
              checked against; the figures are read from the tests themselves.
            </p>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {VECTOR_CARDS.map((card) => (
                <li
                  key={card.file}
                  className="border-border bg-surface flex flex-col gap-2 rounded-(--radius) border p-4"
                >
                  <h3 className="font-semibold">{card.algorithm}</h3>
                  <p className="flex items-baseline gap-2">
                    <span className="font-display text-accent text-3xl tabular-nums">
                      {card.figure}
                    </span>
                    <span className="text-fg-secondary text-sm">{card.figureLabel}</span>
                  </p>
                  <p className="text-sm leading-6">{card.vectors}</p>
                  <p className="text-fg-secondary text-sm leading-6">{card.random}</p>
                  <p className="text-fg-muted mt-auto font-mono text-xs break-all">
                    {card.file}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="privacy" className="flex max-w-3xl flex-col gap-2">
            <h2 id="privacy" className={H2}>
              Privacy
            </h2>
            <div className="prose-cv">
              <p>
                There is no account and no database. A share link carries the inputs of a
                run in the URL. A password you type in the passwords module is never put
                in a link or in your browser&apos;s storage; share links there only name
                built-in example passwords. Your progress and theme are kept in your own
                browser under <code>cv:v1</code>.
              </p>
              <p>
                Ready to start? The <Link href="/learn">learning path</Link> lists every
                chapter, and the <Link href="/glossary">glossary</Link> explains the
                words.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
