/**
 * "How we know it's right" on the home page: only figures the build itself enforces, so
 * they can't quietly go stale. `tests/home-facts.test.ts` checks each one against the
 * repository: the number of differential test files, and the coverage floor in
 * `vitest.config.mts`.
 */

/** One `tests/differential/<algo>.test.ts` per algorithm checked against node:crypto. */
export const DIFFERENTIAL_ALGORITHMS = 6;

/** The `src/core` coverage floor `npm run verify` enforces, in percent. */
export const CORE_COVERAGE_FLOOR = 95;

export const HOME_FACTS = [
  {
    figure: String(DIFFERENTIAL_ALGORITHMS),
    title: 'algorithms checked against node:crypto',
    detail:
      'SHA-256, HMAC, PBKDF2, AES, RSA and Diffie-Hellman, each against Node’s own crypto and the published test vectors.',
    href: '/about#how-the-maths-is-checked',
  },
  {
    figure: '1000s',
    title: 'of seeded random inputs',
    detail:
      'Run through this site’s code and the real thing, which must agree byte for byte, padding edge cases included.',
    href: '/about#how-the-maths-is-checked',
  },
  {
    figure: `${CORE_COVERAGE_FLOOR}%`,
    title: 'test coverage, at least',
    detail:
      'Every build fails if the step implementations drop below it. None of it uses a crypto library.',
    href: '/about#how-the-maths-is-checked',
  },
] as const;
