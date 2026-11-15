# i18n Phase 2 — Application Shell (Module 17, App.tsx)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the App.tsx application shell — top bar, Zen island, mobile navigation and more sheet, sidebar toggles, inspector resizer, loading fallbacks, and every toast notice the shell raises — into Simplified and Traditional Chinese.

**Architecture:** Add an `app` top-level dictionary domain (~65 keys), then replace literals in App.tsx with `t()`/`useT()`. `const t = useT()` lives at the top of `App` (stable module-level reference), and `TerminalLoadingFallback` gets its own. Callbacks wrapped in `useCallback`/`useMemo` that read `t` add it to their dependency arrays.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary.

## Global Constraints

- The three dictionaries keep identical key sets; placeholders must match.
- Never translate runtime values (key names, tag names, enum values), product names (`Ranger`, `Herdr World`), or CSS class names.
- `shortcutTitle(label, shortcut)` receives the translated label.
- View labels reuse `app.nav*` keys between titles, aria labels, visible labels and the `Cannot open {view}` toast.

---

### Task 1: Add the `app` dictionary domain

- [x] ~65 keys: loading fallbacks (terminal/inspector/Ranger), layout-save notices, workspace fallbacks (`Workspace`, `Workspace {number}`), navigation labels (Session/Files/Changes/Annotations/Commits/History/Workspaces/Type), the `Cannot open {view}` / target-closed notices, history-open failure, Ranger source errors, review delivery notices (empty, copied, no-pane fallback, pre-fill with retained-draft detail, count via `annotations.commentsOne`/`commentsMany`), clipboard notices, Ranger/cheat-sheet/Zen entries, mobile nav arias, mobile controls drag/collapse labels, terminal-input shortcut, sidebar resizer/navigator toggles, and `Resize {dock} Inspector` with `dockRight`/`dockBottom` words.
- [x] Reuse existing keys: `shell.moreOptions`, `shell.showTabs`, `shell.tabsTitle`, `shell.terminalFallback`, `menu.version`, `annotations.commentsOne`/`commentsMany`, `config.done` not needed here.
- [x] zh-Hans / zh-Hant sync (检查器/檢查器、禅模式/禪模式、工作区导航器/工作區導覽器、拖动/拖曳).

### Task 2: Migrate App.tsx

- [x] Import `useT`; `TerminalLoadingFallback` takes optional `label` and falls back to `t("app.loadingTerminal")` (signature loosened, callers unaffected).
- [x] `App` gets `const t = useT()` before the hooks; the pane-jump `useMemo`, `openInspector`, `copyFeedback`, `sendFeedback`, the history-open handler, `handleNoticeAction` and the workspace-resource opener add `t` to their dependency arrays.
- [x] Toasts translated: annotation/Ranger layout saves, `Cannot open {view}` with translated view names, Ranger source errors, review copy/pre-fill notices (details kept informative), history open, clipboard, workspace resource.
- [x] Spaces presentation labels: `Terminal` fallback → `shell.terminalFallback`, `Workspace`/`Workspace {number}` → `app.workspaceFallback`/`app.workspaceNumbered`.
- [x] Top bar: brand version title via `menu.version`, cheat-sheet button, Ranger entry (`rangerWorking`/`openRanger`), Zen island title/label.
- [x] Mobile shell: more-sheet backdrop/head/close, navigation buttons (title + aria + visible label per view), workspace shortcut, tabs entry, controls toggle, type shortcut (`navType`).
- [x] Sidebar resizer title, navigator hide/show buttons, inspector resizer aria with localized dock word.
- [x] Inspector/Ranger loading fallbacks.

### Task 3: Fix the translation-coupled anchor query

- [x] `MobileControls`'s "more" button gets `data-mobile-more-trigger=""`; App.tsx's `useLayer` anchor query switches from `button[aria-label="More options"]` (which broke under non-English locales) to `button[data-mobile-more-trigger]`.

### Task 4: Verify and land

- [x] `bun run typecheck:quick` passes (initially caught the missing `app.noAgentPaneCopied` key, then passed).
- [x] Focused tests: i18n + annotations suites (34 pass, 0 fail).
- [x] Diff-vs-main literal audit over App.tsx + MobileControls.tsx: 76 removed literals, all present in `en.ts` (skip list extended with `mobile-nav-label`, `brand-version`, and the shortcut identifiers `shortcuts.show`/`zen.toggle`/`files.toggle`/`diff.toggle`/`workspaces.open`).
- [x] Three-dictionary check: 1749 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write`; typecheck re-run.
- [x] Changelog fragment updated; commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- Product names: `Ranger` (labels, aria, `shortcutTitle` label), `Herdr World` brand title.
- Runtime values: keyboard key names (`ArrowDown`...), tag names, enum states, localStorage keys, lazy ids.
- The drawer aria `Ranger` — a name, not a sentence.
