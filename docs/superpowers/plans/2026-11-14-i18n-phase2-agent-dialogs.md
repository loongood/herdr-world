# i18n Phase 2 Module 14 — Agent Dialogs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the terminal agent launcher, the session inspector, the
message detail dialogs and the agent integrations settings to
zh-Hans/zh-Hant.

**Architecture:** New top-level `agents` domain (~100 keys) in the three
dictionaries. Two module-level pure helpers use the imported module-level
`t` (`agentMessageRoleLabel`, `stepMetricText`) so call sites keep their
signatures. `AgentIntegrationsSettings`'s `useStoreSelector` waiting
message becomes an enum selector (`"world" | "herdr" | null`) resolved to
text in the component body. State labels and change verbs use
`TranslationKey` maps.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- Same as earlier modules: identical `{placeholder}`s across dictionaries;
  half-width commas/colons, full-width question marks in zh-Hans.
- Runtime comparison values stay untranslated: the
  `meaningfulMessage` `"Token usage"` check, `tool_name`/`"tool"` fallback,
  harness labels, agent labels and versions.
- `readinessNote` texts in `agentProfiles.ts` are shared with
  `HarnessReadinessSummary`, `BoardView` and `ProfileEditor`; they move to
  keys together with all their consumers in a later World module.

---

### Task 1: Create the `agents` domain

- [x] **Step 1: Add ~100 keys to `en.ts`**: launcher panel (title, close,
  detect states, launch-command editor, save failure), integrations
  (states, description paragraph, verbs, confirm title/body, results,
  versions, PATH notices, toolbar, connection states, notes), session
  inspector (title, overview labels, file row, tabs, export menu, banners,
  timeline turns, step labels), and message content (roles, title, call
  ID, view toggles, copy/close, loading).
- [x] **Step 2: Mirror in `zh-Hans.ts` / `zh-Hant.ts`** (会话检查器/
  工作階段檢查器, 轮次/輪次, 调用 ID/呼叫 ID, renders 算繪 in Hant).
- [x] **Step 3: `bun run typecheck:quick`** — passes.

### Task 2: Migrate `AgentLauncher.tsx`

- [x] Trigger/panel aria and title, heading, close button, retry,
  detecting and no-agents states, launch-command editor (aria + label,
  Reset/Cancel/Save), save failure message, per-row edit aria/title.

### Task 3: Migrate `AgentMessageContent.tsx` + `AgentMessageDialog.tsx`

- [x] `agentMessageRoleLabel` uses the imported module-level `t` (tool
  arguments/error/output, assistant, user); the component adds `useT()`.
- [x] Message title (`{role} Message`), call ID line, raw/rendered toggle
  (aria, title, button), copy button, close buttons (embedded + modal),
  loading-tool-content state.
- [x] `AgentMessageDialog`: full-message aria gains the `fullMessageAria`
  key (`{role}` interpolated with the localized, lowercased role).

### Task 4: Migrate `AgentSessionPreviewDialog.tsx`

- [x] `stepMetricText` uses module-level `t` for Input/Cached/Output; the
  runtime `"Token usage"` comparison is untouched.
- [x] Main dialog: unavailable detail fallback, dialog title/aria, identity
  line (`Agent` fallback), close button, overview labels (turns, total
  tokens, updated) and the input/cached/output/reasoning line, file row
  (label, `{count} records`, copy aria/title), loading/unavailable states,
  view switch tabs, export menu and buttons, truncated banner, no-ATIF
  state.
- [x] `SessionTimeline`, `SessionTurn` (memo) and `SessionStepRows` each
  take `useT()`; turn headers use `sessionSetup`/`turnN` and the
  `eventsCountOne`/`eventsCountMany` pair; step labels (Reasoning, Prompt,
  Response, tool-output fallback, System).

### Task 5: Migrate `AgentIntegrationsSettings.tsx`

- [x] `stateLabels` → `STATE_LABEL_KEYS` (`TranslationKey` map); the
  description constant moves to `agents.integrationsDescription`.
- [x] `useStoreSelector` returns `"world" | "herdr" | null`; the component
  resolves the waiting text.
- [x] `load` gains `t` in its callback deps with the load-failure message.
- [x] `change`: localized verbs, `window.confirm` builds
  title+body from `changeConfirmTitle`/`changeConfirmBody`, invalid-result
  throw, completed/confirm-failed messages.
- [x] List rendering: version titles and unavailable text, update-to aria,
  not-detected badge, command-not-found titles, action/uninstall aria,
  button labels.
- [x] Shell: heading, about popover, refresh, status line
  (applying/loading), connection-lost alert with reload, missing-management
  note, World-skill busy message, local-only note, none-reported note,
  other-agents summary and world-only aria.

### Task 6: Verify and land

- [x] **Step 1: Tests** — 17 i18n dictionary tests pass;
  AgentIntegrationsSettings + agentSession suites pass (17 tests). The
  isolated-DOM launcher suite keeps its known Windows failure.
- [x] **Step 2: Removed-literal check** — all 65 English literals deleted
  from the five files still exist in `en.ts`.
- [x] **Step 3: Three-dictionary check** — 1587/1587/1587 keys, zero
  placeholder mismatches across 3174 leaf values.
- [x] **Step 4: biome format** on the eight touched files; typecheck again.
- [x] **Step 5: Changelog fragment** and this plan file.
- [x] **Step 6: Commit and push** to `feat/i18n-phase1`.

### Deferred to the World module

- `AgentLauncherDialog.tsx` (the New agent dialog) together with
  `agentProfiles.ts`'s `readinessNote` texts and their other consumers
  (`HarnessReadinessSummary`, `BoardView`, `ProfileEditor`) — one coherent
  switch so no consumer renders raw keys.
