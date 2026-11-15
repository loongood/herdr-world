# i18n Phase 2 Module 12 — Terminal Core Surfaces

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the terminal core surfaces (pane view, composer, tab pane layout, draft store warnings) to zh-Hans/zh-Hant through the shared dictionary.

**Architecture:** Reuse the phase-1 i18n frame: `en.ts` gains a top-level `terminal` domain (~99 keys); `zh-Hans.ts`/`zh-Hant.ts` mirror it. Components resolve copy with `useT()` inside the component body (before early returns); the module-level `terminalComposer.ts` uses the imported `t()`.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- Keep placeholder syntax `{name}` identical across the three dictionaries.
- Keep English sentence shapes that tests assert (e.g. leading space in the
  close-warning sentences).
- Do not translate runtime status values that feed CSS classes
  (`queued`, `running`, ...), product names, or key-reference arguments
  (`shortcutTitle`'s `"composer.send"`).
- Chinese copy follows the established conventions: half-width commas and
  colons without trailing space, full-width question marks in zh-Hans
  (half-width in zh-Hant), half-width parentheses.

---

### Task 1: Add the `terminal` domain to the three dictionaries

- [x] **Step 1: Append ~99 keys to `web/src/i18n/en.ts`** as a top-level
  `terminal` domain after `assistant` closes. Groups: draft/path errors,
  paste/upload/copy failures (with `{detail}`/`{paths}`/`{what}`/`{text}`
  placeholders), status words, touch-selection actions, mobile input,
  pane toolbar, input row, and the pane switcher.
- [x] **Step 2: Mirror the domain in `zh-Hans.ts` and `zh-Hant.ts`.**
  Lesson learned: when appending a top-level domain by editing after the
  last key of the previous domain, the old_string must include the
  previous domain's closing `},` and the object close, or the new domain
  nests inside the previous one (TS2353).
- [x] **Step 3: `bun run typecheck:quick`** — passes.

### Task 2: Migrate `TerminalView.tsx`

- [x] **Step 1: Import `useT` and add `const t = useT();` at the top of the
  component body.**
- [x] **Step 2: Translate all user-facing copy (~48 sites):** draft/terminal
  inactive throws, path-insertion notices, copy-approval toast, selection
  resumed/taken over/closed notes, composition-active rejection, upload
  incomplete/retained, clipboard timeout errors (image/text, three call
  sites + one odd-indent site), paste operation failures, drop directories,
  upload/copy/composer failures, shortcut endpoint error, loading/select
  status, upload-failed dialog titles, touch-selection aria/actions,
  mobile input row (aria labels, titles, shortcut run/send with `{label}`),
  pane toolbar (history unavailable, splits, restore/maximize/close with a
  `{warning}` close confirmation), paused/disconnected states, and the
  ConfirmDialog/MessageDialog labels.
- [x] **Step 3: Rename the local `presentFrame` parameter `t: TerminalPush`
  to `push`** — it shadowed the i18n `t` inside that effect.
- [x] **Step 4: Import only `useT`** — the module-level `t` import was
  unused (TS6133) because every call site sits inside the component.

### Task 3: Migrate `TerminalComposer.tsx`

- [x] **Step 1: Import `useT`; `const t = useT();` before
  `useShortcutPreferences()`.**
- [x] **Step 2: Translate all user-facing copy (~31 sites):** closed-composer
  throws, upload-failed fallbacks (one shared `const fallback`),
  aria labels by surface, attachment and command buttons, mode toggle
  labels, state placeholders (`{agent}` interpolation vs generic), insert
  vs send buttons and hints (`shortcutTitle` keeps its `"composer.send"`
  key reference), direct-mode notice and launch failure, and close/drop
  labels.
- [x] **Step 3: Import only `useT`.**

### Task 4: Migrate `TabTerminalPaneLayout.tsx` and `terminalComposer.ts`

- [x] **Step 1: `TabTerminalPaneLayout`:** `useT` at the top; switcher/panes
  aria, in-inspector/loading empty states, previous/next pane labels and
  the `{index}`/`{total}` pane counter.
- [x] **Step 2: `terminalComposer.ts`:** import module-level `t`;
  `terminalComposerCloseWarning` emits the one/many unsent-draft sentences
  (leading spaces preserved in the dictionary values).
- [x] **Step 3: `bun run typecheck:quick`** — passes.

### Task 5: Verify and land

- [x] **Step 1: Dictionary tests + composer suites** (`web/src/i18n/`,
  `terminalComposer.test.ts`, `TerminalComposer*.test.ts`) — 49 pass;
  the isolated-DOM suite keeps its known Windows preload failure.
- [x] **Step 2: Three-dictionary check** — `terminal` keys 99/99/99, all
  placeholders match; diff-removed-literal script confirms every removed
  English literal still exists in `en.ts` (83 checked).
- [x] **Step 3: biome format** on the touched files; typecheck again.
- [x] **Step 4: Changelog fragment** (`changes/i18n-phase1.md`) and this
  plan file.
- [x] **Step 5: Commit and push** to `feat/i18n-phase1`.
