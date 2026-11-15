# i18n Phase 2 Module 10: Agent History Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the agent history surfaces (timeline, chat view, composer,
drawer, plus the shared entry-label, prompt-warning and send-receipt helpers)
to the i18n dictionary so 简体中文/繁體中文 follow the selected language.

**Architecture:** Same pattern as phase-2 modules 1–9: add `history` leaves to
`web/src/i18n/en.ts` (WidenLeaves base), mirror them in `zh-Hans.ts` and
`zh-Hant.ts`, then replace literals in the eight consumer files. Components
call `useT()`; module-level pure functions (`agentHistory.ts`,
`agentSession.ts`, `pendingSends.tsx`) import `t` directly — safe because they
only run during render. The `chat` dictionary gains five keys for the pending
send receipts shared by AgentChat and the history chat view.

**Tech Stack:** Bun, TypeScript, React, existing `web/src/i18n` runtime.

## Global Constraints

- English dictionary values keep the original sentence shapes; tests assert
  English UI (`en` is the default locale) and must pass unchanged.
- No module-level constant may freeze English at import time: strings build
  inside render (see the DeskView mode-label lesson, module 9).
- `t()` template params take `Record<string, string | number>`; helpers that
  return `string | null` (`formatSpan`, `formatBytes`,
  `formatOptionalCompact`) need `?? ""`.
- Do not translate test fixtures (`*.browser.tsx` surfaces driven by
  browser tests).
- Reuse existing keys where the wording matches: `chat.stop`, `chat.dismiss`,
  `chat.stopChecking`, `chat.copyCommand`, `needsYou.retry`,
  `desk.toolCallsOne/Many`.
- Keep `agent-history-*`, `agent-chat-*`, `data-*`, class names and test ids
  untranslated.

## Files

- Modify: `web/src/i18n/en.ts` — new top-level `history` domain (~107 keys)
  plus 5 `chat` keys (`receiptMemoryNote`, `pendingWaitingFor`,
  `pendingQueuedSentTo`, `pendingSentNotSeen`, `pendingUnverifiedTail`).
- Modify: `web/src/i18n/zh-Hans.ts`, `web/src/i18n/zh-Hant.ts` — mirror the
  same keys.
- Modify: `web/src/components/agentHistory.ts` — `historyEntryLabel` and its
  filter labels via `t("history.label*")`, `toolFallbackName`.
- Modify: `web/src/components/agentSession.ts` — `agentPromptWarning` via
  `promptTheAgent` fallback and `promptWorking/promptBlocked/promptUnknown`.
- Modify: `web/src/components/AgentHistoryFilters.tsx` — filter chips build
  their labels inside the component (no module-level constants).
- Modify: `web/src/components/AgentHistoryCard.tsx` — copy/speak/expand
  actions, call id, load-arguments buttons.
- Modify: `web/src/components/AgentHistoryChat.tsx` — bubbles, speech
  controls, tool steps/blocks, minimap, queued badges, search-match notes.
- Modify: `web/src/components/AgentHistoryComposer.tsx` — warning confirm
  row, image upload errors, aria labels, send button states.
- Modify: `web/src/components/AgentHistoryDrawer.tsx` — header buttons,
  empty/error/unavailable states, details overview and detail rows.
- Modify: `web/src/components/chat/pendingSends.tsx` — replace the
  `RECEIPT_MEMORY_NOTE` constant with the `receiptMemoryNote()` function and
  translate the four pending-send strings.

## Tasks

### Task 1: Dictionary keys

- [x] Add the `history` domain and the 5 `chat` keys to `en.ts`, keeping the
      original English wording verbatim (including leading " · " in
      `pendingUnverifiedTail`).
- [x] Mirror all keys in `zh-Hans.ts` (智能体/工作台/会话/工具调用/参数) and
      `zh-Hant.ts` (智慧代理/工作臺/工作階段/工具呼叫/引數).
- [x] `bun run test web/src/i18n/` — dictionaries and WidenLeaves checks pass.

### Task 2: Shared helpers

- [x] `agentHistory.ts`: import `t`; `historyEntryLabel` uses
      `history.labelToolCall/labelUserMessage/labelCompactedSummary/...` with
      `toolFallbackName`.
- [x] `agentSession.ts`: import `t`; `agentPromptWarning` falls back to
      `history.promptTheAgent` and uses `promptWorking/promptBlocked/
      promptUnknown`.
- [x] Keep the assertion prefixes (`codex is still working.` etc.) verbatim.

### Task 3: Timeline components

- [x] `AgentHistoryFilters.tsx`: `useT()`; `labels` object moves inside the
      component; show/hide filter titles via `filterShowTitle/filterHideTitle`.
- [x] `AgentHistoryCard.tsx`: `useT()`; entry copy aria, call id, load
      arguments/output labels (`kind: "call" | "result"` parameter replaces
      the English label parameter), expand buttons.
- [x] `AgentHistoryChat.tsx`: `useT()` before any early return in memoized
      bubbles; compaction notice, speech controls, tool steps
      (`collapseTools/expandTools`, `errorsOne/Many` reusing
      `desk.toolCallsOne/Many` for the calls label), jump/new/earlier
      controls, matched-notes with `receiptMemoryNote()`, `"You"` →
      `history.labelYou` in the module-level sender helper.
- [x] `AgentHistoryComposer.tsx`: `useT()`; image pick/upload errors, send
      shortcut titles (`sendShortcutTitle` with `{keys}`,
      `sendEnterTitle`), warning confirm row (`cancel/sendAnyway`),
      attach/send aria labels and upload/sending/send button states.

### Task 4: Drawer and pending receipts

- [x] `AgentHistoryDrawer.tsx`: `useT()`; relative-time fallback
      (`unknownTime`), no-transcript notice, session actions
      (`openTranscript/exportSession`), search box, empty states (loading /
      no-match / clear / reset / show-all / no-entries), wide-panel resize
      labels, aside header (`drawerAria/sessionLabel/countAria/countTitle`),
      view toggles (`chatView/showAsTimeline/showAsChat`,
      `detailsAria/showHistory/showDetails`), refresh/close buttons,
      unavailable block (`unavailableTitle/copyIntegrationAria/
      copyCommandTitle` + reused `needsYou.retry`), details region
      (`overviewAria`, `statTurns/statTokens/statUpdated`,
      `usageInput/usageCached/usageOutput` with `?? ""` params, nine
      `detail*` row labels), history messages region aria.
- [x] `chat/pendingSends.tsx`: `receiptMemoryNote = () =>
      t("chat.receiptMemoryNote")` replaces the exported constant;
      `placedSends` uses `pendingWaitingFor/pendingQueuedSentTo/
      pendingSentNotSeen/pendingUnverifiedTail` and reuses
      `chat.stopChecking/chat.dismiss`; the meta `title` calls
      `receiptMemoryNote()`.

### Task 5: Verification and delivery

- [x] `bun run typecheck:quick` — passes.
- [x] `bun run test web/src/components/AgentHistoryComposer.test.tsx
      web/src/components/AgentHistoryCard.test.ts
      web/src/components/AgentHistoryChat.test.ts
      web/src/components/agentSession.test.ts web/src/i18n/` — 37 pass.
- [x] Removed-literal audit: every English literal deleted from the eight
      source files still exists verbatim in `en.ts` (111 checked; CSS class
      names `agent-history-*` skipped).
- [x] Template params audited against call sites (`{agent}`, `{detail}`,
      `{keys}`, `{size}`, `{shown}/{total}`, `{count}`, `{index}`,
      `{label}`, `{id}`).
- [x] `bunx biome format --write` on the eleven touched files only.
- [x] `changes/i18n-phase1.md` extended with the agent-history paragraph.
- [x] Commit on `feat/i18n-phase1` and push.

## Notes for future modules

- `pendingSends.tsx` is now consumed by both AgentChat and the history chat
  view through `receiptMemoryNote()` — do not reintroduce a string constant.
- `AgentHistoryCard`'s `ToolContentLoad` API changed from `label: string` to
  `kind: "call" | "result"`; callers must pass the kind, not a label.
