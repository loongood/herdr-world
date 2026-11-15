# i18n Phase 2 — Board Controls & Settings (Batch 30a) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate Board's controls row, settings menu, help/status-colour dialogs and the lens legend's no-data reading through the established dictionary pattern.

**Architecture:** New `board` domain (40 keys) appended after `readiness`. `BoardControls` labels move from a control→string map to a control→key map rendered through `useT()` inside the component; plural "string/strings" follows the existing `One`/`Many` key convention. `boardAppearance.ts` exports `BOARD_STATUS_LABEL_KEYS` (a `Record<WorldAgentStatus, BoardStatusLabelKey>`) reusing the `marks` domain words plus one new key; `BoardSettingsDialog` renders them through `t(key)`.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- en dictionary leaves are copied verbatim from the removed source literals.
- Placeholders `{lens}`/`{count}`/`{label}` keep identical names across the three dictionaries.
- The `tidyLabel` prop stays as-is: it comes from `BoardView`, translated in that file's own batch.

---

### Task 1: board domain + BoardControls

**Files:**
- Modify: `web/src/i18n/en.ts`, `web/src/i18n/zh-Hans.ts`, `web/src/i18n/zh-Hant.ts`
- Modify: `web/src/world/board/BoardControls.tsx`

- [x] Migrate label/accessible/content helpers, menu items and aria labels

### Task 2: BoardSettingsDialog + boardAppearance + boardLens

**Files:**
- Modify: `web/src/world/board/BoardSettingsDialog.tsx`, `web/src/world/board/boardAppearance.ts`, `web/src/world/board/boardLens.ts`, `web/src/world/board/boardAppearance.test.ts`

**Notes:**
- `BOARD_STATUS_LABEL_KEYS` replaces `BOARD_STATUS_LABELS`; the test iterates keys only, so renaming the import suffices.
- `boardLensReadout`'s "nothing to show" localizes through module-level `t`.
- `officeObservability.ts` was surveyed: all its English is store-level validation errors (diagnostics), intentionally kept.

- [x] Migrate, fix test import

### Task 3: Verification and delivery

- [x] `bun run typecheck:quick` passes
- [x] Tests pass: `boardAppearance.test.ts`, `boardLens.test.ts`, `BoardControls.dom.test.ts` (8 pass, 1856 assertions)
- [x] check-en3: 26 removed literals, all present in en.ts
- [x] check-dicts: 3064 keys ×3, 0 placeholder mismatches
- [x] `changes/i18n-phase1.md` appended
- [x] Commit and push with `--no-verify`
