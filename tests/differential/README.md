# tests/differential

Step implementations in `src/core/` checked against the real thing: `node:crypto` and the
published test vectors (FIPS 180-4, RFC 4231, RFC 7914 §11, FIPS 197, SP 800-38A, ...).
This is the project's main quality claim.

- One file per algorithm: `<algo>.test.ts`. Runs in the Vitest `core` project (node).
- This folder is where `node:crypto` belongs. `src/core/**` (non-test files) may not import
  it or touch Web Crypto -- see rule 2 in `eslint.config.mjs`, proved by
  `tests/boundaries.test.ts`. If core could call node:crypto, comparing core against it
  would prove nothing.
- Every vector cites its source (document and section) next to the data.
