# i18n Phase 2 — Connection Switcher (Module 20, ConnectionSwitcher + browserTransport + connectionProfiles)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the connection switcher menu, its manage-connections dialog, both profile forms, and the browser-transport status into Simplified and Traditional Chinese.

**Architecture:** Add a `connections` dictionary domain (~106 keys). Three module-level helpers (`browserTransportPresentation`, `connectionLifecycleLabel`, `connectionTypeLabel`, `connectionErrorDetail`) switch to the module-level `t` with unchanged signatures, so every caller follows the locale. The five components in ConnectionSwitcher.tsx get `const t = useT()`.

**Tech Stack:** TypeScript, React, the existing `web/src/i18n` dictionary.

## Global Constraints

- The three dictionaries keep identical key sets; placeholders must match.
- Never translate socket paths, example identifiers (`local-dev`, `my-branch`-style), SSH/OpenSSH terms, or option values (`unix`, `windows`).
- The `windowsNote`/`unixNote` strings keep their trailing space so the following auth note joins with one space.

---

### Task 1: Add the `connections` dictionary domain

- [x] Keys: browser transport (statuses, pause/resume/reconnect, other-browser counts, local/shared navigation + detail tooltips), local/SSH form titles and fields, security notes (windows/unix/auth), manager dialog (title, badges, path labels with `{value}`, policy words, action buttons + notices, remove confirmation + default-connection help), switcher (aria labels, selection notices, manage button), lifecycle/type/error words.
- [x] zh-Hans (套接字/凭据) and zh-Hant (通訊端/憑證/金鑰/通關密語/鑰匙圈) sync; "Windows" and "SSH" stay as-is.

### Task 2: Migrate the module-level helpers

- [x] `connectionProfiles.ts`: lifecycle switch returns `t(...)`, `connectionTypeLabel` keeps `"SSH"` and translates `"Local"`, `connectionErrorDetail` fallback translates.
- [x] `browserTransport.ts`: all four labels and both pause labels translate (`pauseOtherBrowsers ({count})`); the browser-count template in BrowserTransportStatus uses `clientsOne`/`clientsMany`.
- [x] Existing tests keep their English assertions: the initial dictionary is `en`, so they still pass.

### Task 3: Migrate ConnectionSwitcher.tsx

- [x] All five components get `useT`; forms, manager dialog, switcher menu, notifications and aria labels read the dictionary; `removeDefaultHelp` becomes one key (an earlier `Set default` blanket replace had touched its prose — fixed).
- [x] Untouched: option values, DOM ids (`connection-manager-title`), the `pending` sentinel `test-form`, example paths/placeholders that are paths, `Windows` option label.

### Task 4: Verify and land

- [x] `bun run typecheck:quick` passes (two script slips fixed: doubled commas in the notify messages, and `ssh_destination` needing `?? ""` for the t() param).
- [x] Focused tests: connectionProfiles + browserTransport + i18n — 33 pass, 0 fail.
- [x] Diff-vs-main literal audit over the three files: 66 removed literals, all present in `en.ts`; skip regex gained `^test-form$` and `connection-manager-title`.
- [x] Three-dictionary check: 1953 keys each, 0 diffs, 0 placeholder mismatches.
- [x] `bunx biome format --write`; typecheck re-run.
- [x] Changelog fragment updated; commit and push to `feat/i18n-phase1`.

## Deliberately untranslated

- Socket paths and path-shaped placeholders, example ids, option values, SSH/OpenSSH proper nouns, "Windows".
