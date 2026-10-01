# Crypto Visualizer — UI/UX and motion plan

Written: 2026-10-01
Status: **[planned]**
Applies to: every route in `src/app`, every shared component in `src/components`, every
module in `src/modules`. Core (`src/core`) is not touched by this plan.

This plan comes from two passes over the site, run on a production build at 1366×850
(desktop) and 390×844 (phone), in light and dark:

1. **A beginner pass.** Someone who has heard of "encryption" and wants to understand it,
   not a cryptographer. Where do they get lost, bored, confused or stuck?
2. **A design and motion pass.** Every page, section and component listed, given a UI that
   suits it, one theme for the whole site, and animations that explain the maths instead
   of decorating it.

Then come the waves of work and the prompts that run them (§9). The format follows the
phase files in `docs/implementation/`.

Everything here is judged against the project aims in `CLAUDE.md`. Two of them constrain
the design work directly:

- **Aim 5 (quality bar):** axe on every route, keyboard-only use, reduced motion, and
  **170 KB of gzipped first-load JS per module route**. Every route is inside it now, but
  `/rsa` has 0.4 KB left (§3, B2), so the motion work has to be CSS-first and cheap.
- **Aim 4 (honesty):** the redesign must not hide the "for learning only" message. It can
  say it once, clearly, instead of three times.

---

## 1. The broken link (fixed 2026-10-01)

**Symptom:** `https://crypto-visualizer-sigma.vercel.app/` returned
`404 DEPLOYMENT_NOT_FOUND`.

**Cause:** the Vercel project builds production from GitHub `main`. `main` held only the
README and the docs (2 commits). The app was on the local branch `feat/phases-03-06`,
19 commits ahead and never pushed, plus about 60 uncommitted files. Every production build
failed with `No Next.js version detected` (there was no `package.json`), so no production
deployment existed for the domain to point at.

**Fix:**

1. The DH UI tests had broken when `/dh` started loading its later chapters after
   hydration, so they were changed to wait for that code
   (`src/modules/dh/DhModule.test.tsx`, test-only).
2. `npm run verify`: lint, typecheck, 661 tests (99.8% core coverage) and the build all
   pass. The bundle budget failed then (§3, B2); it passes since the B2 fix.
3. The work was committed as `fde4d30`, `main` was fast-forwarded to it, and both branches
   were pushed.
4. Vercel production deployment `dpl_2WrNCwp6ESzYfdASfzqzVwW9EgfZ` is READY, aliased to
   `crypto-visualizer-sigma.vercel.app`, and all 8 public routes return 200 with the
   security headers set.

**Still to do (wave 0):**

- GitHub reported "Changes must be made through a pull request" for `main`; the push went
  through on an admin bypass. **Decided 2026-10-01:** work is committed and pushed straight
  to `main`, with no branch or PR unless one is actually needed (the parallel worktrees in
  wave 2). Either relax the branch rule on GitHub or keep relying on the bypass.
- ~~Get the three over-budget routes back under 170 KB (B2).~~ Done: all six module
  routes are within budget and `npm run verify` runs `perf:bundles`. Getting them to
  165 KB for the motion work is still open (U0.2).

---

## 2. Beginner walkthrough: pain points

Each point says what happened, why it hurts a learner, and the fix (referenced in §9).

### 2.1 Across the whole site

| # | Pain point | Why it hurts | Fix |
|---|---|---|---|
| P1 | **No "start here".** The home page is seven equal cards with "Ready" badges. Nothing says the modules build on each other, how long each takes, or which to open first. `/learn` (planned in phase 10.1) is a 404. | A beginner opens AES or RSA first, because those are the names they know, and hits hex and modular arithmetic cold. | Home hero with a single "Start with module 1" call to action, a numbered learning path drawn as a connected route, a time estimate and "you'll need" per module, and progress ticks. (W1.3, W3.1) |
| P2 | **Prose wall before any picture.** On every module the lesson text comes before the visual. On desktop the visual starts at about 600 px; on a phone it starts **1,120–1,490 px down** (1.3–1.8 screens of scrolling). | The site's pitch is "watch it happen", but the first screen is a textbook. Many learners never scroll to the picture. | A new module layout: the lesson as a side column (desktop) or a collapsible card (phone) beside the visual, so the picture is on the first screen. The lesson text is split into one short paragraph per phase and follows the timeline. (W1.2) |
| P3 | **Jargon arrives undefined.** UTF-8, code point, σ0/σ1, Σ, Ch, Maj, φ(n), "mod", GCD, IV, nonce, OKLab appear with no inline definition. | Each undefined term is a place to quit. | A `<Term>` component: a dotted underline with a short popover definition plus "learn more in module N". A shared glossary file and a `/glossary` page. (W1.2, W3.1) |
| P4 | **The same sentence three times.** The step caption above the visual, the "This step" inspector card, and the slider's `aria-valuetext` all repeat the step headline. | Wasted space, and the eye has nowhere new to go. | The caption keeps the headline. The inspector keeps only the *why* and the source, under a "Why?" heading. (W1.2) |
| P5 | **The disclaimer three times per page.** A banner on every module, a line on the home page, and the footer. | Noise that trains people to ignore it, which works against aim 4. | Keep it once in context: a compact one-line chip in the module header that expands, plus the footer. The full text stays on `/about`. (W1.2) |
| P6 | **Keyboard shortcuts are invisible.** Space, ←/→, Shift+←/→, Home/End, 1–5 and `.` all work, but they only appear in `title` tooltips. | Keyboard users and power users never find them, and there is no help on touch either. | A `?` button in the timeline that opens a shortcut sheet, plus a one-time hint "Tip: press → to step". (W1.2) |
| P7 | **No sense of how long a chapter is.** "Step 3 of 116" in SHA-256 is daunting, and there is no "skip the boring bits" except one "Skip to digest" button. | Learners give up in the message schedule. | Phase chips on the timeline track with names ("Padding · Schedule · Rounds · Digest"), "Skip this phase" on every phase, and a time-to-finish hint at the current speed. (W1.2) |
| P8 | **Free play hides the lesson.** Switching to Free play replaces the lesson prose with a form, so the learner loses the explanation for what they are now changing. | Experimenting without the explanation is guessing. | Free play keeps the lesson column (collapsed by default) and puts the inputs above the visual in a compact, labelled "Your input" card. (W1.2) |
| P9 | **The URL is rewritten at once to a 200-character `?s=…`** on first load, even when nothing has changed. | It looks like an error and makes the link a learner copies very long. Sharing should be a deliberate act. | Keep the clean URL while the state equals the defaults. Add a "Copy link to this step" button that writes and copies `?s=`. Reading `?s=` is unchanged. (W1.2) |
| P10 | **The theme toggle is a bare monitor icon.** | It isn't clear what it does or what state it is in. | A three-way segmented control (Light · System · Dark) in a menu, with its label visible. (W1.2) |
| P11 | **Nothing celebrates finishing.** Completing a module shows one bordered sentence. | No feedback loop, no reason to go on. | A completion card: what you learned (3 bullets), a "next module" card, and a progress ring on the home path. (W2.x, W3.1) |

### 2.2 Per module

**1. Bits, bytes and XOR**

- The first chapter's visual is one big letter box, one binary string and one byte. It's
  fine but small and static; the "Encoded so far" row is the interesting part and it is
  tiny.
- The "bits of this byte that the key flipped" strip uses 16 px squares and is hard to
  read.
- The two-time pad chapter is the most exciting idea in the module (a crib dragged along
  to reveal text), but nothing invites the learner to drag; the crib is a text field in
  Free play.
- Fix: a larger "tape" of bytes with the character above each byte; bit columns that flip
  visibly; a draggable crib slider in the walkthrough. (W2.1)

**2. Hashing and MACs**

- A beginner arrives at step 3 of 116 looking at `W16 = σ1(W14) + W9 + σ0(W1) + W0`, with
  no picture of what a "word" or "block" is.
- The round view is good (a–h before/after, the new a and e hatched), but the "the rest
  shift down" movement, which is the key idea, is only told in words, not shown.
- `Σ` renders in a fallback font at a different size and baseline from the mono numbers.
- In the avalanche chapter the two 64-character digests aren't compared character by
  character, so "they look unrelated" has to be taken on trust.
- The phase list has 20+ entries in a small scroll box, and the current phase is easily
  cut off.
- Fix: a "zoomed out" overview of the pipeline (message → padded block → 64 words →
  64 rounds → digest) that stays visible as a mini-map; the a–h shift animated; the
  digest diff highlighted; phases grouped ("Rounds 1–64" as one chip with a scrubber).
  (W2.2)

**3. Passwords and salts**

- The unsalted table is the clearest page on the site. The attacker's lookup column fills
  in with dashes and labels, but nothing makes a match feel like a match.
- PBKDF2 shows 600,000 iterations as a number only; the cost isn't felt.
- The "Try your own password" warning is good but small, and it sits above a select whose
  options are in a mono font with curly quotes.
- Fix: a "lookup" animation (the hash slides to the attacker's table and the row lights
  up); an iteration counter that actually spins, with a live time per guess from the
  worker; a slider for iterations with a "time to crack" bar that grows. (W2.3)

**4. AES**

- ShiftRows is shown as before/after grids with arrows. It's the most natural thing on the
  site to animate and it doesn't move.
- The visual uses the left 60% of the panel and leaves a large empty area below it on
  desktop.
- On a phone the three penguins (original, ECB, CBC) stack vertically and can't be
  compared, and the placeholders just say "Next step".
- Fix: animate SubBytes (each cell looks up the S-box, which highlights the row and
  column), ShiftRows (rows slide and wrap), MixColumns (one column glows and combines),
  AddRoundKey (the key grid drops onto the state). The penguins go side by side at every
  width (three small images in one row on a phone, tap to enlarge). (W2.4)

**5. RSA**

- **Bug:** the extended-Euclid table in the walkthrough renders without cell padding, so
  columns run together ("31201 0" is r = 3120, s = 1, t = 0). See B1.
- The current value (for example "P (6 bits): 61") is drawn as a wide box with a blue
  outline and looks exactly like a focused text input. Learners try to type in it.
- "Formulas so far" is a good idea, but the empty rows show "?" and look unfinished
  rather than intentional.
- Fix: style the table; make the value panel a "card" that can't be mistaken for an input;
  show the unknowns as dashed placeholders that fill in with a count-up; draw
  square-and-multiply as a ladder of bits. (W0.1, W2.5)

**6. Diffie-Hellman**

- The paint scene is the best metaphor on the site, but the pots are 32 px swatches in
  lists. Mixing paint is not animated, and nothing travels across the public channel.
- Fix: three columns (Alice · public · Bob) with real paint pots; colours pour and blend;
  mixtures travel across the channel; Eve's lane fades in when she listens. The numeric
  chapters use the same layout with numbers in place of pots, and the clock
  (`ModClock`) turns. (W2.6)

### 2.3 About, 404 and other pages

- `/about` is a long single column of prose and lists. It's honest and complete, but
  hard to scan. Fix: a sectioned page with a sticky table of contents, a "What's real /
  What's simplified / What's only described" three-column summary, and a test-vectors
  section that shows the test counts. (W3.2)
- 404 is plain. Fix: a 404 with a small XOR joke ("this page ⊕ this page = 0") and links
  to the learning path. (W3.2)

---

## 3. Bugs and functional problems

| # | Severity | Where | Problem | Fix |
|---|---|---|---|---|
| B0 | Critical | Deploy | The production URL was a 404 (§1). | **Fixed.** |
| B1 | High | `/rsa` walkthrough, `globals.css` | `.prose-cv` has no table styles, so GFM tables in MDX render with 0 px cell padding and the columns run together. Only `rsa/walkthrough.mdx` has a table today, but any future table breaks the same way. | Add `.prose-cv table/th/td` styles (padding, borders, right-aligned numeric columns with tabular figures), wrapped in a horizontal scroller on small screens. (W0.1) |
| B2 | High | Build | **Fixed to 170 KB.** Was: `/rsa` 177.6, `/aes` 176.8, `/passwords` 174.9 KB. Now: `/rsa` 169.6, `/aes` 167.7, `/passwords` 167.3, `/hashing` 167.2, `/dh` 165.3, `/xor` 164.3 KB, from deferring every non-first chapter's run and views (`useDeferredImport`) and giving each page only its own citations (`ModuleLayout`'s `citations` prop). Still open: 165 KB headroom for the motion work. | See CLAUDE.md for the pattern. Walkthrough views must **not** go behind `next/dynamic`: a view that suspends mid-walkthrough swallows an arrow-key press (it broke `e2e/dh.spec.ts`). (W0.2) |
| B3 | Medium | `PlaybackControls` | Next and ⏭ stay enabled at the last step, and Back and ⏮ at the first. A press does nothing and gives no feedback. | Set `aria-disabled` and dim them at the ends (keep them focusable so keyboard focus isn't lost). (W0.1) |
| B4 | Medium | `rsa/components/*` value panel | The value display looks like a focused `<input>` (wide box, accent outline). | Restyle it as a read-only value card (W2.5). |
| B5 | Medium | `hashing` round view | `Σ0`, `Σ1` render in a fallback font with a different size and baseline from the mono digits. | Use a mono font that has Σ and σ (JetBrains Mono does), or wrap the symbols in a span with the sans font at a matched size. (W1.1) |
| B6 | Medium | Mobile header | The nav wraps to six lines: the header is **165 px** tall on a 390 px phone. | Collapse the nav into a menu sheet below `md`. (W1.2) |
| B7 | Medium | Mobile, all modules | 19–23 interactive elements per module page are smaller than 32 px (chapter chips, hex/binary toggle, inspector links, phase rows). The token `--target` (44 px) exists but isn't used for these. | Apply `min-h-target` to every control below `md`. (W1.2) |
| B8 | Medium | Mobile, all modules | The sticky timeline takes **101 px** (12% of the screen) in two rows. | A compact one-row bar on phones (◀ ▶ ▶▶ + scrubber), with speed and the rest in a "⋯" sheet. (W1.2) |
| B9 | Low | `ModuleLayout` header | The mode switch is right-aligned when the intro is one line and drops under it on the left when the intro wraps (hashing, passwords, RSA), so it moves between modules. | A fixed slot for it in the new header. (W1.2) |
| B10 | Low | `PhaseStepper` | A fixed-height scroll box with tiny arrow buttons; the current phase can be scrolled out of view and the next row is cut in half. | Scroll the current phase into view on change; group long runs; let it grow on desktop. (W1.2) |
| B11 | Low | Share state | `?s=` is written on first load even at defaults (P9). | §2.1 P9. (W1.2) |
| B12 | Low | AES penguin chapter | The "Next step" placeholder boxes look like errors. | Draw a hatched "locked until step N" placeholder. (W2.4) |

Checked and fine: no horizontal overflow on any route at 390 px; the CSP blocks framing;
dark mode has good contrast; the colour-blind diff palette (hatched plus filled/hollow)
works without colour.

---

## 4. Inventory: every page, section and component

What each piece is for, and the UI it should have. "Keep" means the structure is right
and only the theme applies.

### 4.1 Pages

| Route | Sections now | Recommended UI |
|---|---|---|
| `/` | Title, tagline, disclaimer, a grid of 7 cards | **Hero**: the tagline, plus a small live demo (a 4×4 AES state cycling through one round, or "Hi" turning into bytes and XOR'd), one primary "Start learning" button, and "Pick a topic" as a secondary link. **Learning path**: the 6 modules as a connected route (a vertical timeline on phones, a 2-row path on desktop), each with an icon, a time estimate, "builds on" and a progress ring. TLS 1.3 shown greyed as "coming next". **How we know it's right**: 3 stat tiles (test vectors, differential runs, coverage) linking to `/about`. **Honest footer note.** |
| `/xor`, `/hashing`, `/passwords`, `/aes`, `/rsa`, `/dh` | Header, mode switch, disclaimer banner, chapter chips, hex/bin toggle, lesson prose, caption, visual, inspector + phase list, sticky timeline | **Module workspace** (§4.3): a compact header (module number, title, chapter tabs, mode, ⋯ menu with hex/bin, share link, disclaimer); a **stage** (the visual, as large as it can be) with the caption above it; a **lesson rail** on the right (desktop) or a bottom sheet (phone) holding the phase's paragraph, the "Why?" text, the source and the phase list; the timeline as a compact dock. |
| `/about` | Prose | A sectioned page with a sticky table of contents, the real/simplified/described table, and test-vector cards. |
| `/learn` (missing) | — | The learning path at full size: modules → chapters, ticks, "resume where you left off". |
| `/glossary` (new) | — | An A–Z list of terms with anchors; `<Term>` popovers link here. |
| `/demo` | Test bed | Keep (noindex, not linked). Restyle only through tokens. |
| 404 | Plain | A friendly 404 with links to the path. |

### 4.2 Shared components (`src/components`)

| Component | Role | Recommended UI and motion |
|---|---|---|
| `SiteHeader` | Brand, module nav, About, theme | Brand mark (padlock glyph built from a 3×3 byte grid) plus wordmark; a "Modules" dropdown with numbered items and progress ticks; About; a theme menu. Below `md`: a menu sheet. Motion: the sheet slides up and fades (160 ms); the active module's underline moves between items. |
| `SiteFooter` | Disclaimer, links | Keep; one line, plus a Glossary link. |
| `ThemeToggle` | Theme | Light · System · Dark segmented control in the menu. The theme switch crossfades with the View Transitions API (skipped under reduced motion). |
| `DisclaimerBanner` | Aim 4 | Becomes a header chip, "For learning only ⓘ", that expands inline into the full sentence plus a link. Shown open on a learner's first visit, closed after. |
| `ModuleLayout` / `ModeSwitch` | Layout | The new stage / lesson-rail / dock layout (§4.3). The mode switch is a segmented control in a fixed slot; the active pill slides. |
| `ChapterTabs` (`lesson/Chapters`) | Chapters | Numbered tabs with ticks; the active indicator slides; a tick draws itself on completion. Horizontal scroll with fade edges on phones. |
| `StepCaption` | Step headline | Larger (text-xl), with "Step 3 of 8 · Phase" as an eyebrow. The headline crossfades and slides up 4 px on each step. Numbers in it use tabular figures. |
| `StepInspector` | Why + source | Becomes the "Why?" card in the lesson rail; no repeated headline. The source shows as a citation chip with the spec name and section. |
| `CitationLink` | Source | A chip: `FIPS 197 §5.1.2 ↗`. |
| `PhaseStepper` | Phases | A vertical list in the rail on desktop; on the timeline track as labelled segments on every width. The current phase auto-scrolls into view; done phases get a tick. |
| `TimelineBar` / `PlaybackControls` / `Timeline` | Playback | A dock: ⏮ ◀ ▶/⏸ ▶ ⏭ · a scrubber with phase segments and labels on hover · speed · `?` shortcuts. Disabled at the ends (B3). The play button morphs between ▶ and ⏸. The scrubber thumb glides between steps during playback. |
| `ByteGrid` | Bytes | Keep the structure. A cell that changes flips (a 3D-free "card flip": scaleY 1→0→1, 180 ms) and leaves the hatched mark; the cell under the cursor highlights the same byte in the other rows. |
| `BitDiffStrip` | Bit diffs | Bigger squares (12 px min, 16 on desktop) with a 2 px gap. Flipped bits fill in a quick left-to-right wave (8 ms stagger) when the step arrives. |
| `HexBinToggle` | Format | Moves into the module ⋯ menu, with a keyboard shortcut (`H`). Values morph digit by digit when switched. |
| `ModClock` | Modular arithmetic | Keep. The hand sweeps the short way round the clock to the new value (a spring tween on rotation). A wrap past p shows a faint lap trail. |
| `NumberTrace` | Running values | Values count up/down to the new number (only for numbers under 10⁶; larger ones crossfade). |
| `state/*` | Share, progress | Add `useReducedMotion()` and `useStepDirection()` (forward / back / seek) for the motion system (§6). |

### 4.3 The module workspace (new layout)

```
┌ Header ───────────────────────────────────────────────────────────────┐
│ 04  AES        [1 Block ✓][2 Key schedule][3 Modes][4 Penguin]  Walkthrough|Free  ⋯ │
├ Stage ───────────────────────────────────────┬ Lesson rail ───────────┤
│ Step 4 of 42 · Round 1                       │ ShiftRows              │
│ ShiftRows: row r moves r places left.        │ Row 0 stays, row 1 …   │
│                                              │ ── Why? ──             │
│         [ the visual, centred, large ]       │ Each column now holds… │
│                                              │ FIPS 197 §5.1.2 ↗      │
│                                              │ ── Phases ──           │
│                                              │ ✓ Input  ✓ Round 0  ● Round 1 … │
├ Dock ────────────────────────────────────────┴────────────────────────┤
│ ⏮ ◀ ▶ ▶ ⏭   ━━━━●━━━━━━━━━━━━━━━━━━━━━━  Round 1 · 4/42   1x  ?  🔗 │
└───────────────────────────────────────────────────────────────────────┘
```

On a phone: the header is 2 rows (title + ⋯; chapter tabs scrolling), the stage fills the
width, the lesson rail becomes a bottom sheet with a peek of the first line ("ShiftRows:
row r moves… ⌃"), and the dock is one row.

Module-specific views (`src/modules/*/components/*`) are listed with their animations in
§7.

---

## 5. Theme: "Lab notebook"

**Why this theme.** The site's promise is *the actual maths, checked*. A learner should
feel they are watching a careful worked example on paper, not a marketing page or a
hacker movie. So the theme borrows from an engineering notebook: squared paper, ink, a
highlighter, margin notes and citations. It is calm enough to read for an hour, and its
one strong visual idea (the grid) is also the structure of the data: bytes, blocks and
4×4 states all sit on it. A dark "night lab" variant keeps the same idea with chalkboard
values.

### 5.1 Colour

Keep the token names in `src/styles/tokens.css` and change the values, so no component
code has to change for the base theme. New tokens are marked **new**.

| Token | Light (paper) | Dark (night lab) | Use |
|---|---|---|---|
| `--bg` | `#f7f5ef` warm paper | `#0e1116` | page |
| `--grid` **new** | `#e8e4d8` | `#1a1f27` | the squared-paper lines on the stage |
| `--surface` | `#fffdf8` | `#151a21` | cards |
| `--surface-overlay` | `#efece3` | `#1d232c` | chips, code |
| `--fg` | `#1b1d22` ink | `#e9ecf1` | text |
| `--fg-secondary` | `#3d424c` | `#c3c8d1` | |
| `--fg-muted` | `#5d6370` | `#98a0ad` | (check 4.5:1 on `--bg`) |
| `--accent` | `#2346a8` fountain-pen blue | `#8fb0ff` | links, primary actions |
| `--highlight` | `#fff0a8` highlighter | `#3d3412` | the current cell or row |
| `--ok` / `--warn` / `--danger` | unchanged | unchanged | |
| `--diff-on` / `--diff-off` | **unchanged** | **unchanged** | the colour-blind-safe pair |
| `--secret` **new** | `#7a3fb0` violet | `#c49bff` | private values (keys, a, b, d) with a 🔒 glyph |
| `--public` **new** | `#2f6f5e` teal | `#6fd2b8` | values on the public channel |

**Module tints** (**new**, used only in chrome: the module number, the header rule and
the path node, never on data, so they can't clash with the diff colours or with
secret/public): XOR `#0f766e`, Hashing `#6d28d9`, Passwords `#b45309`, AES `#1d4ed8`,
RSA `#be123c`, DH `#15803d`, TLS `#475569`.

Rules:

- Secret vs public is always shown with a glyph and a label as well as colour (🔒 / 📡),
  like the diff pair.
- Every new pair of colours is checked for 4.5:1 text contrast and against the
  colour-blind screenshots in `e2e/colour-blind.spec.ts`.

### 5.2 Type

All fonts self-hosted with `next/font` (no new CSP origins, no JS cost).

- **Display (h1, h2, the module number):** *Fraunces* (variable, opsz), at a soft weight:
  a notebook heading, not a tech brand.
- **Body and UI:** keep *Geist Sans*.
- **Numbers, bytes, code:** *JetBrains Mono* replaces Geist Mono. It has Σ, σ, φ, ⊕, ≡ and
  the arrows the modules use (fixes B5), and its zero is slashed so 0/O never confuse in
  hex. `font-variant-numeric: tabular-nums` everywhere numbers line up.
- Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48. The caption headline at 22.

### 5.3 Surfaces and details

- The stage has a faint squared-paper background (`--grid`, 24 px cells, a CSS gradient,
  no image). Cards sit on it like paper notes, with a 1 px border and no heavy shadows.
- Radius 10 px for cards, 6 px for byte cells, full for chips.
- The highlighter is a slightly rotated (−1°) marker swipe behind the current cell or row
  (a pseudo-element), so "current" reads as a hand mark rather than another border.
- Citations look like margin notes: small, with the spec section in mono.
- Icons: keep `lucide-react`, 1.75 stroke.

---

## 6. Motion system

**Principle: every animation shows an operation.** If a byte moves in the maths, it moves
on screen; if a value is replaced, it is replaced visibly; nothing bounces for fun.
Motion is the explanation of the step, so a learner who steps forward should see what
changed and where it came from.

### 6.1 Rules

1. **Step-driven, not time-driven.** Animations run when the step index changes. They are
   pure functions of (previous event, next event, direction), so determinism (aim 3) holds:
   the same step always lands in the same final frame.
2. **Direction aware.** Forward plays the operation, back plays it in reverse, and a seek
   of more than one step (scrubber, Home/End, a share link) jumps to the end frame with a
   120 ms crossfade and no choreography.
3. **Shorter than a step.** At 1x, playback gives each step `STEP_MS` of virtual time.
   Each animation lasts at most 70% of the current step's real duration, so it finishes
   before the next one starts. At 4x most collapse to a crossfade.
4. **Reduced motion means instant.** `prefers-reduced-motion: reduce` (already handled
   globally in `globals.css`) stays authoritative. JS-driven animation checks
   `useReducedMotion()` and skips to the end state. Nothing communicates *only* through
   motion: the hatched/highlighted end state always carries the meaning.
5. **CSS first, tiny JS.** CSS transitions and keyframes, the View Transitions API for
   theme and chapter changes, and one small FLIP helper (`src/components/motion/flip.ts`,
   under 1 KB) for moving cells. The `motion` package is installed but must not land in
   any module route's first-load JS: import it only through a deferred import, if at all.
   Every wave measures with `npm run perf:bundles`.
6. **Accessible.** Motion never moves focus. Live regions announce the step result once,
   not every frame.

### 6.2 Tokens (new, `src/styles/tokens.css`)

```css
--dur-instant: 80ms;   /* hover, press */
--dur-quick: 160ms;    /* crossfades, chips, menus */
--dur-step: 320ms;     /* the default operation animation at 1x */
--dur-long: 600ms;     /* multi-part choreography (ShiftRows, paint pour) */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--stagger: 18ms;       /* per item in a sequence (bits, bytes, rows) */
```

`--dur-step` and `--dur-long` are scaled by the playback speed (a CSS variable set on the
stage: `--speed`).

### 6.3 Primitives (`src/components/motion/`, new)

| Primitive | What it does | Used by |
|---|---|---|
| `useStepTransition()` | Returns `{ direction, isSeek, from, to }` for the current step change | every view |
| `<Flip>` / `flip.ts` | Moves elements from their old box to their new box (FLIP) by key | ShiftRows, a–h shift, sorting rows |
| `<Morph value>` | Digit-by-digit change for hex and decimal; count up for small numbers | `NumberTrace`, captions, value cards |
| `<Reveal>` | Fade + 4 px rise, staggered children | captions, rows that appear |
| `<Pulse>` | A one-shot highlighter swipe on what just changed | `ByteGrid`, tables |
| `<Travel from to>` | A token (byte, number, pot) flies along a path from one element to another | DH channel, XOR, passwords lookup |
| `<Wave>` | Staggered fill across a row of cells | `BitDiffStrip`, avalanche |

Each primitive has a unit test that checks it renders the final state at once under
reduced motion and on a seek.

---

## 7. Animations per module and component

Only what explains the step. Times are at 1x.

### 7.1 Site and shell

| Where | Animation |
|---|---|
| Home hero | A looping 6-second demo: "Hi" → bytes `48 69` → ⊕ key → `02 5d` → ⊕ key → `48 69` → "Hi". Paused and shown as a static diagram under reduced motion; pauses when off screen. |
| Learning path | Nodes draw their connector line on scroll into view (CSS `animation-timeline: view()` where supported, else static). Completed nodes show a filled ring. |
| Module cards | Hover: lift 2 px and a tint border. The module glyph animates once (the XOR glyph flips a bit, the AES grid shifts a row, the DH glyph mixes two dots). |
| Chapter tabs | The active indicator slides; the tick draws itself (stroke-dashoffset). |
| Mode switch | The active pill slides. Switching to Free play: the inputs card expands with a height transition. |
| Theme change | A View Transition crossfade (circular reveal from the toggle). |
| Step caption | Old headline out (fade, −4 px), new one in (fade, +4 px). Direction flips the offset when going back. |
| Dock | The play/pause icon morphs; the scrubber glides; the phase label changes with `<Morph>`. |
| Completion | A short confetti made of hex digits (12 particles, 800 ms), then the "next module" card. |

### 7.2 Modules

**1. Bits, bytes and XOR**
- *Text to bytes:* the character lifts out of the text and splits into its UTF-8 bytes,
  which drop into the "encoded so far" tape. The 🔐 example visibly splits into four.
- *XOR:* the message, key and result rows stack; for the current byte, the eight bit
  columns flip one after another (`<Wave>`, `--stagger`), and the flipped bits flash
  `--diff-on`. Then the result byte drops into the masked row.
- *Unmask:* the same key slides down onto the masked row and the flips reverse.
- *Two-time pad:* the crib is a draggable chip along `c1 ⊕ c2`; under it the revealed
  letters update live, and readable English gets the highlighter.

**2. Hashing and MACs**
- *Padding:* the message bytes slide into a 64-byte block; the `0x80` byte drops in, the
  zeros fill, and the length field types itself into the last 8 bytes.
- *Schedule:* the four inputs (W[t−2], W[t−7], W[t−15], W[t−16]) highlight in the 64-word
  column and arrows converge into the new word, which drops into place.
- *Rounds:* the a–h registers shift right one place with `<Flip>`; the new a and e grow in
  from T1/T2. The mini-map's round counter ticks.
- *Digest:* the eight registers are added back into H0–H7 and then slide together into
  the 64-hex digest.
- *Avalanche:* the flipped input bit pulses, then the 256 output bits fill with a `<Wave>`
  and the differing hex characters of the two digests highlight together.
- *HMAC:* the key ⊕ ipad and ⊕ opad blocks are shown as two lanes; the inner hash travels
  into the outer hash.

**3. Passwords and salts**
- *Unsalted:* each user's hash slides across to the attacker's table; a match lights the
  row and stamps "cracked"; a miss shakes once (4 px, 2 cycles).
- *Salts:* the salt chip drops onto the password before hashing; identical passwords now
  produce different hashes, which crossfade apart.
- *PBKDF2:* an iteration odometer spins (`<Morph>` at a throttled rate; the real count
  comes from the worker); U₁ ⊕ U₂ ⊕ … accumulates in a ByteGrid that pulses on each fold.
- *Guessing cost:* a horizontal "time to crack" bar grows on a log scale as the sliders
  change, with the time label morphing (seconds → years).

**4. AES**
- *SubBytes:* each state cell looks up the S-box: the matching S-box row and column
  highlight, and the new value flips into the cell (staggered by cell).
- *ShiftRows:* row r slides left r places with `<Flip>`; cells leaving the left edge wrap
  round to the right with a short fade.
- *MixColumns:* one column at a time glows, the 4×4 matrix appears beside it, and the
  column's new values morph in.
- *AddRoundKey:* the round key grid drops onto the state and the changed cells pulse.
- *Key schedule:* the RotWord rotation (`<Flip>`), SubWord (flip), Rcon ⊕ (pulse).
- *Modes:* blocks chain visibly: in CBC the previous ciphertext travels down into the
  next XOR; in CTR the counter ticks.
- *Penguin:* the image encrypts block by block in a quick raster sweep; ECB leaves the
  outline visible, CBC turns to noise. All three side by side at every width.

**5. RSA**
- *Primes:* trial divisors tick past (2, 3, 5, 7) with a ✗; at √p the "prime" stamp lands.
- *n and φ(n):* the formula fills its "?" placeholders by count-up.
- *Extended Euclid:* each row of the table writes itself in, and the row-two-above and
  row-above highlight to show where it came from.
- *Square and multiply:* the bits of e form a ladder; each rung lights, then the running
  value morphs (square, then multiply on 1-bits), with `ModClock` turning.
- *Sign and verify:* the message hash travels to the private key and the signature comes
  back; verification lights green.
- *Malleability:* multiplying the ciphertext morphs the decrypted value in step.

**6. Diffie-Hellman**
- *Paint:* pots pour into a mixing bowl and blend (a CSS gradient tween in OKLab, with the
  colour computed by core); mixtures travel across the public channel with `<Travel>`;
  the final two pots turn to face each other and a "same colour" check draws.
- *Exchange:* the same choreography with numbers: g^a mod p is worked on the `ModClock`,
  A travels to Bob, and the shared secret appears in both lanes at the same moment.
- *Eve listens:* Eve's lane slides in; her guesses fill a table row by row; the growth
  table animates its bar lengths.
- *Man in the middle:* the channel splits in two around Mallory, and each side's secret
  appears with a different colour.

---

## 8. Not in scope

- New algorithms or changes to `src/core` (the maths and its tests are frozen for this
  plan).
- Sound, 3D or canvas/WebGL effects (budget and accessibility).
- Accounts, a database or server-side progress (the project has no database).
- Changing the share-state schema version. The new "copy link" button reuses the
  existing `?s=` format.

---

## 9. Waves and prompts

**Git workflow: commit and push straight to `main`.** No branch and no PR unless one is
needed. The serial waves (0, 1, 3, 4) work on `main` directly: run the checks, commit,
`git push origin main`. Only wave 2 needs branches, because its six agents run in
parallel: each gets a git worktree and a branch (`git worktree add ../cv-<name> -b
ui/<name>`, per `CLAUDE.md`), and at the end of the wave the branches are merged into
`main` locally, one at a time, with `npm run verify` after each merge and
`npm run test:e2e` after the last, then pushed. Every push to `main` is a production
deploy on Vercel, so never push a red build.

**This plan changes shared contracts on purpose**, so waves 0, 1 and 3 are **serial**,
single agents: they own `src/components/**`, `src/styles/**`, `src/app/globals.css`,
`src/app/layout.tsx` and `src/app/page.tsx`. Wave 2 is parallel, one agent per module, and
the module agents only touch `src/modules/<name>/**` and their walkthrough copy. If a
wave 2 agent needs a shared change, it **stops and reports** (as in `CLAUDE.md`) and the
change goes in a wave 1 follow-up.

| Wave | Prompts | Runs | Depends on |
|---|---|---|---|
| W0 — fix | U0.1 bugs, U0.2 bundle budget | serial | — |
| W1 — foundation | U1.1 theme + type + motion primitives, U1.2 shell + workspace layout, U1.3 home page | serial | W0 |
| W2 — modules | U2.1 XOR, U2.2 Hashing, U2.3 Passwords, U2.4 AES, U2.5 RSA, U2.6 DH | **parallel (6)** | W1 |
| W3 — site | U3.1 learning path + glossary, U3.2 about + 404 | serial | W2 |
| W4 — QA + release | U4.1 QA pass, U4.2 deploy | serial | W3 |

Acceptance for every prompt: `npm run verify` passes, including `perf:bundles` (no route
over 170 KB); `npm run test:e2e` passes (axe in both themes, keyboard, reduced motion);
no test or budget is weakened to pass.

### Prompt U0.1 — bugs (wave W0)

```
Read CLAUDE.md and docs/UIUX.md §3. Fix only B1 and B3 (the rest belong to later
prompts):

- B1: add table styles to .prose-cv in src/app/globals.css (cell padding, borders,
  tabular-nums, right-aligned numeric cells, a horizontal scroller below 640px). Check
  the extended-Euclid table in src/modules/rsa/walkthrough.mdx reads correctly.
- B3: in src/components/timeline/PlaybackControls.tsx, mark Back/start as aria-disabled
  at step 0 and Next/end at the last step, dimmed but still focusable. Update the
  timeline tests.

Add a regression test for each (a computed-style check for B1 in a ui test, button
state for B3). Done when npm run verify passes except perf:bundles, which U0.2 fixes.
Commit to main and push.
```

### Prompt U0.2 — bundle budget (wave W0)

```
Read CLAUDE.md (the LazyShareState and perf/bundles.mjs rules) and docs/UIUX.md §3 B2.
Every module route is within the 170 KB first-load budget (/rsa 169.6, /aes 167.7,
/passwords 167.3, /hashing 167.2 KB). Bring each under 165 KB to leave room for the
motion work, without changing behaviour.

Use the pattern every module already uses (CLAUDE.md): the first chapter's run and
view stay in first-load JS; later chapters' runs and views load through
useDeferredImport (render them from the loaded module, never through next/dynamic,
which can swallow an arrow-key press); only the Free-play inputs use next/dynamic. Check nothing imports
runtime values from src/core/<algo>/state.ts. Update the module tests to wait for the
deferred code the way src/modules/dh/DhModule.test.tsx does (renderLoaded + findBy).

Report the before/after table from `npm run perf:bundles`. Do not raise the budget.
Done when npm run verify and npm run test:e2e pass. Commit to main and push.
```

### Prompt U1.1 — theme, type and motion primitives (wave W1)

```
Read CLAUDE.md, docs/UIUX.md §5 and §6, and src/styles/tokens.css. Load the
frontend-design skill for the visual direction.

1. Theme "Lab notebook": change the token values in src/styles/tokens.css for light and
   dark (both the media-query block and [data-theme='dark']), add --grid, --secret,
   --public, the module tints and the motion tokens from §6.2, and map the new ones in
   src/app/globals.css @theme. Keep --diff-on/--diff-off unchanged. Check every text
   pair is at least 4.5:1 and record the ratios in a comment.
2. Type: add Fraunces (display) and JetBrains Mono (replacing Geist Mono) with next/font
   in src/app/layout.tsx; tabular-nums utility; the type scale. This fixes B5: check Σ, σ,
   φ, ⊕ and ≡ render in the mono font in the hashing round view.
3. Motion primitives in src/components/motion/: useStepTransition, useReducedMotion,
   flip.ts + <Flip>, <Morph>, <Reveal>, <Pulse>, <Travel>, <Wave>, as specified in §6.3
   and following the §6.1 rules. CSS transitions and keyframes only; no `motion`
   import in anything a module route loads first. Each primitive gets tests: final state
   at once under reduced motion and on a seek of more than one step.
4. Add the primitives to /demo so they can be seen in isolation, and extend
   e2e/demo.spec.ts.

src/components may not import src/modules. Done when npm run verify (with
perf:bundles) and npm run test:e2e pass, and the colour-blind screenshots still read.
Commit to main and push. Report before/after screenshots of / and /aes in light and dark.
```

### Prompt U1.2 — shell and module workspace (wave W1)

```
Read CLAUDE.md, docs/UIUX.md §2.1, §3 (B6-B11) and §4.2-§4.3. U1.1 must be merged.

Rebuild the shared shell and layout in src/components only:
- SiteHeader: brand mark, a Modules menu with progress ticks, About, a theme menu
  (Light/System/Dark, labelled). Below md, a menu sheet. Header at most 56px on a phone.
- DisclaimerBanner -> a header chip that expands; open on first visit (store only a
  boolean "seen" flag in localStorage, inside try/catch), closed after. Aim 4: the full
  text must still be reachable on every module page and /about.
- ModuleLayout: the stage / lesson rail / dock layout from §4.3. The lesson is a rail
  on lg and a bottom sheet with a one-line peek below lg. The visual is on the first
  screen at 1366x768 and at 390x844. The mode switch has a fixed slot (B9). Free play
  keeps the lesson available (P8).
- StepInspector: drop the repeated headline (P4); "Why?" + citation chip.
- PhaseStepper: auto-scroll the current phase into view, group long runs, ticks (B10).
- Timeline dock: one row on phones (B8); phase segments with labels on the track;
  "Skip this phase"; a `?` shortcut sheet listing the keymap (P6); a "Copy link to this
  step" button, with ?s= written only when state differs from the defaults (P9, B11).
  Reading ?s= is unchanged; never put typed passwords in the URL (findSecretKeys).
- A <Term> component plus src/components/lesson/glossary.ts (the terms in §2.1 P3), for
  modules to use in wave 2.
- Every control at least --target (44px) tall below md (B7).
- Wire the motion primitives into the shared pieces per §7.1 (caption, chapter tabs,
  mode switch, dock).

Keep every module rendering correctly with its current props; if a prop has to change,
update all six module call sites in the same commit and nothing else in the modules. Update
the component tests and e2e. Done when npm run verify and npm run test:e2e pass and
the §3 B6-B11 checks are met (add e2e assertions for header height, timeline height,
visual-on-first-screen at both viewports and 44px targets). Commit to main and push.
```

### Prompt U1.3 — home page (wave W1)

```
Read docs/UIUX.md §2.1 P1, §4.1 (/) and §7.1. U1.2 must be merged.

Rebuild src/app/page.tsx: the hero with the looping XOR demo (static diagram under
reduced motion, paused off screen), one "Start learning" button to /xor, the learning
path from src/modules/registry.ts with time estimates, "builds on" and progress rings
from useProgress, TLS 1.3 greyed as "coming next", and three stat tiles that link to
/about. Add `minutes` and `buildsOn` to the registry entries only if needed (it is
metadata, not module code). The home page is a server component except for the parts
that need progress. Done when verify, e2e (axe both themes) pass and / stays under its
current first-load JS. Commit to main and push, and report screenshots at 1366 and 390
wide.
```

### Prompts U2.1–U2.6 — modules (wave W2, run all six in parallel)

Each runs in its own worktree. The shared header for each prompt:

```
Read CLAUDE.md (parallel-agent rules), docs/UIUX.md §2.2 for your module, §5, §6 and
§7.2 for your module. Wave 1 is merged. Work only in src/modules/<name>/** (views,
walkthrough.mdx copy, module tests) and, if your page file needs it,
src/app/(modules)/<route>/page.tsx. Use the shared primitives from
src/components/motion and <Term> from src/components/lesson. Do not edit
src/components, src/core or another module; if you need a shared change, stop and
report it. Computing values for display is core's job: views animate between values
core already produced.

Split the walkthrough prose into one short paragraph per phase so it follows the
timeline in the lesson rail, and wrap first uses of jargon in <Term>.

Done when npm run verify (with perf:bundles; your route under 170 KB) and
npm run test:e2e pass, the module's ui tests cover the new states, and reduced motion
shows every end state at once. Commit on your ui/<name> branch (don't push it or open a
PR; it is merged into main at the end of the wave), and report screenshots at 1366x768
and 390x844 of three representative steps.
```

Then, per module:

```
U2.1 (<name> = xor, route /xor): §2.2 module 1 and §7.2 module 1. The byte tape, the
bit-column wave, unmasking in reverse, and the draggable crib in the two-time pad
walkthrough (keyboard: arrow keys move the crib).
```

```
U2.2 (<name> = hashing, route /hashing): §2.2 module 2 and §7.2 module 2. The pipeline
mini-map, padding, schedule arrows, the a-h <Flip> shift, the digest diff in the
avalanche chapter, the HMAC two lanes, and the grouped phases ("Rounds 1-64" with a
scrubber).
```

```
U2.3 (<name> = passwords, route /passwords): §2.2 module 3 and §7.2 module 3. The lookup
travel and stamp, the salt drop, the PBKDF2 odometer fed by the worker (no extra
re-renders: throttle to 10 Hz), and the log-scale time-to-crack bar. Typed passwords
stay out of the URL and storage (the privacy test must still pass).
```

```
U2.4 (<name> = aes, route /aes): §2.2 module 4, §3 B12 and §7.2 module 4. SubBytes with
the S-box lookup, ShiftRows with <Flip> wraparound, MixColumns, AddRoundKey, the key
schedule, CBC/CTR chaining, and the penguins side by side at every width with
"locked until step N" placeholders. Use the empty space beside the state grid for the
S-box or the round key.
```

```
U2.5 (<name> = rsa, route /rsa): §2.2 module 5, §3 B4 and §7.2 module 5. Replace the
input-like value panel with a read-only value card, dashed placeholders that fill by
count-up, trial-division ticks, the Euclid table writing itself with its source rows
highlighted, the square-and-multiply ladder with ModClock, sign/verify travel and
malleability.
```

```
U2.6 (<name> = dh, route /dh): §2.2 module 6 and §7.2 module 6. Paint pots that pour
and blend (colour values from core's OKLab model), mixtures travelling across the
public channel, Eve's lane, the numeric exchange on ModClock, and Mallory splitting the
channel. Keep the deferred chapter loading that keeps /dh under budget.
```

Merge order at the end of wave 2: xor, hashing, passwords, aes, rsa, dh (teaching order),
merged into `main` locally with `npm run verify` after each merge and `npm run test:e2e`
after the last, then pushed. Remove the worktrees and branches afterwards.

### Prompt U3.1 — learning path and glossary (wave W3)

```
Read docs/UIUX.md §2.1 P1, P3, P11 and §4.1. Also read docs/implementation/
10-quality-and-release.md step 1: if /learn already exists from prompt 10.1, restyle and
extend it rather than replacing it.

Build /learn (modules -> chapters, ticks from useProgress, "resume where you left off"),
/glossary from src/components/lesson/glossary.ts with an anchor per term (every <Term>
links to it), and the module completion card (what you learned, next module, the
hex-digit confetti per §7.1, off under reduced motion). Add both routes to the sitemap
and the header menu. Done when verify and e2e pass (axe on the new routes in both
themes). Commit to main and push.
```

### Prompt U3.2 — about and 404 (wave W3)

```
Read docs/UIUX.md §2.3 and §4.1. Restyle /about as a sectioned page with a sticky table
of contents, the real / simplified / only-described summary and the test-vector cards
(keep every disclaimer sentence: aim 4; tests/accuracy-doc.test.ts must still pass).
Give not-found.tsx the friendly 404. Done when verify and e2e pass. Commit to main and
push.
```

### Prompt U4.1 — QA pass (wave W4)

```
Read docs/UIUX.md in full. Act as a beginner first and then as a design reviewer, on a
production build (npm run build && npx next start -p 3100) at 1366x768, 768x1024 and
390x844, light and dark, with and without reduced motion, and keyboard only.

Check every item in §2 and §3 is resolved and every animation in §7 runs, reverses on
Back, jumps on seek and is instant under reduced motion. Run the colour-blind
screenshots. Run npm run perf:bundles and list each route's size against the 170 KB
budget. Fix what you find in the owning folder; report anything that needs a shared
contract change. Write the results as a checklist at the end of this file under
"## 10. QA results". Done when verify and e2e pass. Commit to main and push.
```

### Prompt U4.2 — deploy (wave W4)

```
Check the QA commit is on origin/main (git fetch; git status shows nothing to push).
Wait for the Vercel production deployment for main on project crypto-visualizer to be READY, then check
https://crypto-visualizer-sigma.vercel.app and every module route return 200, the
security headers are present, and the home page and /aes render in light and dark.
Report the deployment URL and anything that differs from the local build.
```
