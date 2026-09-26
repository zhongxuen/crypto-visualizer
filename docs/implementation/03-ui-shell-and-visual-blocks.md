# 03 — UI shell, timeline UI and visual building blocks

Wave: **W2** (3.1) and **W3** (3.2) · Estimate: 2 days · Original plan: phase 0 (UI part)

## Goal

The app shell and every shared UI piece modules need, so module UIs only compose them:
the timeline and playback controls, the byte grid, the bit-diff strip, the modular clock,
the step inspector with citations, and the module page layout.

## Prerequisites

02.

---

## Deliverables

```
src/styles/tokens.css           colour, spacing, type tokens; light + dark
src/components/shell/           SiteHeader, SiteFooter, ModuleLayout, DisclaimerBanner, ThemeToggle
src/components/timeline/        usePlayback (Zustand), usePlaybackKeys, Timeline,
                                PlaybackControls, PhaseStepper, StepCaption
src/components/inspector/       StepInspector, CitationLink
src/components/blocks/          ByteGrid, BitDiffStrip, ModClock, NumberTrace, HexBinToggle
src/components/state/           useShareState, useProgress (localStorage `cv:v1`)
src/app/about/page.tsx          disclaimers + how accuracy is checked
VENDORED.md                     (append the timeline UI entries)
```

---

## Steps

### 1. Tokens and shell (prompt 3.1)

- Tokens in `tokens.css` as CSS variables consumed by Tailwind v4 `@theme`. Light and
  dark, `prefers-color-scheme` plus a manual toggle.
- **Diff palette is colour-blind safe:** a flipped bit is shown by colour **and** a shape
  or pattern (filled vs hollow, hatching). Checked with a simulated deuteranopia
  screenshot in 10.2.
- `ModuleLayout`: title, one-line intro, mode switch (Walkthrough / Free play), the
  visual area, the inspector panel, the timeline pinned at the bottom.
- `DisclaimerBanner` on every module page: "Built for teaching, not for security."
  links to `/about`.
- `/about` holds the full disclaimers (see 10-quality-and-release.md) and explains the
  differential tests.

### 2. Timeline (prompt 3.1)

Vendor the playback UI from Internet Visualizer (`src/components/viz/Timeline.tsx`,
`PlaybackControls.tsx`, `PhaseStepper.tsx`, `StepCaption.tsx`, `keymap.ts`,
`hooks/usePlayback.ts`, `hooks/usePlaybackKeys.ts`) into `src/components/timeline/`,
stripping anything tied to React Flow or packets. Record it in `VENDORED.md`.

Keyboard: Space play/pause, ←/→ step, Shift+←/→ previous/next group, Home/End, 1–5 speed.
Reduced motion: no tweening, instant step changes.

### 3. Building blocks (prompt 3.2)

| Component | Used by | Behaviour |
|---|---|---|
| `ByteGrid` | XOR, AES, SHA-256, HMAC | N×M bytes, hex/binary toggle, highlight a set of cells, optional "changed since last step" marker. 4×4 column-major mode for AES state. Each cell is focusable with an `aria-label` like "row 2, column 3, 0x5f" |
| `BitDiffStrip` | XOR, SHA-256 avalanche, AES avalanche | Two byte arrays → a strip of bits with flipped bits marked by colour + shape; shows count and percentage |
| `ModClock` | RSA, DH | Clock face with *m* positions (numbers shown only when m ≤ 60), and a number-line fallback for large m |
| `NumberTrace` | RSA (extended Euclid), DH (square-and-multiply) | A table that grows one row per step, current row highlighted |
| `StepInspector` | all | Current event's `label`, `detail`, and a `CitationLink` that opens the standard at the cited section |

Each component gets a unit test and an axe check in the component test.

### 4. State hooks (prompt 3.2)

- `useShareState(moduleId)`: read/write `?s=` via the phase-02 codec with
  `router.replace` (no history spam), debounced.
- `useProgress()`: `localStorage` key `cv:v1`, versioned `{ v: 1, completed: string[],
  prefs: {...} }` with a migration function. Wrapped in try/catch, never read during
  server render.

---

## Acceptance criteria

- [ ] A demo page (`/demo`, noindex and not in the sitemap; underscore folders are private in the App Router) drives every building block from a
      fake `SimResult`, keyboard only
- [ ] Every component has tests and is axe clean in light and dark
- [ ] Reduced motion turns off every animation
- [ ] `npm run verify` passes

---

## Prompts to execute

### Prompt 3.1 — tokens, shell, timeline (wave W2, parallel with the core prompts)

```
Read docs/implementation/00-overview.md and docs/implementation/03-ui-shell-and-visual-blocks.md.
Look at ../internet-visualizer/src/components/viz and src/styles for the originals.

Build steps 1 and 2: tokens.css (light/dark, colour-blind-safe diff palette with shape as
well as colour), the shell components, ModuleLayout, DisclaimerBanner, the /about page
skeleton, and the timeline UI vendored from Internet Visualizer (drop React Flow and packet
code, record it in VENDORED.md). Wire the timeline to the phase-02 SimResult and prove it
with a /demo page driven by a fake run.

Only touch src/styles, src/components/shell, src/components/timeline, src/app and
VENDORED.md. Done when `npm run verify` passes. Commit.
```

### Prompt 3.2 — building blocks and state hooks (wave W3, before the module UIs)

```
Read docs/implementation/03-ui-shell-and-visual-blocks.md steps 3-4.

Build ByteGrid, BitDiffStrip, ModClock, NumberTrace, HexBinToggle, StepInspector and
CitationLink, plus useShareState and useProgress. Each gets unit tests and an axe check.
Add them all to the /demo page. Keyboard access and aria labels as specified.

Only touch src/components and the /demo route. Done when `npm run verify` passes. Commit.
```
