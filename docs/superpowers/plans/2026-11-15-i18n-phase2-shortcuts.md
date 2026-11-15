# i18n Phase 2 — Keyboard Shortcut Catalog, Cheat Sheet & Lookup Dialog (Batch 30c) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the shortcut catalog, the cheat sheet and the shortcut lookup dialog (presets, recording, editor, navigation reference).

**Architecture:** One new `shortcuts` dictionary domain (121 keys) appended after `gitHistory`. The catalog's descriptions become `[id, labelKey, groupKey, count?]` tuples whose label/group are dictionary keys typed via `Extract<TranslationKey, \`shortcuts.label${string}\`>`; a module-level `shortcutLabel(item)` helper interpolates the numbered tab/command entries' `{count}`. `shortcutCheatSheet()` resolves labels/groups to text at build time (search matches the current language). Mobile shortcut key-cap data (`mobileTerminalShortcuts.ts`) stays: its labels are keyboard notation and take part in equality checks.

**Tech Stack:** Bun, TypeScript, React, biome.

## Global Constraints

- en dictionary leaves are copied verbatim from the removed source literals.
- Placeholders `{count}`/`{platform}`/`{name}`/`{base}`/`{label}`/`{labels}` keep identical names across the three dictionaries.
- Key caps (`Ctrl+Alt+K`, `PgUp`, `C-c`), `SHORTCUT_PLATFORMS` values (macOS / Windows / Linux) and the `Ctrl+Alt+K` input placeholder stay as keyboard notation.
- The `conflictUsedBy` message resolves conflicting entries through `shortcutLabel`, not the raw key.

---

### Task 1: dictionary domain

**Files:**
- Modify: `web/src/i18n/en.ts`, `web/src/i18n/zh-Hans.ts`, `web/src/i18n/zh-Hant.ts`

- [x] Append 83 catalog/sheet keys + 38 lookup-dialog keys ×3 after `gitHistory`; check-dicts reports 3308×3, 0 placeholder mismatches

### Task 2: catalog keying

**Files:**
- Modify: `web/src/shortcutCatalog.ts`

- [x] Rewrite descriptions as key tuples; export `shortcutLabel`; types derived from `TranslationKey`

### Task 3: cheat sheet + lookup dialog

**Files:**
- Modify: `web/src/shortcutCheatSheet.ts`, `web/src/components/ShortcutCheatSheet.tsx`, `web/src/components/ShortcutLookupDialog.tsx`

- [x] Cheat sheet resolves `item.group`/`item.label` through `t`/`shortcutLabel`; numbered ranges through `numberedRangeKeys`
- [x] Cheat sheet dialog: title, preset line, filter, unassigned/or/no-matching, footer
- [x] Lookup dialog: all headings, preset actions, delete confirmation, detected/mismatch notes, editor (record/save/unassign/default/cancel), notes, navigation reference, footer

### Task 4: Verification and delivery

- [x] `bun run typecheck:quick` passes
- [x] Tests pass: `shortcutCheatSheet.test.ts`, `shortcutBindings.test.ts` (46 pass, 522 assertions; re-run after formatting: 46 pass)
- [x] check-en3: 151 removed literals, all present in en.ts (shortcut ids excluded as data keys)
- [x] check-dicts: 3308 keys ×3, 0 placeholder mismatches
- [x] biome check clean on all touched files
- [x] `changes/i18n-phase1.md` appended
- [x] Commit and push with `--no-verify`
