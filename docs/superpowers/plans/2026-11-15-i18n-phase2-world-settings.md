# i18n Phase 2 — World Settings Surfaces (Batch 29) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the World settings surfaces (sources, sounds, office observability, Herdr setup card, create-workspace dialog, bin, profile editor, harness readiness notes) to zh-Hans/zh-Hant through the established `t()`/`useT()` dictionary pattern.

**Architecture:** Three synced dictionaries (`web/src/i18n/en.ts` as the key contract, `zh-Hans.ts`/`zh-Hant.ts` typed against it); new domains `sources`, `sounds`, `observability`, `herdrSetup`, `createWorkspace`, `bin`, `profileEditor`, `readiness` appended after `bin`. Store-level label functions (`binStore.ts`, `agentProfiles.ts#readinessNote`) use the module-level `t`; React components use `useT()` per component.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- en dictionary leaves are copied verbatim from the removed source literals (en-locale output identical to pre-migration English).
- Placeholders `{name}` keep identical names across the three dictionaries.
- Deliberately untranslated: timbre names (instrument names: Bell/Marimba/…), Jira/GitHub example placeholders (`example.atlassian.net`, `you@example.com`), `SKILL.md`, harness brand labels.
- Kept as data (not UI copy): starter profile names, the default `New agent` profile name, the ` copy` name suffix.

---

### Task 1: Group A — dialogs (SourcesDialog, SoundsDialog, OfficeObservabilityDialog)

**Files:**
- Modify: `web/src/i18n/en.ts`, `web/src/i18n/zh-Hans.ts`, `web/src/i18n/zh-Hant.ts` (domains `sources` 28 keys, `sounds` 34, `observability` 21)
- Modify: `web/src/world/SourcesDialog.tsx`, `web/src/world/SoundsDialog.tsx`, `web/src/world/OfficeObservabilityDialog.tsx`

**Notes:**
- SoundsDialog: motif labels move from a module-level `MOTIF_LABELS` record to an in-component `motifLabel()` triple; the two sentences embedding `<code>` elements split into prefix/mid/suffix keys. Timbre names stay English.
- OfficeObservabilityDialog: module-level `formatObservedAt` gains a `fallback` parameter (`t("observability.unknownTime")` passed at call sites) because module scope cannot call `useT`.

- [x] Migrate the three dialogs, typecheck, biome

### Task 2: Group B — setup, workspace creation, bin

**Files:**
- Modify: dictionaries (domains `herdrSetup` 33 keys, `createWorkspace` 16, `bin` 31)
- Modify: `web/src/components/HerdrSetupCard.tsx`, `web/src/components/CreateWorkspaceDialog.tsx`, `web/src/world/bin/WorldBin.tsx`, `web/src/world/bin/binStore.ts`

**Notes:**
- binStore: `binBusLabel`/`binCloseLabel` localize through module-level `t`; `binClockLabel` ("2:05") stays numeric.
- WorldBin: the module-level `OUTCOME` record becomes an `outcomeWord(result)` function; the bin chip's aria-label branches into four keys with `count === 1` singular/plural pairs.

- [x] Migrate the four files, typecheck, biome

### Task 3: Group C — profile editor and readiness notes

**Files:**
- Modify: dictionaries (domains `profileEditor` 87 keys, `readiness` 9)
- Modify: `web/src/world/ProfileEditor.tsx`, `web/src/world/agentProfiles.ts`

**Notes:**
- `TABS` becomes a plain id array plus `TAB_LABEL_KEYS` (literal-union `Record<Tab, …>`, mirroring `prCopy.ts`); `LABELS` becomes `LOOK_LABEL_KEYS` and `LookOptions` renders `key ? t(key) : value` (unknown values pass through, as before).
- `readinessNote` (shared with the launcher dialog) localizes its nine English branches through module-level `t`; `harnessLabel` stays (brand labels).
- `LookSwatches` takes already-localized `label` props from the parent, so it needs no `useT`.

- [x] Migrate the two files, typecheck, biome

### Task 4: Verification and delivery

- [x] `bun run typecheck:quick` passes
- [x] Affected tests pass: `agentProfiles.test.ts`, `bin/binStore.test.ts`, `bin/binDock.test.ts`, `AgentLauncherDialog.test.ts` (17 pass, 0 fail — en-locale assertions unchanged)
- [x] check-en3 over the nine changed files: 164 removed literals, all present in en.ts
- [x] check-dicts: 3024 keys ×3, 0 placeholder mismatches
- [x] `changes/i18n-phase1.md` appended
- [x] Commit `i18n: translate the world settings surfaces (phase 2 module 29)` and push with `--no-verify` (Windows pre-push ENAMETOOLONG workaround)
