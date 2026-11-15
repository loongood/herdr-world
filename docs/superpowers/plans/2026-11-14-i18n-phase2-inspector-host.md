# i18n Phase 2 — Workspace Inspector (Module 23, Host + Status + ViewSelect + Location + LocationSheet + AgentIdentity)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the Workspace Inspector's window bar, view tabs, window controls, status lines, repository location surfaces and agent identity popover into Simplified and Traditional Chinese.

**Architecture:** Add an `inspector` dictionary domain (58 keys). The exported `INSPECTOR_TAB_LABELS` constant becomes the `inspectorTabLabel(view)` function backed by the module-level `t`, so Host's menu and the mobile selector read the live locale; both components keep working through `?? view` fallbacks. Interactive components get `useT()`. `detached HEAD` stays English (Git term); the browser test fixture (`WorkspaceInspectorPortal.browser.tsx`) is untouched — its "Files"/"Changes" strings are fixture values, not UI.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary.

## Global Constraints

- The three dictionaries keep identical key sets; placeholders must match.
- Never translate view ids, CSS class names, `detached HEAD`, or runtime-composed readings (`stateLabel`, `fill.text`, workspace names).

---

### Task 1: Add the `inspector` dictionary domain

- [x] Keys: host aria, drag/move labels, identity fallbacks, view tabs (Chat/Terminal/Files/Changes/Commits) with chat availability titles, views menu, window controls (restore/maximize/float/dock/close pairs), loading and empty states, stale status lines, checkout-unavailable, worktree description (viewing/ambiguous/choose), repository status words, agent appearance words.
- [x] zh-Hans and zh-Hant sync (檢查器/停駐/終端機/對話/檢視/儲存庫/代理 Hant; 工作樹 Hant for worktree, fixing module 22's workspace word in `preview.unavailableDetail`).

### Task 2: Migrate WorkspaceInspectorHost.tsx

- [x] Window bar aria/titles, identity (workspace fallback, linked-worktree badge), five view tabs, views menu, window controls, file-preview panel aria fallback (reuses `preview.ariaPreview`), back-action labels, loading fallbacks, no-agent empty state.

### Task 3: Migrate the satellite components

- [x] Status: stale/disconnected/checkout lines. ViewSelect: trigger aria/title with `{view}`, group labels, Commits tab; `INSPECTOR_TAB_LABELS` → `inspectorTabLabel()` function. Location: worktree description branches and repository-status aria/title. LocationSheet: dialog aria, handle/heading/close labels. AgentIdentity: appearance popover labels with `{name}`/`{state}`.

### Task 4: Verify and land

- [x] `bun run typecheck:quick` passes (before and after format).
- [x] The Inspector DOM suite keeps its pre-existing local preload failure (CI runs it).
- [x] Diff-vs-main literal audit: 45 removed literals, all present in `en.ts`; skip regex gained `workspace-inspector-*` class names and `detached HEAD`.
- [x] Three-dictionary check: 2153 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write`; changelog fragment updated; commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- `detached HEAD` (Git term), view ids and CSS classes, runtime state words (`stateLabel`, `fill.text`) that come from already-translated shared vocabularies, and the browser-portal test fixture strings.
