# i18n Phase 2 — File Explorer (Module 21, FileExplorerDialog + FilesystemBrowser + fileManager)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the file explorer (dialog, side panel, entry menu, tree), the read-only filesystem browser, and the shared reveal helper into Simplified and Traditional Chinese.

**Architecture:** Add a `files` dictionary domain (~76 keys). The two wrapper components (`FileExplorerDialog`, `FileExplorerPanel`) early-return before any hook, so their shared `File Explorer` aria label reads the module-level `t`; the interactive components (`FileExplorerEntryMenu`, `FileExplorerContent`, `FilesystemBrowser`) get `const t = useT()`. `fileManager.ts`'s `revealMenuLabel` and `revealInFileManager` switch to the module-level `t` with unchanged signatures.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary.

## Global Constraints

- The three dictionaries keep identical key sets; placeholders must match.
- Never translate paths, glob patterns inside hints, dataTransfer type names, or default download names (`download`).
- "Finder" stays English (macOS proper noun); Windows "File Explorer" translates.

---

### Task 1: Add the `files` dictionary domain

- [x] Keys: reveal words (per-platform), explorer title, entry menu (new folder/download/copy path/delete/refresh), tree states (loading directory, empty, loading files, drop targets), search controls (checkout search, type, scope words Files/Content/Loaded, globs hint, show hidden), toolbar (new folder in root, browse filesystem, refresh), folder dialog, delete confirmations (`Delete {type} "{path}"?` with the directory/file word as a parameter), ~18 upload/download/move/delete notices, filesystem browser (bridge requirement, path bar, loaded-file search, entry actions).
- [x] zh-Hans and zh-Hant sync (資料夾/檔案總管/重新整理/上傳 Hant).

### Task 2: Migrate fileManager.ts

- [x] `revealMenuLabel` branches read the dictionary; `revealInFileManager`'s failure notice translates; signatures unchanged.
- [x] `fileManager.test.ts` English assertions still pass (initial dictionary is `en`).

### Task 3: Migrate FileExplorerDialog.tsx and FilesystemBrowser.tsx

- [x] Entry menu, notifications, row area (collapse/expand, file actions, loading/empty), header (title, path fallback, no-focused-workspace error), search area, toolbar, drop area, folder dialog and delete dialog all read the dictionary; the create-folder submit reuses `commands.createAction`.
- [x] FilesystemBrowser: bridge error, path bar, loaded search (placeholder/title), hidden/refresh toggles, entries aria, empty/no-match states, per-entry actions.
- [x] Untouched: `Empty` only matched once (verified), dataTransfer `Files`, DOM classes, the throw path's translated message.

### Task 4: Verify and land

- [x] `bun run typecheck:quick` passes (one script quoting slip fixed; FilesystemBrowser imports only `useT`).
- [x] Focused tests: fileManager + i18n — 23 pass, 0 fail.
- [x] Diff-vs-main literal audit: 75 removed literals, all present in `en.ts`; skip regex gained four CSS-class names and `^Finder$`.
- [x] Three-dictionary check: 2027 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write`; typecheck re-run.
- [x] Changelog fragment updated; commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- Paths and path placeholders, glob examples, "Finder", dataTransfer type names, default download name.
