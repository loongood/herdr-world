import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useT } from "../i18n";
import { ColorSwatches } from "./ColorSwatch";
import { WorkspaceColorContext } from "./workspaceColor";
import type { Workspace } from "../types";
import { useOperationalStore, useStoreSelector } from "../store";
import type { PullRequestSummary } from "../../../shared/pullRequest";
import {
  clearTerminalComposerDrafts,
  terminalComposerCloseWarning,
  terminalComposerDraftPaneIds,
} from "../terminalComposer";
import { luckyWorktreeBranchName } from "../luckyName";
import { ConfirmDialog, TextInputDialog } from "./ModalDialogs";
import { WorktreeHooksDialog } from "./WorktreeHooksDialog";
import { WorktreeLocationDialog } from "./WorktreeLocationDialog";
import { WorktreeOpenDialog } from "./WorktreeOpenDialog";
import { WorkspaceAutoSyncDialog } from "./WorkspaceAutoSyncDialog";
import { worktreeCreationSource } from "../worktree";
import { WorktreeLifecycleDialog } from "./WorktreeLifecycleDialog";
import { isWorkspacePinned } from "../workspacePins";
import {
  workspaceDisplayName,
  workspacePullRequest,
} from "../workspaceTreeBadges";
import { copyTextFromUserGesture } from "../terminalClipboard";
import { useLayer } from "../layerStack";
import { observeClampedContextMenu } from "./contextMenuPosition";
import {
  isServerSourceAvailable,
  openServerSession,
  type ServerSessionSource,
} from "../useAllServerAgentSessions";
import "./ContextMenu.css";

export interface ContextMenuState {
  x: number;
  y: number;
  workspace: Workspace;
  source?: ServerSessionSource;
}

interface Item {
  label: string;
  danger?: boolean;
  action: () => void;
}

interface ItemGroup {
  label: string;
  items: Item[];
  danger?: boolean;
}

type DialogState =
  | {
      type: "new-worktree";
      workspaceId: string;
    }
  | {
      type: "rename-workspace";
      workspaceId: string;
      label: string;
    }
  | {
      type: "remove-worktree";
      workspaceId: string;
      label: string;
    }
  | {
      type: "close-workspace";
      workspaceId: string;
      label: string;
    };

export function ContextMenu({
  state,
  reviewStatus,
  pinnedWorkspaceKeys,
  onPinnedChange,
  onBrowseFiles,
  onReviewChanges,
  onClose,
  workspaces: hostWorkspaces,
}: {
  state: ContextMenuState | null;
  reviewStatus?: PullRequestSummary;
  pinnedWorkspaceKeys: ReadonlySet<string>;
  onPinnedChange: (workspace: Workspace, pinned: boolean) => void;
  onBrowseFiles?: (workspace: Workspace) => void;
  onReviewChanges?: (workspace: Workspace) => void;
  onClose: () => void;
  /**
   * The tree's own host topology, in World's navigator: the menu resolves its
   * workspace and worktree creation source there, never in whichever
   * connection's session is focused.
   */
  workspaces?: Workspace[];
}) {
  const t = useT();
  const store = useOperationalStore();
  const workspaceColors = useContext(WorkspaceColorContext);
  const sessionWorkspaces = useStoreSelector((state) => state.workspaces);
  const workspaces = hostWorkspaces ?? sessionWorkspaces;
  const activeConnectionId = useStoreSelector(
    (state) => state.activeConnectionId,
  );
  const connectionGeneration = useStoreSelector(
    (state) => state.connectionGeneration,
  );
  const panes = useStoreSelector((state) => state.panes);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const ref = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [openWorktreeWorkspaceId, setOpenWorktreeWorkspaceId] = useState<
    string | null
  >(null);
  const [locationWorkspaceId, setLocationWorkspaceId] = useState<string | null>(
    null,
  );
  const [worktreeHooksWorkspaceId, setWorktreeHooksWorkspaceId] = useState<
    string | null
  >(null);
  const [autoSyncWorkspaceId, setAutoSyncWorkspaceId] = useState<string | null>(
    null,
  );
  const [lifecycleWorkspaceId, setLifecycleWorkspaceId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setDialog(null);
    setOpenWorktreeWorkspaceId(null);
    setWorktreeHooksWorkspaceId(null);
    setAutoSyncWorkspaceId(null);
    setLifecycleWorkspaceId(null);
    closeRef.current();
  }, [activeConnectionId, connectionGeneration]);

  useLayer(state !== null, () => closeRef.current(), {
    element: () => ref.current,
  });
  useEffect(() => {
    if (!state) return;
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && ref.current?.contains(target)) return;
      onClose();
    };
    // Defer so the triggering contextmenu event doesn't immediately close it.
    const timer = setTimeout(() => {
      window.addEventListener("scroll", onScroll, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [state, onClose]);

  useLayoutEffect(() => {
    const menu = ref.current;
    if (!state || !menu) return;
    return observeClampedContextMenu(menu, {
      left: state.x,
      top: state.y,
    });
  }, [state]);

  const dialogs = (
    <>
      <TextInputDialog
        open={dialog?.type === "new-worktree"}
        title={t("commands.newWorktreeTitle")}
        label={t("commands.branchLabel")}
        initialValue={luckyWorktreeBranchName}
        placeholder={t("worktree.branchPlaceholder")}
        submitLabel={t("commands.createAction")}
        onClose={() => setDialog(null)}
        onSubmit={(branch) => {
          const value = branch.trim();
          if (dialog?.type === "new-worktree" && value) {
            store.createWorktree(dialog.workspaceId, value);
            setDialog(null);
          }
        }}
      />
      <TextInputDialog
        open={dialog?.type === "rename-workspace"}
        title={t("commands.renameWorkspaceTitle")}
        label={t("contextMenu.nameLabel")}
        initialValue={dialog?.type === "rename-workspace" ? dialog.label : ""}
        submitLabel={t("tabbar.renameAction")}
        onClose={() => setDialog(null)}
        onSubmit={(label) => {
          const value = label.trim();
          if (dialog?.type === "rename-workspace" && value) {
            if (value !== dialog.label) {
              store.renameWorkspace(dialog.workspaceId, value);
            }
            setDialog(null);
          }
        }}
      />
      <ConfirmDialog
        open={dialog?.type === "remove-worktree"}
        title={t("commands.removeWorktreeTitle")}
        message={
          dialog?.type === "remove-worktree"
            ? t("commands.removeWorktreeNamed", { name: dialog.label })
            : ""
        }
        confirmLabel={t("commands.removeAction")}
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.type === "remove-worktree") {
            store.removeWorktree(dialog.workspaceId, false);
          }
        }}
      />
      <ConfirmDialog
        open={dialog?.type === "close-workspace"}
        title={t("commands.closeWorkspaceTitle")}
        message={
          dialog?.type === "close-workspace"
            ? `${t("commands.closeWorkspaceNamed", {
                name: dialog.label,
              })}${terminalComposerCloseWarning(
                terminalComposerDraftPaneIds(
                  activeConnectionId,
                  connectionGeneration,
                  panes
                    .filter((pane) => pane.workspace_id === dialog.workspaceId)
                    .map((pane) => pane.pane_id),
                ).length,
              )}`
            : ""
        }
        confirmLabel={t("contextMenu.closeAction")}
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.type === "close-workspace") {
            clearTerminalComposerDrafts(
              activeConnectionId,
              connectionGeneration,
              panes
                .filter((pane) => pane.workspace_id === dialog.workspaceId)
                .map((pane) => pane.pane_id),
            );
            store.closeWorkspace(dialog.workspaceId);
          }
        }}
      />
    </>
  );

  const openWorktreeDialog = (
    <WorktreeOpenDialog
      open={!!openWorktreeWorkspaceId}
      workspaceId={openWorktreeWorkspaceId}
      onClose={() => setOpenWorktreeWorkspaceId(null)}
    />
  );
  const worktreeHooksDialog = (
    <WorktreeHooksDialog
      open={!!worktreeHooksWorkspaceId}
      workspaceId={worktreeHooksWorkspaceId ?? undefined}
      onClose={() => setWorktreeHooksWorkspaceId(null)}
    />
  );
  const autoSyncDialog = (
    <WorkspaceAutoSyncDialog
      open={!!autoSyncWorkspaceId}
      workspaceId={autoSyncWorkspaceId ?? undefined}
      onClose={() => setAutoSyncWorkspaceId(null)}
    />
  );
  const locationDialog = (
    <WorktreeLocationDialog
      open={!!locationWorkspaceId}
      workspaceId={locationWorkspaceId}
      onClose={() => setLocationWorkspaceId(null)}
    />
  );
  const lifecycleDialog = (
    <WorktreeLifecycleDialog
      open={!!lifecycleWorkspaceId}
      workspaceId={lifecycleWorkspaceId}
      onClose={() => setLifecycleWorkspaceId(null)}
    />
  );
  if (!state || (state.source && !isServerSourceAvailable(state.source))) {
    return (
      <>
        {dialogs}
        {openWorktreeDialog}
        {worktreeHooksDialog}
        {autoSyncDialog}
        {lifecycleDialog}
        {locationDialog}
      </>
    );
  }
  const remote =
    !!state.source && state.source.connectionId !== activeConnectionId;
  const w = remote
    ? state.workspace
    : (workspaces.find(
        (workspace) => workspace.workspace_id === state.workspace.workspace_id,
      ) ?? state.workspace);
  const isLinked = !!w.worktree?.is_linked_worktree;
  const displayName = workspaceDisplayName(w);
  const pinned = isWorkspacePinned(pinnedWorkspaceKeys, w);
  const creationSource = worktreeCreationSource(workspaces, w);

  const inspectItems: Item[] = [
    {
      label: t("contextMenu.browseFiles"),
      action: () => onBrowseFiles?.(w),
    },
    {
      label: t("contextMenu.reviewChanges"),
      action: () => onReviewChanges?.(w),
    },
  ];
  const review = workspacePullRequest(reviewStatus);
  if (review) {
    inspectItems.push({
      label: review.openLabel,
      action: () =>
        window.open(review.request.url, "_blank", "noopener,noreferrer"),
    });
  }
  const organizeItems: Item[] = [
    {
      label: pinned
        ? isLinked
          ? t("contextMenu.unpinWorktree")
          : t("contextMenu.unpinWorkspace")
        : isLinked
          ? t("contextMenu.pinWorktree")
          : t("contextMenu.pinWorkspace"),
      action: () => onPinnedChange(w, !pinned),
    },
    {
      label: t("contextMenu.renameWorkspaceEllipsis"),
      action: () => {
        setDialog({
          type: "rename-workspace",
          workspaceId: w.workspace_id,
          label: w.label,
        });
      },
    },
  ];
  // Herdr only reports `worktree` metadata for workspaces it opened as
  // worktrees, so a plain workspace whose cwd is a Git checkout carries none.
  // worktree.list resolves the repository from the workspace's pane on
  // demand, and the dialog shows Herdr's error for a non-Git workspace, so
  // opening an existing worktree is offered everywhere, like creating one.
  const worktreeItems: Item[] = [
    {
      label: t("contextMenu.openWorktreeEllipsis"),
      action: () => setOpenWorktreeWorkspaceId(w.workspace_id),
    },
    {
      label: t("contextMenu.worktreeLocationEllipsis"),
      action: () => setLocationWorkspaceId(w.workspace_id),
    },
  ];
  if (w.worktree) {
    organizeItems.push({
      label: t("contextMenu.copyCheckoutPath"),
      action: () => {
        const path = w.worktree?.checkout_path;
        if (!path) return;
        void copyTextFromUserGesture(path).then(
          () =>
            store.notify({
              kind: "success",
              message: t("contextMenu.checkoutPathCopied"),
              detail: path,
              autoDismissMs: 5000,
            }),
          (error) =>
            store.notify({
              kind: "error",
              message: t("contextMenu.copyCheckoutPathFailed"),
              detail: error instanceof Error ? error.message : String(error),
            }),
        );
      },
    });
    worktreeItems.push(
      {
        label: t("contextMenu.worktreeLifecycleEllipsis"),
        action: () => setLifecycleWorkspaceId(w.workspace_id),
      },
      {
        label: t("contextMenu.configureHooksEllipsis"),
        action: () => setWorktreeHooksWorkspaceId(w.workspace_id),
      },
    );
  }
  if (creationSource) {
    worktreeItems.unshift({
      label: t("contextMenu.newWorktreeEllipsis"),
      action: () => {
        setDialog({
          type: "new-worktree",
          workspaceId: creationSource.workspace_id,
        });
      },
    });
  }
  const sourceControlItems: Item[] = [
    {
      label: t("contextMenu.pullFromGit"),
      action: () => {
        void store.gitPullWorkspace(w.workspace_id);
      },
    },
    {
      label: t("contextMenu.configureAutoUpdateEllipsis"),
      action: () => setAutoSyncWorkspaceId(w.workspace_id),
    },
  ];
  const closeItems: Item[] = [];
  if (isLinked) {
    closeItems.push({
      label: t("commands.removeWorktree"),
      danger: true,
      action: () => {
        setDialog({
          type: "remove-worktree",
          workspaceId: w.workspace_id,
          label: w.label,
        });
      },
    });
  }
  closeItems.push({
    label: t("commands.closeWorkspace"),
    danger: true,
    action: () => {
      setDialog({
        type: "close-workspace",
        workspaceId: w.workspace_id,
        label: w.label,
      });
    },
  });
  const groups: ItemGroup[] = remote
    ? [
        {
          label: state.source!.serverLabel,
          items: [
            {
              label: t("contextMenu.openWorkspace"),
              action: () => {
                void openServerSession(state.source!, w.workspace_id);
              },
            },
          ],
        },
      ]
    : [
        { label: t("contextMenu.groupInspect"), items: inspectItems },
        { label: t("contextMenu.groupOrganize"), items: organizeItems },
        { label: t("contextMenu.groupWorktrees"), items: worktreeItems },
        {
          label: t("contextMenu.groupSourceControl"),
          items: sourceControlItems,
        },
        {
          label: t("contextMenu.groupClose"),
          items: closeItems,
          danger: true,
        },
      ].filter((group) => group.items.length > 0);

  const style: React.CSSProperties = {
    position: "fixed",
    left: state.x,
    top: state.y,
    zIndex: 1000,
  };

  return (
    <>
      <div
        ref={ref}
        className="context-menu context-menu--grouped"
        style={style}
      >
        <div className="context-menu-header">
          <span>{t("contextMenu.headerWorkspace")}</span>
          <strong title={displayName}>{displayName}</strong>
          <small>
            {isLinked
              ? t("inspector.linkedWorktree")
              : w.worktree
                ? t("contextMenu.kindGitWorkspace")
                : t("contextMenu.kindWorkspace")}
          </small>
        </div>
        {groups.map((group) => (
          <div
            key={group.label}
            className={`context-menu-group ${group.danger ? "is-danger" : ""}`}
          >
            <div className="context-menu-group-title">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.label}
                className={`context-menu-item ${item.danger ? "is-danger" : ""}`}
                onClick={() => {
                  onClose();
                  if (
                    state.source &&
                    (!isServerSourceAvailable(state.source) ||
                      (!remote &&
                        store.get().activeConnectionId !==
                          state.source.connectionId))
                  )
                    return;
                  item.action();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
        {workspaceColors ? (
          <div className="context-menu-colors">
            <ColorSwatches
              palette={workspaceColors.palette}
              current={workspaceColors.colorOf(w.workspace_id)}
              label={t("contextMenu.workspaceColour")}
              onColor={(id) => {
                onClose();
                workspaceColors.onColor(w.workspace_id, id);
              }}
            />
          </div>
        ) : null}
      </div>
      {dialogs}
      {openWorktreeDialog}
      {worktreeHooksDialog}
      {autoSyncDialog}
      {lifecycleDialog}
      {locationDialog}
    </>
  );
}
