# i18n Phase 2 — Tab Strip (Module 18, TabBar + tabPins)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the desktop tab strip (TabBar.tsx) and the tab-pin block reasons (tabPins.ts) into Simplified and Traditional Chinese.

**Architecture:** Add a `tabbar` dictionary domain (~31 keys). The exported module-level `tabName` switches to the module-level `t`, so its signature and all importers (App.tsx, MobileTabSheet, MobileControls' local copy already uses the same key) stay unchanged while following the locale. `tabPins`' block-reason constants become functions reading `t`, because a constant cannot follow a locale switch.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary.

## Global Constraints

- The three dictionaries keep identical key sets; placeholders must match.
- Never translate runtime data (tab labels), CSS classes, or event names.
- The module-level `t` is a stable reference; component code uses `const t = useT()`.

---

### Task 1: Add the `tabbar` dictionary domain

- [x] Keys: close-tab/pane confirmation titles and messages (`Close "{name}"?`), rename dialog (title, name label, submit), pinned marker, close tab, new tab, new agent + hint, inspector/annotations toggles (open/close + visible labels), `{count} more agents`, context-menu items (focus/rename/pin/unpin/create/close), tab colour, and the two pin block reasons.
- [x] zh-Hans (标签页/固定/智能体) and zh-Hant (標籤頁/釘選/智慧代理 — matching the established Hant term) sync.

### Task 2: tabPins.ts block reasons become functions

- [x] `PINNED_TAB_CLOSE_REASON`/`PINNED_TAB_LAST_PANE_CLOSE_REASON` constants → `pinnedTabCloseReason()`/`pinnedLastPaneCloseReason()` functions reading `t`; `tabCloseBlockReason`/`paneCloseBlockReason` call them internally, so store/operations consumers stay unchanged.
- [x] `tabPins.test.ts` imports the new functions; assertions unchanged in behavior.

### Task 3: Migrate TabBar.tsx

- [x] Import `t`/`useT` and `agentStateWord`; `tabName` uses `t("shell.tabName", ...)` (the inline `Tab ${t.number}` duplicate inside the map collapses into `tabName(tab)`, fixing its missed translation too).
- [x] `TabBar` and `TabContextMenu` each get `const t = useT()`; the `setTimeout` handle inside `TabContextMenu` renames `t` → `timer`, and the map/filter callback parameters rename `t` → `tab` to avoid shadowing.
- [x] Confirmations, rename dialog, create/new-agent buttons, inspector and annotations toggles, pinned marker, close control, agent status marker title/aria (via `agentStateWord` + `shell.agentStatusAria`), context menu and colour label all read the dictionary.

### Task 4: Verify and land

- [x] `bun run typecheck:quick` passes (caught the null-param and removed-constant issues; both fixed).
- [x] Focused tests: tabPins (12 pass), i18n, annotations (46 pass total, 0 fail).
- [x] Diff-vs-main literal audit over TabBar.tsx + tabPins.ts: 26 removed literals, all present in `en.ts`; skip regex generalized to `[a-z]+.(show|toggle|open|create|recent|search)$` for shortcut identifiers.
- [x] Three-dictionary check: 1779 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write`; typecheck re-run.
- [x] Changelog fragment updated; commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- Runtime tab labels and ids; event names; the `herdr-world:request-*` custom events.
