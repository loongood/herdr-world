import {
  FileDiff,
  Focus as FocusIcon,
  FolderOpen,
  FolderTree,
  GitBranch,
  GitMerge,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useOperationalStore } from "../store";
import type { PullRequestSummary } from "../../../shared/pullRequest";
import { WorktreePullRequestBadge } from "./WorktreePullRequestBadge";
import { useT } from "../i18n";
import type { InspectorView } from "../workspaceResource";
import {
  lifecycleAutoSyncLabel,
  lifecycleGitChangeCount,
  lifecycleGitSummary,
  lifecycleWorktreeTitle,
  type WorkspaceAutoSyncInfo,
  type WorktreeLifecycleRow as LifecycleRow,
} from "../worktreeLifecycle";

export function WorktreeLifecycleRow({
  row,
  syncInfo,
  openedWorkspaceId,
  reviewStatus,
  operationRunning,
  rowBusy,
  runOperation,
  onFocus,
  onOpen,
  onOpenResource,
  onRemove,
}: {
  row: LifecycleRow;
  syncInfo?: WorkspaceAutoSyncInfo;
  openedWorkspaceId?: string;
  reviewStatus?: PullRequestSummary;
  operationRunning: boolean;
  rowBusy: boolean;
  runOperation: (
    key: string,
    label: string,
    action: () => Promise<unknown>,
  ) => void;
  onFocus: (workspaceId: string) => void;
  onOpen: (row: LifecycleRow) => Promise<unknown>;
  onOpenResource: (row: LifecycleRow, view: InspectorView) => Promise<unknown>;
  onRemove: (row: LifecycleRow) => void;
}) {
  const t = useT();
  const store = useOperationalStore();
  const workspace = row.workspace;
  const openWorkspaceId = workspace?.workspace_id ?? openedWorkspaceId;
  const rowKey = row.worktree.path;
  const title = lifecycleWorktreeTitle(row.worktree);
  const changed = lifecycleGitChangeCount(row.gitStatus);

  return (
    <article className="lifecycle-row" role="listitem">
      <div className="lifecycle-row-main">
        <div className="lifecycle-row-title">
          <GitBranch size={16} />
          <strong>{title}</strong>
          <span className="badge">
            {row.worktree.is_linked_worktree
              ? t("worktree.badgeLinked")
              : t("worktree.badgeMain")}
          </span>
          <span
            className={`lifecycle-open-state ${openWorkspaceId ? "is-open" : ""}`}
          >
            {openWorkspaceId
              ? t("worktree.stateOpen")
              : t("worktree.stateClosed")}
          </span>
        </div>
        <code title={row.worktree.path}>{row.worktree.path}</code>
        <WorktreePullRequestBadge status={reviewStatus} />
        <div className="lifecycle-row-meta">
          <span className={changed ? "has-changes" : ""}>
            {lifecycleGitSummary(row.gitStatus)}
          </span>
          {workspace ? (
            <span
              className={`lifecycle-sync-status lifecycle-sync-${
                syncInfo?.running
                  ? "running"
                  : (syncInfo?.last_status ?? "idle")
              }`}
              title={syncInfo?.last_message}
            >
              {lifecycleAutoSyncLabel(syncInfo)}
            </span>
          ) : null}
          {row.worktree.is_prunable ? (
            <span className="lifecycle-prunable">
              {t("worktree.prunableBadge")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="lifecycle-row-actions">
        {openWorkspaceId ? (
          <button
            type="button"
            className="ghost"
            disabled={operationRunning}
            onClick={() => onFocus(openWorkspaceId)}
          >
            <FocusIcon size={14} />
            {t("worktree.focusAction")}
          </button>
        ) : (
          <button
            type="button"
            className="ghost"
            title={t("worktree.openWorktreeTitle")}
            disabled={operationRunning}
            onClick={() =>
              runOperation(rowKey, t("worktree.openingWorktree"), () =>
                onOpen(row),
              )
            }
          >
            <FolderOpen size={14} />
            {t("worktree.openAction")}
          </button>
        )}
        {!row.worktree.is_prunable ? (
          <>
            <button
              type="button"
              className="ghost"
              title={
                openWorkspaceId
                  ? t("worktree.browseFilesTitle")
                  : t("worktree.openBrowseFilesTitle")
              }
              disabled={operationRunning}
              onClick={() =>
                runOperation(rowKey, t("worktree.openingFiles"), () =>
                  onOpenResource(row, "files"),
                )
              }
            >
              <FolderTree size={14} />
              {t("worktree.filesAction")}
            </button>
            <button
              type="button"
              className="ghost"
              title={
                openWorkspaceId
                  ? t("worktree.reviewChangesTitle")
                  : t("worktree.openReviewChangesTitle")
              }
              disabled={operationRunning}
              onClick={() =>
                runOperation(rowKey, t("worktree.openingChanges"), () =>
                  onOpenResource(row, "changes"),
                )
              }
            >
              <FileDiff size={14} />
              {t("worktree.changesAction")}
            </button>
          </>
        ) : null}
        {workspace ? (
          <button
            type="button"
            className="ghost lifecycle-pull-button"
            aria-label={t("worktree.pullAria", { name: title })}
            title={t("worktree.gitPullTitle")}
            disabled={operationRunning}
            onClick={() =>
              runOperation(rowKey, t("worktree.pullingBranch"), () =>
                store.gitPullWorkspace(workspace.workspace_id),
              )
            }
          >
            <GitMerge size={14} />
            {t("worktree.pullAction")}
          </button>
        ) : null}
        {workspace ? (
          <button
            type="button"
            aria-label={t("worktree.syncToggleAria", { name: title })}
            aria-pressed={syncInfo?.enabled ?? false}
            title={
              syncInfo?.enabled
                ? t("worktree.syncEnabledTitle")
                : t("worktree.syncDisabledTitle")
            }
            className={`ghost lifecycle-sync-toggle ${
              syncInfo?.enabled ? "is-active" : ""
            }`}
            disabled={!syncInfo || operationRunning}
            onClick={() =>
              runOperation(rowKey, t("worktree.updatingSyncPolicy"), () =>
                store.setWorkspaceAutoSyncEnabled(
                  workspace.workspace_id,
                  !(syncInfo?.enabled ?? false),
                ),
              )
            }
          >
            <RefreshCw size={13} />
            {t("worktree.syncAction")}
          </button>
        ) : null}
        {row.worktree.is_linked_worktree && !row.worktree.is_prunable ? (
          <button
            type="button"
            className="ghost lifecycle-remove-button"
            aria-label={t("worktree.removeAria", { name: title })}
            title={t("worktree.removeWorktreeTitle")}
            disabled={operationRunning}
            onClick={() => onRemove(row)}
          >
            {rowBusy ? (
              <span className="hook-loading-mark" />
            ) : (
              <Trash2 size={15} />
            )}
            {t("worktree.removeAction")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
