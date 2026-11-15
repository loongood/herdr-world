# i18n Phase 2 — Module 26: Window surfaces

Plan for translating the window-family surfaces: `WindowControls`,
`WindowBackButton`, `MinimizedWindowDock`, `WindowArrangementMenu`,
`CommandCombobox`'s arrangement actions, `terminalWindowArrangement`
diagnostics, `InterestButton` and `ContextMenu`.

## Goal

Every user-facing string in the window surfaces comes from the new
`interest`, `window` and `contextMenu` domains (111 keys total); the
three dictionaries stay in sync at 2577 keys.

## Tasks

- [x] Add `interest` (13 keys), `window` (68 keys) and `contextMenu`
      (29 keys) to `en.ts`, `zh-Hans.ts`, `zh-Hant.ts`.
- [x] `InterestButton`: `INTEREST_CHOICES` becomes a plain `Interest[]`
      id list; new exported `interestLabel()`/`interestHint()` switches
      (module-level `t`); `useT()` in the component; the held-quiet
      suffix and `Interest: {label}` aria become keys.
- [x] `WindowControls`: the label default becomes
      `t("window.defaultName")`; `fitChoices`/`choices` become
      functions; every aria/title concatenation is a parameterized key
      (`{name}`); attention items reuse the `interest` keys; the Town
      desk pin and its tooltip translate; the colour button reuses
      `inspector.colourLabel`.
- [x] `MinimizedWindowDock`: `dockAria` and `restoreNamed {name}`.
- [x] `WindowArrangementMenu`: the choice constants drop their
      `label`/`description` fields; new exported
      `arrangementLabel()`/`arrangementDescription()` switches feed the
      menu and the Actions palette; "Arrange windows" is one key.
- [x] `CommandCombobox`: consumes the new label/description functions;
      search keywords use the English command id so English queries keep
      matching; `CommandCombobox.test.ts` asserts `command` ids.
- [x] `terminalWindowArrangement`: the 13 unavailable reasons move to
      `window.stageTooSmall*` and friends (module-level `t`); the
      unit test asserts via `t("window.activeUnavailable")`.
- [x] `ContextMenu`: reuses the `commands` dialog keys (new-worktree,
      rename, remove/close confirmations) and `inspector.linkedWorktree`;
      new `contextMenu.*` keys for the menu items, groups and header;
      the `useEffect` timer renames to avoid shadowing `t`; `useT()`
      before the early return.
- [x] Verify: `bun run typecheck:quick`; 7 window test files (55 pass;
      the isolated-DOM WindowControls case fails locally before and
      after this change — CI runs it); `check-en3` on the seven
      surfaces (196 removed literals all present; skip gains
      `Unassigned`, CSS-class, data-attribute, shortcut-id and
      snap-target patterns); `check-dicts` (2577 × 3, 0 placeholder
      mismatches); biome format.
- [x] Append the changelog sentence to `changes/i18n-phase1.md`, commit
      and push.

## Notes

- The palette's arrangement `keywords` keep English by passing the
  command id (`"single"`, `"fit-right"`, …), matching the established
  English-keywords rule.
- "Unassigned" stays verbatim until the shortcuts module lands.
