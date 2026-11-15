import { freshPullRequestDetail } from "../../../shared/pullRequestFreshness";
import {
  actionablePullRequest,
  type PullRequestReviewer,
  type PullRequestVerb,
  pullRequestReadiness,
  type ReadinessRule,
  type ReadinessRuleId,
  shortSha,
} from "../../../shared/pullRequests";
import type { WorkItem } from "../../../shared/worldSources";
import { t } from "../i18n";

/**
 * Web-side copy for the shared pull-request evidence. The shared module
 * serves the server too, so it keeps its English sentences; these wrappers
 * re-render the same decisions through the dictionary.
 */

const VERB_KEYS: Record<
  PullRequestVerb,
  "pr.verbMerge" | "pr.verbClose" | "pr.verbReady"
> = {
  merge: "pr.verbMerge",
  close: "pr.verbClose",
  ready: "pr.verbReady",
};

export const prVerbLabel = (verb: PullRequestVerb) => t(VERB_KEYS[verb]);

const VERB_DONE_KEYS: Record<
  PullRequestVerb,
  "pr.mergedDone" | "pr.closedDone" | "pr.markedReadyDone"
> = {
  merge: "pr.mergedDone",
  close: "pr.closedDone",
  ready: "pr.markedReadyDone",
};

export const prVerbDone = (verb: PullRequestVerb) => t(VERB_DONE_KEYS[verb]);

/** What the confirm sheet says will happen. */
export const prVerbConsequence = (item: WorkItem, verb: PullRequestVerb) => {
  const ref = `#${item.number ?? "?"}`;
  if (verb === "close") return t("pr.consequenceClose", { ref });
  if (verb === "ready") return t("pr.consequenceReady", { ref });
  return t("pr.consequenceMerge", {
    ref,
    base: item.pr?.baseRef ?? t("pr.baseBranch"),
    sha: shortSha(item.headSha ?? ""),
  });
};

/** World never bypasses branch protection; the blocked words stay factual. */
export const prMergeUnavailable = (item: WorkItem): string | null => {
  if (!actionablePullRequest(item)) return t("pr.notActionable");
  if (item.review === "review_required") return t("pr.reviewRequired");
  if (item.review === "changes_requested") return t("pr.changesRequested");
  return null;
};

/** `rev2 确认于 1a2b3c4 · 其后 2 个提交`。 */
export const prConfirmedAt = (entry: PullRequestReviewer) => {
  if (!entry.reviewer) return t("pr.confirmedAtUnknown");
  if (!entry.commit)
    return t("pr.confirmedHeadUnknown", { reviewer: entry.reviewer });
  const since =
    entry.commitsSince === null
      ? t("pr.confirmedHeadChanged")
      : entry.commitsSince === 1
        ? t("pr.commitsSinceOne", { count: entry.commitsSince })
        : t("pr.commitsSinceMany", { count: entry.commitsSince });
  return t("pr.confirmedAt", {
    reviewer: entry.reviewer,
    sha: shortSha(entry.commit),
    since,
  });
};

const RULE_LABEL_KEYS: Record<
  ReadinessRuleId,
  | "pr.ruleDraft"
  | "pr.ruleFindings"
  | "pr.ruleChecks"
  | "pr.ruleMergeable"
  | "pr.ruleScreenshots"
> = {
  draft: "pr.ruleDraft",
  findings: "pr.ruleFindings",
  checks: "pr.ruleChecks",
  mergeable: "pr.ruleMergeable",
  screenshots: "pr.ruleScreenshots",
};

const ruleDetail = (item: WorkItem, rule: ReadinessRule, now: number) => {
  const detail = freshPullRequestDetail(item, now) ? item.pr : undefined;
  switch (rule.id) {
    case "draft":
      return item.draft ? t("pr.draftFail") : t("pr.draftPass");
    case "findings": {
      if (!freshPullRequestDetail(item, now)) return t("pr.findingsStale");
      const reviewers = item.pr?.reviewers;
      if (!reviewers) return t("pr.findingsUnread");
      if (!reviewers.length) return t("pr.findingsNone");
      const open = reviewers.filter((entry) => entry.outcome === "open");
      if (open.length)
        return open
          .map((entry) =>
            t("pr.findingsOpen", {
              reviewer: entry.reviewer ?? t("pr.unknownReviewer"),
              line: entry.line,
            }),
          )
          .join("; ");
      const unread = reviewers.filter(
        (entry) => entry.outcome === "unknown" || !entry.reviewer,
      );
      if (unread.length)
        return unread.some((entry) => !entry.reviewer)
          ? t("pr.findingsAttribution")
          : t("pr.findingsCantRead", {
              names: unread.map((entry) => entry.reviewer).join(", "),
            });
      // A confirmation of an older head says nothing about what came after.
      const stale = reviewers.filter(
        (entry) => entry.commit !== item.headSha || entry.commitsSince !== 0,
      );
      if (stale.length) return stale.map(prConfirmedAt).join("; ");
      return t("pr.confirmedAll", {
        names: reviewers.map((entry) => entry.reviewer).join(", "),
      });
    }
    case "checks": {
      if (item.checks === "pass") return t("pr.checksAllPassed");
      const failing = detail?.checks.filter((check) => check.state === "fail");
      const running = detail?.checks.filter(
        (check) => check.state === "pending",
      );
      if (item.checks === "fail")
        return failing?.length
          ? t("pr.checksFailing", {
              count: failing.length,
              names:
                failing
                  .slice(0, 3)
                  .map((check) => check.name)
                  .join(", ") + (failing.length > 3 ? ", …" : ""),
            })
          : t("pr.checksFailed");
      if (item.checks === "pending")
        return running?.length
          ? t("pr.checkRunning", { count: running.length })
          : t("pr.checksRunningOne");
      return t("pr.checksNone");
    }
    case "mergeable":
      return item.mergeable === "mergeable"
        ? t("pr.mergeablePass")
        : item.mergeable === "conflicting"
          ? t("pr.mergeableConflicts", {
              base: detail?.baseRef ?? t("pr.baseBranch"),
            })
          : t("pr.mergeableChecking");
    case "screenshots": {
      if (!detail || detail.uiChange === null) return t("pr.screenshotsUnread");
      if (!detail.uiChange) return t("pr.screenshotsNotUi");
      return detail.images
        ? detail.images === 1
          ? t("pr.imagesOne", { count: detail.images })
          : t("pr.imagesMany", { count: detail.images })
        : t("pr.screenshotsMissing");
    }
  }
};

/** The shared rules with their label and detail words re-rendered. */
export const prReadinessRules = (
  item: WorkItem,
  now = Date.now(),
): ReadinessRule[] =>
  pullRequestReadiness(item, now).map((rule) => ({
    ...rule,
    label: t(RULE_LABEL_KEYS[rule.id]),
    detail: ruleDetail(item, rule, now),
  }));
