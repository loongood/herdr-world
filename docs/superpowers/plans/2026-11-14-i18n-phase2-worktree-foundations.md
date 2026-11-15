# i18n Phase 2 — Module 25a: Worktree foundations

Plan for translating the non-component worktree layer: `gitActions.ts`,
`worktreeLifecycle.ts`, the batch-action notice in `store.ts`, and their
tests.

## Goal

The shared Git action menus, confirmations, success notices, lifecycle
summaries and auto-sync labels come from the new `worktree` domain
(64 keys); module-level `t()` keeps every call site unchanged because the
functions re-read the locale on each call.

## Tasks

- [x] Add the `worktree` domain (64 keys) to `en.ts`, `zh-Hans.ts` and
      `zh-Hant.ts` with placeholder parity; reuse the established terms
      暂存/取消暂存, 放弃/放棄, 检出/檢出, 工作树/工作樹 and the
      Hans “此操作无法撤销。” / Hant 「此操作無法復原。」 closing.
- [x] Migrate `gitActions.ts`: menu builders (singular/plural pairs), repo
      menu, success notices, action labels, and the three confirmation
      families (`{path}`- and `{files}`-parameterized message templates,
      `oneFile`/`fileCount` count pair).
- [x] Migrate `worktreeLifecycle.ts`: bare-repo fallback, git summary
      (`openToLoadStatus`, `statusUnavailable`, `changedShort`,
      `noLocalChanges`, `aheadShort`, `behindShort`), removal errors
      (`cleanupFailed`, `removalIncomplete`), auto-sync labels
      (`autoSyncInterval` takes `{minutes}`), hook failure and stop
      notices. "Detached HEAD" stays verbatim (Git term).
- [x] Migrate the batch notice in `store.ts`
      (`worktree.batchNotice` with `oneFile`/`fileCount`).
- [x] Update `gitActions.test.ts` and `worktreeLifecycle.test.ts`:
      English-literal assertions become `t()` expectations; template
      messages asserted with full `t(...)` equality.
- [x] Verify: `bun run typecheck:quick`; `gitActions.test.ts` +
      `worktreeLifecycle.test.ts` (23 pass); `check-en3` on the three
      migrated files (58 removed literals all present); `check-dicts`
      (2282 keys × 3, 0 mismatches); biome format.
- [x] Append the changelog sentence to `changes/i18n-phase1.md`, commit and
      push.

## Notes

- Dialog components consuming these helpers
  (`WorktreeLifecycleDialog`, `WorktreeLifecycleRow`, …) are module 25b.
- Hant keeps 「」 corner quotes; Hans keeps “ ” curly quotes.
