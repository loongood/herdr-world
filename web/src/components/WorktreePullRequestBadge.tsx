import {
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  GitPullRequestClosed,
} from "lucide-react";
import type { workspacePullRequest } from "../workspaceTreeBadges";
import type { PullRequestSummary } from "../../../shared/pullRequest";
import { t, useT } from "../i18n";
import "./WorktreePullRequestBadge.css";

function prStateLabel(state: PullRequestSummary["state"]): string {
  switch (state) {
    case "ready":
      return t("worktree.prUnknown");
    case "select_remote":
      return t("worktree.prSelectRemote");
    case "select_match":
      return t("worktree.prMultipleMatches");
    case "unsupported":
      return t("worktree.prUnsupported");
    case "missing_cli":
      return t("worktree.prMissingCli");
    case "unauthenticated":
      return t("worktree.prAuthUnavailable");
    case "no_match":
      return t("worktree.prNoMatch");
    case "detached":
      return "Detached HEAD";
    case "error":
      return t("worktree.prErrorState");
  }
}

export function WorktreePullRequestBadge({
  status,
}: {
  status?: PullRequestSummary;
}) {
  const t = useT();
  const request = status?.state === "ready" ? status.request : undefined;
  const state = request?.state;
  const label =
    state === "merged"
      ? t("worktree.prMerged")
      : state === "closed"
        ? t("worktree.prClosedNoMerge")
        : state === "open" || state === "opened"
          ? request?.draft
            ? t("worktree.prDraft")
            : t("worktree.prOpen")
          : status
            ? prStateLabel(status.state)
            : t("worktree.prLoading");
  const provider = status?.provider
    ? status.provider === "github"
      ? "PR"
      : "MR"
    : "PR/MR";
  const stale = request ? status?.stale : undefined;
  const text = `${provider}${request ? ` #${request.number}` : ""}: ${label}${stale ? t("worktree.prLastKnownSuffix") : ""}`;
  return (
    <details className="worktree-review">
      <summary
        className="badge worktree-review-badge"
        data-state={state}
        data-stale={stale ? true : undefined}
      >
        {text}
      </summary>
      <div className="worktree-review-detail">
        {request?.title ?? status?.message ?? label}
        {stale ? (
          <span>
            {stale.failedAt ? (
              <>
                {t("worktree.prRefreshFailedBefore")}{" "}
                <time dateTime={stale.failedAt}>
                  {new Date(stale.failedAt).toLocaleString()}
                </time>
                {t("worktree.prRefreshFailedAfter")}
              </>
            ) : (
              (stale.message ?? t("worktree.prStaleRefreshing"))
            )}
          </span>
        ) : null}
        {request ? (
          <a href={request.url} target="_blank" rel="noopener noreferrer">
            {t("worktree.prOpenProvider", {
              provider,
              number: request.number,
            })}
          </a>
        ) : null}
        {status ? (
          <time dateTime={status.refreshedAt}>
            {stale
              ? t("worktree.prLastSuccessCheck")
              : t("worktree.prLastChecked")}
            : {new Date(status.refreshedAt).toLocaleString()}
          </time>
        ) : null}
      </div>
    </details>
  );
}

export function WorkspacePullRequestBadge({
  review,
}: {
  review: NonNullable<ReturnType<typeof workspacePullRequest>>;
}) {
  const Icon = {
    open: GitPullRequest,
    draft: GitPullRequestDraft,
    merged: GitMerge,
    closed: GitPullRequestClosed,
  }[review.state];
  return (
    <span
      className="git-badge workspace-review"
      data-state={review.state}
      data-stale={review.stale || undefined}
      title={review.title}
      aria-label={review.title}
      role="img"
    >
      <Icon size={12} aria-hidden="true" />
      {review.id}
    </span>
  );
}
