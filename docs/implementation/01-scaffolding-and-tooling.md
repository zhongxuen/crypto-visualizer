# 01 — Scaffolding, tooling and boundary rules

Wave: **W0** · Estimate: 1 day · Original plan: phase 0 (first half)

## Goal

A running Next.js + TypeScript + Tailwind v4 app with the folder layout, lint/format/test
tooling, CI, and the **architecture boundary rules** every later phase relies on. No
product features.

## Prerequisites

None. Node 22+ and npm 10+.

---

## Deliverables

```
package.json  tsconfig.json  next.config.ts  eslint.config.mjs  .prettierrc
vitest.config.mts  playwright.config.ts  .env.example  CLAUDE.md  AGENTS.md
.github/workflows/ci.yml
src/
  app/layout.tsx  app/page.tsx  app/globals.css
  core/README.md            # what may and may not be imported here
  components/README.md
  modules/README.md  modules/registry.ts
  lib/cn.ts  lib/site.ts
tests/setup.ts
tests/differential/README.md
e2e/smoke.spec.ts
```

---

## Steps

### 1. Scaffold

`create-next-app` with App Router, TypeScript, Tailwind, ESLint, `src/` and the `@/*`
alias. Use the **same Next major as Internet Visualizer (16.x)**. Next 16 has breaking
changes: read the relevant guide in `node_modules/next/dist/docs/` before writing code,
and keep the `AGENTS.md` block `next dev` writes.

### 2. Dependencies

Runtime: `zustand`, `zod`, `clsx`, `tailwind-merge`, `lucide-react`, `motion`,
`@next/mdx` + `@mdx-js/react` + `remark-gfm` (for lessons), `@vercel/analytics`.
**No crypto library of any kind.**

Dev: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@playwright/test`,
`@axe-core/playwright`, `prettier`, `prettier-plugin-tailwindcss`,
`eslint-plugin-boundaries`.

### 3. Boundary rules (`eslint.config.mjs`)

Copy the structure of Internet Visualizer's `eslint.config.mjs` and adapt it:

1. `src/core/**` (non-test files) may not import `react`, `react-dom`, `next`, `next/*`,
   `motion`, `@/components/**`, `@/modules/**`, `@/app/**`.
2. **New:** `src/core/**` (non-test files) may not import `crypto`, `node:crypto`, or
   reference `globalThis.crypto` / `window.crypto` / `crypto.subtle`
   (`no-restricted-imports` + `no-restricted-globals` + `no-restricted-properties`).
3. `src/core/**` may not call `Math.random` or `Date.now` / `new Date()`
   (`no-restricted-properties`, `no-restricted-syntax`).
4. `src/modules/<a>/**` may not import `src/modules/<b>/**`.
5. `src/components/**` may not import `src/modules/**` (the registry is the exception).

Add a comment block at the top explaining each rule and why, as Internet Visualizer does.

### 4. Tests

- Vitest with two projects: `core` (node environment: `src/core/**`, `tests/**`) and `ui`
  (jsdom: `src/components/**`, `src/modules/**`).
- `tests/differential/` runs in the node project and **is the only place allowed to
  import `node:crypto`**.
- Playwright: Chromium only locally, all three in CI. `e2e/smoke.spec.ts` loads `/` and
  runs axe.

### 5. Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `test`,
`test:watch`, `test:coverage`, `test:e2e`, and
`verify` = `lint && typecheck && test && build`.

### 6. Registry

`src/modules/registry.ts` lists the six v1 modules plus TLS 1.3 with
`{ slug, route, title, blurb, number, status: 'planned' | 'ready', phase: 1 | 2 }`.
The home page renders it as a list of cards; `planned` cards are not links.

### 7. CI

GitHub Actions: install, `npm run verify`, Playwright against the production build.

### 8. `CLAUDE.md`

Project summary, the aims from `00-overview.md` §2, the boundary rules, the "no crypto
library in core" rule, and the rules for parallel agents (00-overview §4).

---

## Acceptance criteria

- [ ] `npm run verify` passes on a clean clone
- [ ] A test file that imports `node:crypto` from `src/core/x.ts` fails lint
      (add then delete, or keep as a lint fixture test)
- [ ] `Math.random()` in `src/core` fails lint
- [ ] `/` renders the seven module cards from the registry, axe clean
- [ ] CI is green

---

## Prompts to execute

### Prompt 1.1 — scaffold and tooling

```
Read docs/implementation/00-overview.md and docs/implementation/01-scaffolding-and-tooling.md.
Also look at ../internet-visualizer/eslint.config.mjs, vitest.config.mts, playwright.config.ts
and package.json for the conventions to copy.

Scaffold the Next.js app in this repo (keep the existing README.md, docs/ and .gitignore).
Use the same Next major as Internet Visualizer. Before writing Next code, read the relevant
guides in node_modules/next/dist/docs/.

Install the dependencies listed in step 2 (no crypto libraries). Configure Vitest with the
node `core` project and jsdom `ui` project, Playwright with axe, Prettier, and the npm
scripts in step 5 including `verify`.

Write eslint.config.mjs with all five boundary rules from step 3, including the new rule
that bans crypto / node:crypto / globalThis.crypto / crypto.subtle, Math.random and
Date.now in src/core (test files excepted). Add a test that proves the crypto ban works.

Done when `npm run verify` passes. Commit on a branch named chore/scaffold.
```

### Prompt 1.2 — registry, home page, CI, CLAUDE.md

```
Read docs/implementation/01-scaffolding-and-tooling.md steps 6-8.

Create src/modules/registry.ts with the seven modules from 00-overview.md §3 (all
status 'planned'), a minimal home page that lists them as cards, the e2e smoke test with
axe, the GitHub Actions workflow, and CLAUDE.md with the aims, boundary rules and parallel
agent rules. Also write the README files for src/core, src/components and src/modules
explaining what belongs in each.

Done when `npm run verify` and `npm run test:e2e` pass. Commit.
```
