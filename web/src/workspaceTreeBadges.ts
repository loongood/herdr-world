import { t } from "./i18n/core";
import type { Workspace } from "./types";
import type { PullRequestSummary } from "../../shared/pullRequest";

export function workspacePullRequest(status?: PullRequestSummary) {
  const request = status?.state === "ready" ? status.request : undefined;
  if (!request || !status?.provider) return null;
  const state =
    request.state === "merged" || request.state === "closed"
      ? request.state
      : request.state === "open" || request.state === "opened"
        ? request.draft
          ? "draft"
          : "open"
        : null;
  if (!state) return null;
  const label = {
    open: t("worktree.prOpen"),
    draft: t("worktree.prDraft"),
    merged: t("worktree.prMerged"),
    closed: t("worktree.prClosedNoMerge"),
  }[state];
  const github = status.provider === "github";
  const stale = status.stale
    ? `\n${t("pr.lastKnownStatus", {
        time: new Date(status.refreshedAt).toLocaleString(),
        detail: status.stale.failedAt
          ? t("pr.refreshFailed")
          : (status.stale.message ?? t("pr.awaitingRefresh")),
      })}`
    : "";
  return {
    request,
    state,
    stale: !!status.stale,
    id: `${github ? "#" : "!"}${request.number}`,
    title: `${github ? t("pr.numberPrefixGithub") : t("pr.numberPrefixGitlab")}${request.number}: ${label}\n${request.title}${stale}`,
    openLabel: github ? t("pr.openPrOnGithub") : t("pr.openMrOnGitlab"),
  } as const;
}

export function workspaceDisplayName(workspace: Workspace): string {
  return workspace.label || workspace.workspace_id;
}

export function showWorkspaceBranchBadge(workspace: Workspace): boolean {
  const branch = workspace.worktree?.git_status?.branch;
  if (!branch) return true;
  return !(
    workspace.worktree?.is_linked_worktree === true &&
    workspaceDisplayName(workspace).trim() === branch.trim()
  );
}
