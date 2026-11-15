# i18n Phase 2 Module 15 — Review Annotations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the review annotation panel, the composer popover and
the shared line-label helpers to zh-Hans/zh-Hant.

**Architecture:** New top-level `annotations` domain (~50 keys). The three
shared helpers in `annotations.ts` (`diffReviewLineLabel`,
`fileReviewLineLabel`, `terminalAnnotationTitle`) translate in place with
the module-level `t`, keeping their signatures — `AnnotationPanel`,
`DiffContentView`, `FilePreviewContent` and `TerminalView` call sites stay
untouched, and the compiled review-feedback message follows the locale.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- Same as earlier modules: identical `{placeholder}`s; half-width
  punctuation; full-width question marks in zh-Hans.
- The English side labels stay lowercase ("old"/"new"): the same labels
  feed `compileReviewFeedback`, whose test asserts `(new line 12)`.
- Shortcut identifiers (`annotations.copy`, `annotations.prefill`,
  `annotation.submit`) are runtime keys, not copy; the `"Unassigned"`
  comparison against `shortcutLabel` output stays English until the
  shortcut-preferences module lands.

---

### Task 1: Create the `annotations` domain

- [x] **Step 1: Add ~50 keys to `en.ts`**: panel (aria, title, counts,
  pin/float modes, close), empty state, stale badges, per-card aria
  labels (quote, comment, move, delete), agent-pane picker and fallbacks,
  delivery buttons and shortcut titles, clear-draft confirmation,
  location templates, line labels (diff one/range/cross, file one/range,
  side labels, terminal fallback), and composer strings (aria,
  placeholder, add hint).
- [x] **Step 2: Mirror in `zh-Hans.ts` / `zh-Hant.ts`** (批注/標註,
  锚点已失效/錨點已失效, 中文 line labels 旧第 {line} 行/舊第 {line} 行).
- [x] **Step 3: `bun run typecheck:quick`** — passes.

### Task 2: Translate the shared helpers in `annotations.ts`

- [x] `diffReviewLineLabel` builds `{side}` from `sideOld`/`sideNew` and
  uses `diffLineOne`/`diffLineRange`/`diffLineCross`;
  `fileReviewLineLabel` uses `fileLineOne`/`fileLineRange`;
  `terminalAnnotationTitle` falls back to `annotations.terminalFallback`.
- [x] Signatures unchanged; no consumer edits required.

### Task 3: Migrate `AnnotationPanel.tsx`

- [x] `annotationLocation` takes the `t` function; header (title, comment
  count one/many), pin/float and close controls, empty-state hint, stale
  badges, quote/comment/move/delete aria labels with `{number}`, blank
  line placeholder, agent-pane picker (label, summary, no-pane note),
  copy/prefill buttons with localized shortcut titles, go-to-agent,
  clear draft and the ConfirmDialog.

### Task 4: Migrate `AnnotationComposerPopover.tsx`

- [x] Dialog aria, blank-line placeholder, textarea aria and placeholder
  (`composerPlaceholder` keeps the original "Add a review comment" with
  the article), Cancel (reuses `history.cancel`), Add comment, and the
  "{shortcut} to add" hint.

### Task 5: Verify and land

- [x] **Step 1: Tests** — annotations suite 17/17 (after restoring the
  lowercase side labels), i18n dictionary suites pass.
- [x] **Step 2: Removed-literal check** — all 26 deleted English literals
  exist in `en.ts`; two shortcut identifiers are skip-listed, and the
  missing "Add a review comment" article was restored as its own key.
- [x] **Step 3: Three-dictionary check** — 1640/1640/1640 keys, zero
  placeholder mismatches.
- [x] **Step 4: biome format** on the six touched files; typecheck again.
- [x] **Step 5: Changelog fragment** and this plan file.
- [x] **Step 6: Commit and push** to `feat/i18n-phase1`.
