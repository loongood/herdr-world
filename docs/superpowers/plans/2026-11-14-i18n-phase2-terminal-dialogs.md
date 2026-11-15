# i18n Phase 2 Module 13 — Terminal Dialogs and Palette

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the terminal appearance dialog, the mobile shortcut editor, the incremental transport setting and the composer command palette to zh-Hans/zh-Hant.

**Architecture:** Append ~130 keys to the existing top-level `terminal` domain in the three dictionaries. Dialog subcomponents (`TerminalFontPicker`, `TerminalFontSection`, `ShortcutKeySelect`, `CustomKeyPicker`) each take their own `useT()`. Module-level label tables become `TranslationKey` key maps resolved with `t()` at render time.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- Same as module 12: identical `{placeholder}`s across dictionaries; keep
  runtime values (key names `Esc`/`Ctrl`, event values, storage-scoped
  data) untranslated; half-width commas/colons, full-width question marks
  in zh-Hans.
- The built-in slash-command catalog (`terminalComposerCommands.ts`) keeps
  English descriptions on purpose: they document external CLIs (Claude
  Code, Codex, Pi, Kimi, Grok, Antigravity) via their official docs, not
  World's own copy.
- The `.browser.tsx` files are browser-harness tests asserting English
  aria-labels; they are not product surfaces and stay untranslated.

---

### Task 1: Extend the `terminal` domain

- [x] **Step 1: Append ~130 keys to `en.ts`**: 21 color labels, theme
  variant labels, theme editor strings (limits, alerts, actions), font
  picker strings, shortcut-editor strings (groups, slots, errors, the
  long help paragraph), transport strings, and palette strings.
- [x] **Step 2: Mirror in `zh-Hans.ts` / `zh-Hant.ts`** (slot names become
  第 {row} 行第 {slot} 格 / 右側第 {slot} 格).
- [x] **Step 3: `bun run typecheck:quick`** — passes.

### Task 2: Migrate `TerminalComposerPalette.tsx`

- [x] Group/heading/dismiss aria labels, the replacement confirm notice
  (`{name}` interpolation), Replace draft / Cancel buttons, and the
  no-match note.

### Task 3: Migrate `TerminalTransportSettings.tsx`

- [x] Delete the module-level `TRANSPORT_DESCRIPTION` constant; the
  component reads `terminal.transportDescription` through `useT()` (used
  in title, popover body and hidden description).
- [x] Label, about-aria, saving/unavailable/loading states (Enabled /
  Disabled reuse `config.enabled`/`config.disabled`; Retry reuses
  `needsYou.retry`), and the invalid-settings throw inside `load`
  (callback deps gain the stable `t`).

### Task 4: Migrate `TerminalThemeDialog.tsx`

- [x] `COLOR_KEY_LABELS` → `COLOR_KEY_LABEL_KEYS` (`TranslationKey` map,
  resolved at render); `THEME_VARIANTS` → `labelKey` map with callers
  passing `t(variant.labelKey)`.
- [x] Font picker and font section subcomponents get their own `useT()`.
- [x] Main dialog: section heads (used-in-variant hint, create-for-mode
  title, limit titles), card actions (duplicate/edit/delete aria and
  titles, Custom badge), editor (title, name field, suggested-for, base /
  ANSI color headings, missing-theme and limit alerts, Cancel / Save /
  Create), dialog title/subtitle/aria, and the ConfirmDialog
  (`{name}` interpolation).
- [x] Default names flow through the dictionary: "Custom theme" and
  "{name} copy" stay user-visible text.

### Task 5: Migrate `MobileTerminalShortcutsDialog.tsx`

- [x] `OPTION_GROUPS` and `EXTRA_KEY_GROUPS` headings via
  `OPTION_GROUP_KEYS` / `EXTRA_KEY_GROUP_KEYS` maps (the string values
  remain the storage/search keys; only the display heading translates).
- [x] `ShortcutKeySelect`: search placeholder/aria, empty state, group
  headings and keywords, selected-option aria (`{label}, selected`).
- [x] `CustomKeyPicker`: key-cap aria (`Key {key}`), US keyboard labels,
  modifier group aria, more-keys summary.
- [x] Main dialog: title/subtitle, slot boards (row/slot aria with
  `{row}`/`{slot}`/`{label}`/`{key}`, unknown-key fallback), side board,
  slot editor (labels, mode toggle, clear), invalid-combination alerts,
  the shortcuts help paragraph, and Restore defaults / Cancel / Save.

### Task 6: Verify and land

- [x] **Step 1: Dictionary tests + dialog suites** — 17 i18n tests pass;
  TerminalThemeDialog / MobileTerminalShortcutsDialog /
  terminalComposerCommands suites pass (7 pass, 1 skip); composer suites
  31 pass with the known Windows isolated-DOM timeout only.
- [x] **Step 2: Three-dictionary check** — terminal keys 239/239/239, all
  placeholders match; the removed-literal script confirms all 78 English
  literals still exist in `en.ts`.
- [x] **Step 3: biome format** on the touched files; typecheck again.
- [x] **Step 4: Changelog fragment** and this plan file.
- [x] **Step 5: Commit and push** to `feat/i18n-phase1`.
