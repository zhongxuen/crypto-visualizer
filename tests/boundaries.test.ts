import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Proves the src/core rules in eslint.config.mjs actually fire.
 *
 * A lint rule that is misconfigured fails silently: a typo in a selector, or a later
 * config object replacing an earlier one's options, and `npm run lint` goes on passing
 * while enforcing nothing. So each rule is exercised here against the real config, with
 * source text linted *as if* it lived at a given path. Nothing is written to disk.
 *
 * The crypto ban matters most. The project's main quality claim is that core is checked
 * against node:crypto; if core could call node:crypto, that check would prove nothing.
 */

const CORE_FILE = 'src/core/example.ts';
const CORE_TEST_FILE = 'src/core/example.test.ts';
const DIFFERENTIAL_FILE = 'tests/differential/example.test.ts';

let eslint: ESLint;

/**
 * The first lint pays for loading the config and every plugin in it -- several seconds
 * on its own, which would otherwise land on whichever test happens to run first.
 */
beforeAll(async () => {
  eslint = new ESLint({ cwd: process.cwd() });
  await eslint.lintText('export {};', { filePath: CORE_FILE });
}, 120_000);

async function ruleIdsFor(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId ?? `fatal: ${message.message}`);
}

describe('src/core crypto ban (rule 2)', () => {
  it.each([
    [
      'import from node:crypto',
      "import { createHash } from 'node:crypto';\nexport { createHash };",
      'no-restricted-imports',
    ],
    [
      'import from crypto',
      "import { createHash } from 'crypto';\nexport { createHash };",
      'no-restricted-imports',
    ],
    [
      'namespace import',
      "import * as c from 'node:crypto';\nexport { c };",
      'no-restricted-imports',
    ],
    ['re-export', "export { webcrypto } from 'node:crypto';", 'no-restricted-imports'],
    [
      'a crypto library',
      "import { sha256 } from '@noble/hashes/sha2';\nexport { sha256 };",
      'no-restricted-imports',
    ],
    [
      'dynamic import',
      "export const load = () => import('node:crypto');",
      'no-restricted-syntax',
    ],
    ['require', "export const c = require('crypto');", 'no-restricted-syntax'],
    [
      'the bare global',
      'export const bytes = crypto.getRandomValues(new Uint8Array(4));',
      'no-restricted-globals',
    ],
    [
      'globalThis.crypto',
      'export const c = globalThis.crypto;',
      'no-restricted-properties',
    ],
    ['window.crypto', 'export const c = window.crypto;', 'no-restricted-properties'],
    ['self.crypto', 'export const c = self.crypto;', 'no-restricted-properties'],
    [
      'destructured from globalThis',
      'const { crypto: c } = globalThis;\nexport { c };',
      'no-restricted-properties',
    ],
    [
      'crypto.subtle on a local alias',
      'declare const crypto: { subtle: unknown };\nexport const s = crypto.subtle;',
      'no-restricted-properties',
    ],
  ])('rejects %s', async (_name, code, ruleId) => {
    expect(await ruleIdsFor(code, CORE_FILE)).toContain(ruleId);
  });

  it('rejects globalThis.crypto.subtle through both the global object and .subtle', async () => {
    const ids = await ruleIdsFor('export const s = globalThis.crypto.subtle;', CORE_FILE);
    expect(ids).toContain('no-restricted-properties');
  });

  it('applies to nested folders in src/core', async () => {
    const code = "import { createHash } from 'node:crypto';\nexport { createHash };";
    expect(await ruleIdsFor(code, 'src/core/sha256/compress.ts')).toContain(
      'no-restricted-imports',
    );
  });

  it('allows node:crypto in a core test file', async () => {
    const code = "import { createHash } from 'node:crypto';\nexport { createHash };";
    expect(await ruleIdsFor(code, CORE_TEST_FILE)).toEqual([]);
  });

  it('allows node:crypto in tests/differential', async () => {
    const code =
      "import { createHash } from 'node:crypto';\nexport const h = createHash('sha256');\nexport const b = globalThis.crypto;";
    expect(await ruleIdsFor(code, DIFFERENTIAL_FILE)).toEqual([]);
  });

  it('does not flag code that merely mentions the word', async () => {
    const code = [
      'export const cryptoLabel = "crypto";',
      'export function subtle(x: { subtle: number }): number {',
      '  return x.subtle;',
      '}',
    ].join('\n');
    expect(await ruleIdsFor(code, CORE_FILE)).toEqual([]);
  });
});

describe('src/core platform encoding ban (rule 2)', () => {
  it.each([
    ['TextEncoder', 'export const b = new TextEncoder().encode("a");'],
    ['TextDecoder', 'export const s = new TextDecoder().decode(new Uint8Array(1));'],
    ['Buffer', 'export const h = Buffer.from([1]).toString("hex");'],
    ['atob', 'export const s = atob("QQ==");'],
    ['btoa', 'export const s = btoa("A");'],
  ])('rejects %s', async (_name, code) => {
    expect(await ruleIdsFor(code, CORE_FILE)).toContain('no-restricted-globals');
  });

  it('allows them in a core test file, where they are oracles', async () => {
    const code =
      'export const b = new TextEncoder().encode(Buffer.from("a").toString());';
    expect(await ruleIdsFor(code, CORE_TEST_FILE)).toEqual([]);
  });
});

describe('src/core determinism (rule 3)', () => {
  it.each([
    ['Math.random()', 'export const r = Math.random();', 'no-restricted-properties'],
    ['Date.now()', 'export const t = Date.now();', 'no-restricted-properties'],
    [
      'performance.now()',
      'export const t = performance.now();',
      'no-restricted-properties',
    ],
    ['new Date()', 'export const d = new Date();', 'no-restricted-syntax'],
    ['Date()', 'export const d = Date();', 'no-restricted-syntax'],
  ])('rejects %s', async (_name, code, ruleId) => {
    expect(await ruleIdsFor(code, CORE_FILE)).toContain(ruleId);
  });

  it('allows them in a core test file', async () => {
    const code = 'export const r = Math.random() + Date.now() + new Date().getTime();';
    expect(await ruleIdsFor(code, CORE_TEST_FILE)).toEqual([]);
  });
});

describe('src/core framework ban (rule 1)', () => {
  it.each([
    ['react', "import { useState } from 'react';\nexport { useState };"],
    ['next/*', "import Link from 'next/link';\nexport { Link };"],
    ['motion', "import { motion } from 'motion/react';\nexport { motion };"],
    ['@/components', "import { X } from '@/components/X';\nexport { X };"],
    ['@/modules', "import { X } from '@/modules/xor/X';\nexport { X };"],
  ])('rejects %s', async (_name, code) => {
    expect(await ruleIdsFor(code, CORE_FILE)).toContain('no-restricted-imports');
  });
});

describe('outside src/core', () => {
  it('leaves Math.random alone in UI code', async () => {
    const code = 'export const r = Math.random();';
    expect(await ruleIdsFor(code, 'src/components/example.ts')).toEqual([]);
  });
});
