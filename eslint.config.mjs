import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';

/**
 * The architecture boundary rules below are the mechanical enforcement of the project
 * aims in docs/implementation/00-overview.md §2. Five rules:
 *
 *   1. src/core/** may not import any framework, UI, app or module code.
 *      -> The step implementations are pure TypeScript, unit-testable in node with no DOM.
 *   2. src/core/** may not import `crypto` / `node:crypto`, nor reach the Web Crypto API
 *      through `crypto`, `globalThis.crypto`, `window.crypto` or `crypto.subtle`.
 *      -> Aim 2, "be provably correct": core is checked against node:crypto in
 *         tests/differential/. If core could quietly call the real thing, that check
 *         would be comparing node:crypto with itself and prove nothing.
 *      The same goes for byte encodings: no TextEncoder, TextDecoder, Buffer, atob or
 *      btoa. src/core/bytes implements UTF-8, hex and base64url, checked against those.
 *   3. src/core/** may not call `Math.random`, `Date.now`, `performance.now` or `Date()`.
 *      -> Aim 3, "be deterministic": same input + same seed = the same run. Randomness
 *         comes from the seeded RNG in src/core/sim, and time from the virtual timeline.
 *   4. src/modules/<a>/** may not import src/modules/<b>/**.
 *      -> Modules are built by parallel agents; each one only touches its own folder.
 *   5. src/components/** may not import src/modules/**.
 *      -> Shared UI stays shared.
 *
 * Rules 1-3 exempt `*.test.ts` files inside src/core: a test may compare against
 * node:crypto or fix a clock. tests/differential/ is outside src/core and is where the
 * comparisons against node:crypto belong. tests/boundaries.test.ts proves rules 2 and 3
 * actually fire, so a change here that silently disables them fails the test suite.
 *
 * Without these, all five erode within a few phases. Do not weaken them; if a rule is in
 * the way, the code is on the wrong side of a boundary.
 *
 * `src/modules/registry.ts` is deliberately NOT a module -- it is the shared manifest that
 * navigation and the home page read, so importing it from components is allowed.
 */

const CORE_FILES = ['src/core/**/*.{ts,tsx}'];
const CORE_TESTS = ['src/core/**/*.test.ts'];

const FRAMEWORK_MESSAGE =
  'src/core is framework-free step logic: it must be unit-testable in a node environment with no DOM. Move anything that needs React into src/components or the module that uses it.';

const CRYPTO_MESSAGE =
  'src/core must implement the algorithm itself: no crypto / node:crypto / Web Crypto and no crypto library. The differential tests compare core against node:crypto, so core calling it would make them prove nothing. Comparisons belong in tests/differential/.';

const ENCODING_MESSAGE =
  'src/core implements its own byte encodings (src/core/bytes): no TextEncoder, TextDecoder, Buffer, atob or btoa. Tests use them as oracles to check core against.';

const DETERMINISM_MESSAGE =
  'src/core must be deterministic: same input + same seed = the same run. Use the seeded RNG from src/core/sim and the virtual timeline instead of real randomness or the wall clock.';

/** Crypto libraries of any kind. Core implements the maths; it never borrows it. */
const CRYPTO_MODULES = ['crypto', 'node:crypto'];
const CRYPTO_LIBRARY_PATTERNS = [
  'crypto/*',
  'crypto-js',
  'crypto-js/*',
  'node-forge',
  'node-forge/*',
  '@noble/*',
  'tweetnacl',
  'tweetnacl/*',
  'elliptic',
  'bn.js',
  'jose',
  'jose/*',
];

/** `require('crypto')` and `import('node:crypto')` are imports too. */
const CRYPTO_SPECIFIER = '/^(node:)?crypto$/';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ---------------------------------------------------------------------------
  // Rules 1, 2 and 3: src/core stays framework-free, crypto-free and deterministic.
  //
  // One config object on purpose: ESLint replaces a rule's options wholesale when a
  // later object configures the same rule for the same files, so splitting these would
  // silently drop whichever came first.
  // ---------------------------------------------------------------------------
  {
    files: CORE_FILES,
    ignores: CORE_TESTS,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...['react', 'react-dom', 'next', 'motion', 'motion-dom', 'zustand'].map(
              (name) => ({ name, message: FRAMEWORK_MESSAGE }),
            ),
            ...CRYPTO_MODULES.map((name) => ({ name, message: CRYPTO_MESSAGE })),
          ],
          patterns: [
            {
              group: ['next/*', 'react-dom/*', 'motion/*', 'zustand/*'],
              message: FRAMEWORK_MESSAGE,
            },
            {
              group: [
                '@/app/*',
                '@/components/*',
                '@/modules/*',
                '**/app/**',
                '**/components/**',
                '**/modules/**',
              ],
              message:
                'src/core must not depend on the app, UI components, or any module. Dependencies point inward: app -> modules -> components -> core.',
            },
            { group: CRYPTO_LIBRARY_PATTERNS, message: CRYPTO_MESSAGE },
          ],
        },
      ],

      'no-restricted-globals': [
        'error',
        // Rule 2: the bare global, e.g. `crypto.getRandomValues(...)`, `crypto.subtle`.
        { name: 'crypto', message: CRYPTO_MESSAGE },
        // Rule 2, same reasoning one level down: module 1 teaches UTF-8 and base64url, so
        // src/core/bytes implements them and tests compare against the platform versions.
        ...['TextEncoder', 'TextDecoder', 'Buffer', 'atob', 'btoa'].map((name) => ({
          name,
          message: ENCODING_MESSAGE,
        })),
      ],

      'no-restricted-properties': [
        'error',
        // Rule 2: the same global reached through a global object.
        ...['globalThis', 'window', 'self', 'global'].map((object) => ({
          object,
          property: 'crypto',
          message: CRYPTO_MESSAGE,
        })),
        // Rule 2: `crypto.subtle` on anything named crypto, including a local alias.
        { object: 'crypto', property: 'subtle', message: CRYPTO_MESSAGE },
        // Rule 3.
        { object: 'Math', property: 'random', message: DETERMINISM_MESSAGE },
        { object: 'Date', property: 'now', message: DETERMINISM_MESSAGE },
        { object: 'performance', property: 'now', message: DETERMINISM_MESSAGE },
      ],

      'no-restricted-syntax': [
        'error',
        // Rule 2: dynamic and CommonJS forms that no-restricted-imports does not see.
        {
          selector: `ImportExpression[source.value=${CRYPTO_SPECIFIER}]`,
          message: CRYPTO_MESSAGE,
        },
        {
          selector: `CallExpression[callee.name='require'][arguments.0.value=${CRYPTO_SPECIFIER}]`,
          message: CRYPTO_MESSAGE,
        },
        // Rule 3: `new Date()` and `Date()` both read the wall clock.
        { selector: "NewExpression[callee.name='Date']", message: DETERMINISM_MESSAGE },
        { selector: "CallExpression[callee.name='Date']", message: DETERMINISM_MESSAGE },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Rules 1 (by element type), 4 and 5, enforced by path element type.
  // ---------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx,js,jsx,mjs}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'core', pattern: 'src/core' },
        { type: 'components', pattern: 'src/components' },
        { type: 'module', pattern: 'src/modules/*', capture: ['moduleName'] },
        { type: 'lib', pattern: 'src/lib' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            // Rule 1
            {
              from: { element: { type: 'core' } },
              disallow: {
                to: { element: { types: { anyOf: ['app', 'components', 'module'] } } },
              },
              message:
                'src/core must stay framework-free: it may not import UI, app, or module code.',
            },
            // Rule 5
            {
              from: { element: { type: 'components' } },
              disallow: { to: { element: { type: 'module' } } },
              message:
                'src/components are shared building blocks and may not depend on a specific module. If it needs module knowledge, it belongs in that module.',
            },
            // Rule 4
            {
              from: { element: { type: 'module' } },
              disallow: {
                to: {
                  element: {
                    type: 'module',
                    captured: { moduleName: '!{{from.captured.moduleName}}' },
                  },
                },
              },
              message:
                'Modules are independent: this module may not import from "{{to.captured.moduleName}}". Share via src/core or src/components instead.',
            },
          ],
        },
      ],
    },
  },

  // Tests and config files sit outside the architecture; exempt them.
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*', 'e2e/**/*', '*.config.{ts,mts,mjs,js}'],
    rules: {
      'boundaries/dependencies': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
