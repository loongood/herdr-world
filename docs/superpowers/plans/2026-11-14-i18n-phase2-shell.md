# i18n Phase 2 — Mobile Shell Surfaces (Module 16)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the mobile shell surfaces (bottom bar, app bar, tab sheet, layout preferences dialog, pane jump overlay) into Simplified and Traditional Chinese.

**Architecture:** Reuse the established phase-2 pattern: add a `shell` top-level domain to the three dictionaries, then replace literals with `t()`/`useT()` per component. Module-level helpers take the imported module-level `t`; components use `const t = useT()` before any early return.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary (`en` / `zhHans` / `zhHant`).

## Global Constraints

- The three dictionaries must keep identical key sets (`Dictionary` type-enforced).
- Never translate runtime data (tab labels, agent names, paths), CSS class names, or enum values.
- Agent status words shown in shell surfaces go through `agentStateWord` from `world/agentMarks.ts` (already localized).
- English copy must be preserved verbatim in `en.ts` (checked against the diff).

---

### Task 1: Add the `shell` dictionary domain

- [x] Add `shell` to `web/src/i18n/en.ts`, `zh-Hans.ts`, `zh-Hant.ts` (~46 keys): tab names/counts/attention summary, workspace switch arias, tab sheet (title, minimized, unpin/close named, other windows, new tab), agent status aria, layout preferences (display mode auto/mobile/desktop, URL-override suffix with period, bookmark hint with leading space, mobile breakpoint, sidebar order, saved-in-browser note), pane jump overlay (recent panes, find/switch pane, search hints, placeholder, matching/no-match, current badge).
- [x] Chinese variants: 标签页 {number} / 標籤頁, {count} 个打开 / {count} 個開啟, {name} 位于 {place}, 移动端/桌面端 (行動裝置/桌面端), Agent 在上/工作区在上, 最近窗格, 当前/目前.

### Task 2: Translate the components

- [x] `MobileControls.tsx`: `tabName` becomes a module-level function reading the module-level `t` (signature unchanged, callers in App.tsx unaffected); `MobileTerminalIdentity` falls back to `t("shell.terminalFallback")`; the app bar's description uses `tabsOpenCount`/`tabAttention`; workspace-switch aria picks `switchWorkspaceAria` vs `switchWorkspaceInAria` by `terminal.place`; menu arias via `showTabs`/`moreOptions`.
- [x] `MobileTabSheet.tsx`: `const t = useT()` after the store hooks; tabs title, close label, per-row agent status aria via `agentStatusAria` + `agentStateWord(agentSummary.status)`, minimized/unpin/close-named labels, other-windows heading, new tab. Rename shadowed map/filter callback parameters (`t` → `tab`/`item`) to avoid TS2349.
- [x] `MobileLayoutDialog.tsx`: `const t = useT()` before the early return; heading/hint/close, display mode options, the using-mobile/desktop sentence assembled from `usingMobileLayout`/`usingDesktopLayout` + `urlOverrideSuffix`/`layoutPeriod` + `bookmarkHint` (Chinese punctuation differs from English), breakpoint input, sidebar order selects with `agentsOnTop`/`workspacesOnTop` (select values stay enum), order hint, saved note, Done reuses `config.done`.
- [x] `PaneJumpOverlay.tsx`: `const t = useT()` before the early return; recent panes/find/switch titles, search hints, placeholder, empty/matching labels, current badge; agent status word via `agentStateWord(entry.agentStatus)`.

### Task 3: Verify and land

- [x] `bun run typecheck:quick` passes.
- [x] Focused tests: `web/src/i18n` (17 pass), paneJump, chatMenus, updateNotifications, filePreviewNavigation.
- [x] Diff-vs-main literal audit: every removed English literal is present in `en.ts` (skip list extended with `mobile-tab-sheet-`, `pane-jump-`, `(agents|workspaces)-first$` CSS/enum false positives).
- [x] Three-dictionary key-set and placeholder check: 1685 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write` on the touched files; typecheck re-run.
- [x] Changelog fragment updated (`changes/i18n-phase1.md`).
- [x] Commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- Runtime data: tab labels, workspace names, window entry labels, agent names, paths.
- CSS class names and `role`/`id` attributes.
- SidebarOrder enum values (`agents-first`, `workspaces-first`).
