# i18n Phase 2 — Module 27: World navigator misc

Plan for translating the world-navigator surfaces: `useWorldVisualActions`,
`creationRequests`, `HostsControl`, `WorldTerminalPortalList` and
`WorkspaceTree`.

## Goal

Every user-facing string in these surfaces comes from the new
`worldActions`, `creation`, `hosts`, `terminalPortal` and `worldTree`
domains (78 keys total); the three dictionaries stay in sync at 2652
keys.

## Tasks

- [x] Add the five domains to `en.ts`, `zh-Hans.ts`, `zh-Hant.ts`.
- [x] `useWorldVisualActions`: `useT()` at the hook top (with `t` in the
      `useMemo` dependencies); the visual-route action labels become
      `t()` values inside the existing Record; every action
      title/detail/disabledReason/heading and unavailable-reason
      fallback translates. The `creationFailureMessage(error, "Tab")`
      kind argument stays an enum.
- [x] `creationRequests`: module-level `t`; the preparing reason and the
      per-kind creating/uncertain/failed messages move to `creation.*`
      keys (the kind enum resolves inside the functions).
- [x] `HostsControl`: `useT()`; trigger aria/title with `{count}`, the
      menu entries, the add-profile hint and Manage connections.
- [x] `WorldTerminalPortalList`: module-level `t` for the two
      file-browse error strings.
- [x] `WorkspaceTree`: `useT()` in both components (`AgentLayoutControl`
      and `WorkspaceTree`); the layout/scope/sort/grouping selects, the
      headings, empty states and the close-pane confirmation (reusing
      `commands.closePaneNamed`/`closePaneThis` and
      `contextMenu.closeAction`); the sort/group titles pass the
      localized option word as the `{order}`/`{grouping}` parameter.
- [x] `worldCreation.test.ts`: the uncertain-creation assertion uses
      `t("creation.tabUncertain")` as full equality.
- [x] Verify: `bun run typecheck:quick`; 5 test files (19 pass) plus
      `worldCreation.test.ts` after formatting (15 pass); `check-en3`
      on the five surfaces (70 removed literals all present; skip gains
      dotted identifier, host/connection CSS-class patterns);
      `check-dicts` (2652 × 3, 0 placeholder mismatches); biome format.
- [x] Append the changelog sentence to `changes/i18n-phase1.md`, commit
      and push.

## Notes

- `PullRequestCard` and the shared `pullRequests` copy (verb labels,
  consequences, readiness rules, attention) are deliberately deferred
  to the next module: they need web-side wrappers around the
  server-shared module, which is its own reviewable unit.
- `WorkspaceTree`'s connection `state` word renders the raw enum for
  now; the connection-status words belong with the connection surfaces.
