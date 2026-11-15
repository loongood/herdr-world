# i18n Phase 2 — Command Palette (Module 19, CommandCombobox + worktreeCommandActions)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the command palette (CommandCombobox.tsx) and its worktree action helper (worktreeCommandActions.tsx) into Simplified and Traditional Chinese.

**Architecture:** Add a `commands` dictionary domain (~72 keys). The component gets `const t = useT()`; its action arrays are built inline during render, so the closure follows the locale with no memo-dependency work. The module-level `tabName` (already locale-aware since module 18) and a new module-level `t` import cover the shared helpers. Search `keywords` arrays stay English: they match what the user types.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary.

## Global Constraints

- The three dictionaries keep identical key sets; placeholders must match.
- Never translate runtime data (workspace/worktree names, branch labels), CSS classes, shortcut ids (`command.menu`), or search keywords.
- The module-level `t` is a stable reference; component code uses `const t = useT()`.

---

### Task 1: Add the `commands` dictionary domain

- [x] Keys: trigger button (`Open command menu`, `Actions`), search placeholder, empty state, stale-selection notice, top-result counter; nine group headings; rename-workspace / rename-tab / new-worktree dialog labels (rename-tab reuses `tabbar.*`); ~40 action titles with `{name}`/`{path}`/`{label}`/`{id}` templates; close/remove-worktree confirmations (close-tab/pane titles reuse `tabbar.*`).
- [x] zh-Hans (工作树/窗格/智能体) and zh-Hant (工作樹/窗格/智慧代理, 終端機) sync.

### Task 2: Migrate worktreeCommandActions.tsx

- [x] Module-level `t` import; the five action titles read the dictionary; signatures unchanged so CommandCombobox needs no call-site changes.

### Task 3: Migrate CommandCombobox.tsx

- [x] `import { t, useT } from "../i18n"`; `OwnedCommandCombobox` gets `const t = useT()`; module-level `tabName` already reads `shell.tabName`.
- [x] All action arrays, dialogs (text dialog, four ConfirmDialogs), trigger button (aria-label + `shortcutTitle` label), placeholder fallback, empty state, headings and the top-result counter read the dictionary; confirmations concatenate `composerDraftWarningFor` after the translated sentence.
- [x] The four `useMemo`s touch no translated text, so no dependency changes.
- [x] Deliberately left: `shortcut === "Unassigned"` (compares `shortcutLabel` output; handled when shortcutCatalog migrates), `heading === "Visual selection"` (extension data comparison), search `keywords`, keyboard `CommandShortcut` values.

### Task 4: Verify and land

- [x] `bun run typecheck:quick` passes (three leftover template-string backticks from the sed pass fixed via Edit replace-all).
- [x] Focused tests: i18n suite 17 pass, 0 fail.
- [x] Diff-vs-main literal audit over CommandCombobox.tsx + worktreeCommandActions.tsx: 66 removed literals, all present in `en.ts`; skip regex gained `^command.[a-z.]+$` for shortcut ids.
- [x] Three-dictionary check: 1851 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write`; typecheck re-run.
- [x] Changelog fragment updated; commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- Search keywords (matching input), shortcut ids and key labels, runtime names (workspaces, worktrees, tabs, agents, paths, branch labels), extension-provided group data.
