# i18n Phase 2 Module 8 — Needs you

Part of the i18n design (`docs/superpowers/specs/2026-11-14-i18n-design.md`),
phase 2 module 8. Executes inline per the established per-module workflow
(follows modules 1–7, committed through `514a0b5d`).

## Scope

Migrate the Needs you surfaces to the dictionary:

- `web/src/world/NeedsYouItem.tsx` — counter, handle, waiting list and the
  per-item card (question, quick replies, typed answer, attachments,
  conversation history, marks buttons, error notes).
- `web/src/world/NeedsYouAttachments.tsx` — attachment chip states and
  upload fallbacks in the hook.
- `web/src/world/NeedsYouTab.tsx` — tab counter, host grouping, list
  headers and the outbox route.

`NeedsYouCard.browser.tsx` is a test fixture asserting the English UI, not a
browser-variant production file — it stays untouched and keeps passing under
the default English locale.

## Dictionary

New `needsYou` domain in `en.ts` (66 keys), mirrored in `zh-Hans.ts` /
`zh-Hant.ts`: unverified suffix and tags, open-window / follow-up labels,
item aria words, show-more/less, answer length limit message, dismiss and
conversation labels, send states (waiting, retry, reviewed marks), upload
failure notes with percent/size, counter and outbox aria (singular/plural
split: `outboxAriaOne` / `outboxAriaMany`), count-waiting empty states and
show-before/show-more pagination.

Reused from the `chat` domain: `chat.openTerminal`, `chat.loadingConversation`,
`chat.youAnswered`.

## Component pattern

- Components render with `const t = useT();` so a locale switch re-renders.
- The `useAnswerAttachments` hook's fallbacks call the imported `t()`
  directly (no locale subscription inside the hook state; the chips
  re-render via `useT`).
- `answerTooLong` interpolates `ANSWER_MAX_LENGTH`.

## Verification

- `bun run typecheck:quick` — pass.
- Focused suites: needsYou / askAttachments / worldAsks / i18n (30 pass),
  townSummary / needsYouPage / sinceYouLeft (19 pass),
  needsYouAnswers / needsYouAttachments (2 pass).
- English-literal audit (`check-en3.ts` on the three files): 44 removed
  literals, all present in `en.ts` (only residual "upload failed" lowercase
  fallback normalized to `needsYou.uploadFailed`).
- Template-string compositions manually reviewed (who + unverified suffix,
  folded outbox line, aria compositions) — structure preserved, words
  keyed.
- `bunx biome format --write` on the three files and three dictionaries.

Changelog: `changes/i18n-phase1.md` (Needs you paragraph).
