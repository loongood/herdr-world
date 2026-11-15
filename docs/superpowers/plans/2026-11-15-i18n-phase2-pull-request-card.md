# i18n Phase 2 — Module 28: Pull request card

Plan for translating the pull-request card family: `PullRequestCard`,
`PullRequestDetailHealth`, the shared pull-request copy the card renders,
and the attention words.

## Goal

Every user-facing string in the card comes from the new `pr` domain
(112 keys); the server-shared `shared/pullRequests.ts` keeps its English
sentences and the browser re-renders them through a web-side wrapper.
The three dictionaries stay in sync at 2764 keys.

## Tasks

- [x] Add the `pr` domain to `en.ts`, `zh-Hans.ts`, `zh-Hant.ts`: the
      summary row, CI dots, readiness rules with all their details,
      reviewer evidence and the reviews note, merge verbs, running/done
      words, consequences, blocked-merge reasons, confirm sheet, detail
      health and the attention words (English copied verbatim from the
      source so the existing tests keep passing).
- [x] New `web/src/world/prCopy.ts`: `prVerbLabel`, `prVerbDone`,
      `prVerbConsequence`, `prMergeUnavailable`, `prConfirmedAt` and
      `prReadinessRules` — the wrappers keep the shared decisions (state
      comes from `pullRequestReadiness`) and re-render only the words.
- [x] `pullRequestAttention`: the attention now carries the agent labels
      (`PrAttention`), so the card can rebuild the stalled reason in the
      viewer's language instead of using the shared English sentence.
- [x] `PullRequestCard`: `useT()` in all seven components; the summary
      row, dots, readiness, checks, reviews, merge command, confirm
      sheet and card aria labels all translate; the merge/ready/close
      buttons keep the `…` suffix by concatenation (`${t("pr.verbMerge")}…`).
- [x] `PullRequestDetailHealth`: `useT()`; the health words, the read
      time and the refresh button translate.
- [x] Tests: the two fixture attention objects gain `agents: []`; the
      other assertions hold verbatim because the English dictionary
      copies the source text exactly.
- [x] Verify: `bun run typecheck:quick`; the four card test files
      (7 pass); `check-en3` on the two surfaces (46 removed literals
      all present; the three `…`-suffixed buttons are concatenations);
      `check-dicts` (2764 × 3, 0 placeholder mismatches); biome
      format and organize-imports.
- [x] Append the changelog sentence to `changes/i18n-phase1.md`, commit
      and push.

## Notes

- `components/PullRequestCard.tsx` is a different component (the
  connection-scoped pull-request panel on `shared/pullRequest`); it
  belongs to the connection surfaces, not this module.
- `shared/pullRequests.ts` stays untouched: the server renders those
  sentences. If the server ever needs the same words localized, that is
  a shared-copy decision for phase 3.
- `WorkLens`'s own strings (tabs, columns, headings) remain for the
  Board module.
