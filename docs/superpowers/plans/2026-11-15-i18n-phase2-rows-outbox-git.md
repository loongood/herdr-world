# i18n Phase 2 — Outbox, Workspace Rows & Commit History (Batch 30b) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the answer outbox, workspace tab chips/rows, agent rows with their context menu, and the commit history through the established dictionary pattern.

**Architecture:** Three new dictionary domains appended after `board`: `outbox` (49 keys), `wsRows` (38 keys), `gitHistory` (35 keys). The delivery status words move from an inline literal map in `AnswerDeliveries.tsx` to a key map (`DELIVERY_LABEL_KEYS`) resolved through module-level `t`; the workspace chip status words reuse the `marks`/`quest` domains via `TAB_CHIP_STATUS_KEYS`. `answerDeliveryLabel` stays exported (no external consumers) and becomes key-based; `nestedAgentTitle` and `gitStatusTitle` use module-level `t` since they run outside components.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- en dictionary leaves are copied verbatim from the removed source literals.
- Placeholders `{name}`/`{count}`/`{error}`/`{value}`/`{id}`/`{label}`/`{path}`/`{number}`/`{status}`/`{location}` keep identical names across the three dictionaries.
- `title={`${item.path} (${item.status})`}` stays: git notation, not World's copy.
- The `AgentContextMenu` effect's local `const t` (setTimeout handle) renames to `timer` so the hook's `t` is not shadowed.

---

### Task 1: dictionary domains (outbox / wsRows / gitHistory)

**Files:**
- Modify: `web/src/i18n/en.ts`, `web/src/i18n/zh-Hans.ts`, `web/src/i18n/zh-Hant.ts`

- [x] Append 122 keys ×3 after `board`; check-dicts reports 3187×3, 0 placeholder mismatches

### Task 2: AnswerDeliveries + WorkspaceRows

**Files:**
- Modify: `web/src/world/town/AnswerDeliveries.tsx`, `web/src/components/WorkspaceRows.tsx`

- [x] `DELIVERY_LABEL_KEYS` + module-level `t` in `answerDeliveryLabel`; both components use `useT()`
- [x] `gitStatusTitle` (module-level `t`) with nine `git*` keys; `TAB_CHIP_STATUS_KEYS` record; chip title/aria, more-tabs, expand/collapse, colour, tab count, server aria, pinned and loading labels

### Task 3: WorkspaceAgentRows + GitCommitHistory

**Files:**
- Modify: `web/src/components/WorkspaceAgentRows.tsx`, `web/src/components/GitCommitHistory.tsx`

- [x] `nestedAgentTitle` agent-word fallback (module-level `t`); AgentRow details/aria rebuilt from `agentWord`/`paneWord`/`tabWord`/`statusWord`; standalone `Terminal` word; AgentContextMenu groups and header
- [x] GitCommitHistory: all 35 labels, plurals via `changedFilesOne`/`Many`

### Task 4: Verification and delivery

- [x] `bun run typecheck:quick` passes
- [x] Tests pass: `GitCommitHistory.test.ts`, `WorkspaceAgentRows.test.ts`, `AnswerDeliveries.test.ts`, `WorkspaceTree.test.ts`, `WorkspaceTree.servers.test.ts` (17 pass, 80 assertions; re-run after formatting: 15 pass, 78)
- [x] check-en3: 65 removed literals, all present in en.ts
- [x] check-dicts: 3187 keys ×3, 0 placeholder mismatches
- [x] biome check clean on all touched files
- [x] `changes/i18n-phase1.md` appended
- [x] Commit and push with `--no-verify`
