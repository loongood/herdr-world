# i18n Phase 2 — Module 25b: Worktree dialogs

Plan for translating the worktree dialog components:
`WorktreeLifecycleDialog`, `WorktreeLifecycleRow`,
`WorktreePullRequestBadge`, `WorktreeHooksDialog`,
`AutoSyncRepositoriesDialog`, `WorkspaceAutoSyncDialog`,
`AgentWorktreePicker` and `WorktreeLocationDialog`.

## Goal

Every user-facing string in the eight worktree components comes from
`worktree.*` keys (184 total in the domain after this module); the three
dictionaries stay in sync.

## Tasks

- [x] Add the component keys to `en.ts`, `zh-Hans.ts`, `zh-Hant.ts`:
      pull-request badge states and stale details, row actions and
      operation labels, hook names and the hooks note (three-segment
      `hooksNoteBefore/Middle/After` around the two `<code>` names),
      lifecycle dialog headings, policies, overviews, dialogs and removal
      confirmations, auto-sync repository/workspace labels and statuses,
      and the agent worktree picker/gate strings.
- [x] `WorktreePullRequestBadge`: replace the module-level `labels`
      Record with a `prStateLabel()` switch (module-level `t`); `useT()` in
      the component; "Detached HEAD" stays verbatim; the refresh-failed
      sentence splits around the `<time>` element.
- [x] `WorktreeHooksDialog`: `HOOKS` becomes a plain hook-name array; the
      label is selected per name inside the render map; `useT()` before the
      early return.
- [x] `WorktreeLifecycleDialog`: command-template dialog labels pass the
      literal placeholders as parameters
      (`t("worktree.commandTemplateLabel", { path: "{path}", ... })` so the
      hint text keeps `{path}` verbatim); reuse `diff.retry` for the Retry
      button; `useT()` at the top of the component.
- [x] `AutoSyncRepositoriesDialog` / `WorkspaceAutoSyncDialog`: module-level
      `statusLabel()`/`formatLastRun()` helpers use module-level `t`;
      components add `useT()`.
- [x] `AgentWorktreePicker`: `useT()` in all three exported components;
      the `{count} worktrees · choose` and `Viewing {path}` lines become
      parameterized keys; `AGENT_WORKTREE_SOURCE_LABELS` (shared with the
      server) stays English.
- [x] Verify: `bun run typecheck:quick`; `WorktreePullRequestBadge.test.ts`
      + `AgentWorktreePicker.test.ts` (6 pass — renderToStaticMarkup tests
      stay on the default en locale, no assertion changes); `check-en3` on
      the eight components (136 removed literals all present; skip gains
      `^lifecycle-[a-z-]+$` for CSS classes and `^Detached HEAD$`);
      `check-dicts` (2466 keys × 3, 0 placeholder mismatches); biome
      format.
- [x] Append the changelog sentence to `changes/i18n-phase1.md`, commit and
      push.

## Notes

- `WorktreeLifecycleDialog.test.ts` is an isolated-DOM suite (spawned
  subprocess, default en locale) — its `click("Files")` /
  `toBe("Open")` assertions keep working unchanged; it runs in CI.
- Hant keeps 「」 corner quotes; Hans keeps “ ” curly quotes.
