# i18n Phase 2 Module 11 — Ranger Assistant Panel Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the Ranger assistant panel series (7 files) to 简体中文 and 繁體中文 behind the phase-1 i18n framework.

**Architecture:** Same as modules 1-10: `useT()` in components (locale-reactive), imported `t()` only in module-level pure functions; module-level label maps become `as const satisfies Record<string, TranslationKey>` key maps plus runtime lookup functions; the `assistant` top-level dictionary domain (~360 keys) is appended to en.ts and mirrored in zh-Hans.ts / zh-Hant.ts.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- English dictionary values keep the original sentence shapes verbatim so the default-locale tests stay green.
- Placeholders/examples stay untranslated: `your-model-id`, `my-provider`, `https://api.example.com/v1`, `Europe/London`; product names (Ranger, Pi), API format names, CSS classes, data attributes stay English.
- Reuse existing keys where the English text is identical: `history.cancel`, `history.refresh`, `history.send`, `history.labelYou`, `chat.stop`, `needsYou.retry`, `assistant.edit`, `assistant.working`, `assistant.noResponseText`, `assistant.selectAll`, `assistant.clear`, `assistant.taskScheduleLabel`, `assistant.taskWorkspacesLegend`, `assistant.taskNotificationsLabel`, `assistant.modelSettings`.

---

### Task 1: Dictionary domain `assistant` (~360 keys)

**Files:**
- Modify: `web/src/i18n/en.ts` (append after `history` domain)
- Modify: `web/src/i18n/zh-Hans.ts`, `web/src/i18n/zh-Hant.ts` (mirror)

- [x] Write the `assistant` domain in en.ts in four batches: panel body (activities, action cards, auth, model form, header, errors, settings), queue/thinking/controls, mention composer, task form + task board + proposal card.
- [x] Mirror all keys in zh-Hans.ts and zh-Hant.ts with the established terminology (智能体/智慧代理, 工作区/工作區, 引用/參照, 思考强度/思考強度, 排队/排隊, 单次/單次…).
- [x] Punctuation follows each file's existing conventions: half-width commas/colons/semicolons, full-width question marks in both Chinese files.
- [x] Run `bun run test web/src/i18n/` — 17 pass.

### Task 2: AssistantPanel.tsx (2792 lines) + AssistantQueue/Thinking/ChatControls/MentionComposer/TaskForm

**Files:**
- Modify: `web/src/components/AssistantPanel.tsx`
- Modify: `web/src/components/AssistantQueue.tsx`, `AssistantThinking.tsx`, `AssistantChatControls.tsx`, `AssistantMentionComposer.tsx`, `AssistantTaskForm.tsx`

- [x] `ACTIVITY_LABEL_KEYS` + `activityLabel()` replaces the frozen module-level activity name map; same pattern for the action name/status/field maps.
- [x] Every component calls `useT()` before any early return; the panel's `minimapEntries` useMemo takes `t` as a dependency; the drag-handle querySelector builds its aria-label with `t`.
- [x] Effects that call `setError` use the panel's `t` without adding it to the dependency array (locale switch must not re-run task selection).
- [x] TaskForm keeps `Europe/London` as the timezone placeholder.

### Task 3: AssistantTasks.tsx (812 lines)

**Files:**
- Modify: `web/src/components/AssistantTasks.tsx`

- [x] `taskScheduleLabel` keeps its export and moves to key lookups: `taskScheduleSummaryOnce/Daily` plus the `Every {minutes} minute(s)` one/many pair.
- [x] `TaskProposalCard`: the operation/confirmed/explanation/confirm maps become `PROPOSAL_*_KEYS` constants; the confirm button collapses to one lookup (`proposalConfirmCreate` … `proposalConfirmDelete`).
- [x] Main component: list rows, empty states, overview/details, run history, transcript (Ranger message aria, Working..., No response text), and both confirm dialogs translate.
- [x] `proposalTaskId` interpolates `{ id: proposal.task_id ?? "" }` (create proposals have no task id).

### Task 4: Verification

- [x] `bun run typecheck:quick` — pass.
- [x] `bun run test` over the Assistant suites + `web/src/i18n/` — 27 pass, 2 fail (both `preload not found "/D:/..."`, the pre-existing Windows `new URL().pathname` harness bug; CI covers them).
- [x] Fixed the harness gaps the new hooks exposed: `AssistantPanel.test.ts`'s direct-call test mocks `useSyncExternalStore`; the send button aria reuses `history.send` (value "Send"); the "New chat" button renders `` ` ${t(...)}` `` so the test's `" New chat"` child-node assertion still holds; `thinkingEffortAria` ("Thinking effort") split from `defaultThinkingEffortAria` ("Default thinking effort") because the settings form and the chat controls use different labels.
- [x] `check-en3.ts` over the 7-file diff — 340 removed literals, all present in en.ts (skip list extended with `assistant-` CSS classes and plain lowercase data values).
- [x] `bunx biome format --write` on the 11 hand-edited files.

### Task 5: Delivery

- [x] `changes/i18n-phase1.md` gains the Ranger panel paragraph.
- [x] This plan file.
- [x] Commit as `i18n: translate the Ranger assistant panel (phase 2 module 11)` and push to `feat/i18n-phase1` with `--no-verify` (Windows push hook ENAMETOOLONG).

## Notes

- The panel series is the largest domain so far (~360 keys). The `assistant` domain heading sits between `history` and the `WidenLeaves` type at the end of en.ts.
- Isolated-DOM suites (`"in an isolated DOM runtime"`) cannot run locally on Windows: their harness passes `new URL(...).pathname` as `--preload`, which produces `/D:/...` and fails to load. Unchanged from main; CI runs these suites.
- Status strings on tasks/runs (`queued`, `running`, `waiting`, …) are runtime data values and stay untranslated; the surrounding labels ("Current: {status}", "Run {status}") translate.
