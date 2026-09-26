# src/components

Shared UI building blocks used by more than one module: the timeline (play / pause / step
/ step back / scrub / speed), the byte grid, the bit-diff strip, the modular clock, and the
page shell.

## Rules

- Components render data they're given. They never compute cryptography. Anything that
  computes belongs in `src/core`.
- No imports from `src/modules/**` (rule 5 in `eslint.config.mjs`). A component that needs
  knowledge of one module belongs in that module. The one exception is
  `src/modules/registry.ts`, the module manifest, which navigation may read.
- Every component works by keyboard alone, respects `prefers-reduced-motion`, and passes
  axe.
- Changing a shared component is a shared-contract change. A parallel module agent stops
  and reports instead of editing one (see `CLAUDE.md`).

Tests run in the Vitest `ui` project (jsdom).
