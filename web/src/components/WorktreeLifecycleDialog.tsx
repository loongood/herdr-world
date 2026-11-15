import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FolderOpen, GitBranch, RefreshCw, Settings } from "lucide-react";
import { luckyWorktreeBranchName } from "../luckyName";
import {
  connectionClientScopeKey,
  useConnectionClient,
  useConnectionReady,
} from "../useConnectionClient";
import { useWorktreePullRequests } from "../useWorktreePullRequests";
import { useOperationalStore, useStoreSelector } from "../store";
import type { Workspace, WorktreeList } from "../types";
import { resolveWorktreeOpenSource, worktreeCreationSource } from "../worktree";
import {
  type InspectorView,
  requestWorkspaceInspector,
} from "../workspaceResource";
import {
  buildWorktreeLifecycleRows,
  lifecycleActionError,
  lifecycleActionWarning,
  lifecycleGitChangeCount,
  lifecycleOpenedWorkspaceId,
  lifecycleWorktreeTitle,
  removeTemporaryWorkspaceSafely,
  type WorkspaceAutoSyncInfo,
  type WorktreeHookInfo,
  type WorktreeLifecycleRow,
} from "../worktreeLifecycle";
import { useT } from "../i18n";
import { CloseButton } from "./CloseButton";
import { ConfirmDialog, TextInputDialog } from "./ModalDialogs";
import { WorktreeHooksDialog } from "./WorktreeHooksDialog";
import { WorktreeOpenDialog } from "./WorktreeOpenDialog";
import { WorktreeLifecycleRow as WorktreeLifecycleRowItem } from "./WorktreeLifecycleRow";
import { focusDialogElement } from "./dialogFocus";
import "./WorktreeLifecycleDialog.css";

type LifecycleOperation = {
  key: string;
  label: string;
  status: "running" | "succeeded" | "warning" | "failed";
  detail?: string;
};

function removalWorkspaceHint(
  result: unknown,
  row: WorktreeLifecycleRow,
  list: WorktreeList | null,
  workspaceId: string,
): Workspace {
  const openedValue =
    result && typeof result === "object" && "workspace" in result
      ? (result as { workspace?: unknown }).workspace
      : undefined;
  const opened =
    openedValue && typeof openedValue === "object"
      ? (openedValue as Partial<Workspace>)
      : undefined;
  const source = list?.source;
  const fallbackWorktree = source
    ? {
        repo_key: source.repo_key,
        repo_name: source.repo_name,
        repo_root: source.repo_root,
        checkout_path: row.worktree.path,
        is_linked_worktree: row.worktree.is_linked_worktree,
      }
    : undefined;
  return {
    workspace_id: workspaceId,
    number: typeof opened?.number === "number" ? opened.number : 0,
    label: opened?.label || row.worktree.label || workspaceId,
    focused: opened?.focused === true,
    pane_count: typeof opened?.pane_count === "number" ? opened.pane_count : 0,
    tab_count: typeof opened?.tab_count === "number" ? opened.tab_count : 0,
    agent_status: opened?.agent_status || "unknown",
    ...(opened?.cwd ? { cwd: opened.cwd } : {}),
    ...(opened?.active_tab_id ? { active_tab_id: opened.active_tab_id } : {}),
    ...(fallbackWorktree || opened?.worktree
      ? { worktree: { ...fallbackWorktree!, ...opened?.worktree } }
      : {}),
  };
}

export function WorktreeLifecycleDialog({
  open,
  workspaceId,
  onClose,
}: {
  open: boolean;
  workspaceId?: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const workspaces = useStoreSelector((state) => state.workspaces);
  const store = useOperationalStore();
  const connectionClient = useConnectionClient();
  const ready = useConnectionReady(connectionClient);
  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.workspace_id === workspaceId,
  );
  const actionSourceWorkspace = selectedWorkspace
    ? worktreeCreationSource(workspaces, selectedWorkspace)
    : undefined;
  // Listing and repository settings accept linked workspaces. Creating or
  // opening a worktree does not, so keep those two contexts independent.
  const repositoryWorkspaceId = selectedWorkspace?.workspace_id ?? workspaceId;
  const scope = connectionClientScopeKey(
    connectionClient,
    repositoryWorkspaceId,
    selectedWorkspace?.worktree?.repo_key,
    selectedWorkspace?.cwd,
    selectedWorkspace?.worktree?.git_status?.branch,
  );
  const actionSourceWorkspaceId = actionSourceWorkspace?.workspace_id;
  const [listResult, setListResult] = useState<{
    scope: string;
    list: WorktreeList;
    workspaces: Workspace[];
  } | null>(null);
  const [hooks, setHooks] = useState<WorktreeHookInfo | null>(null);
  const [autoSync, setAutoSync] = useState<
    Record<string, WorkspaceAutoSyncInfo>
  >({});
  const [loading, setLoading] = useState(false);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [error, setError] = useState("");
  const [operation, setOperation] = useState<LifecycleOperation | null>(null);
  const [newWorktreeOpen, setNewWorktreeOpen] = useState(false);
  const [openWorktreeOpen, setOpenWorktreeOpen] = useState(false);
  const [hooksOpen, setHooksOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [removeCommandOpen, setRemoveCommandOpen] = useState(false);
  const [removeRow, setRemoveRow] = useState<WorktreeLifecycleRow | null>(null);
  const [openedResourceTargets, setOpenedResourceTargets] = useState<
    Record<string, string>
  >({});
  const openedResourceTargetsRef = useRef<Record<string, string>>({});
  const resourceAdmissionRef = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const inFlightLoad = useRef<{
    workspaceId: string;
    promise: Promise<void>;
  } | null>(null);
  const operationRunningRef = useRef(false);
  const operationIdRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const readWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    const result = await connectionClient.call("workspace.list", {});
    if (!Array.isArray(result?.workspaces)) {
      throw new Error(t("worktree.listWorkspacesFailed"));
    }
    return result.workspaces as Workspace[];
  }, [connectionClient]);

  const load = useCallback(
    async (showLoading: boolean, force = false) => {
      if (!repositoryWorkspaceId || !connectionClient.isCurrent()) return;
      const existingLoad = inFlightLoad.current;
      if (!force && existingLoad?.workspaceId === repositoryWorkspaceId) {
        if (showLoading) setLoading(true);
        await existingLoad.promise;
        return;
      }
      const currentRequest = ++requestId.current;
      const rememberedTargets = openedResourceTargetsRef.current;
      if (showLoading) setLoading(true);
      const promise = (async () => {
        try {
          const [worktreeListValue, listedWorkspaces] = await Promise.all([
            connectionClient.call("worktree.list", {
              workspace_id: repositoryWorkspaceId,
            }),
            readWorkspaces(),
          ]);
          const worktreeList = worktreeListValue as WorktreeList;
          if (!connectionClient.isCurrent()) return;
          const repoWorkspaces = listedWorkspaces.filter(
            (workspace) =>
              workspace.worktree?.repo_key === worktreeList.source.repo_key,
          );
          const [hookResult, ...syncResults] = await Promise.all([
            connectionClient
              .call("settings.worktree_hooks.get", {
                workspace_id: repositoryWorkspaceId,
              })
              .catch((hookError) => ({
                key: null,
                enabled: true,
                error: (hookError as Error).message,
              })),
            ...repoWorkspaces.map((workspace) =>
              connectionClient
                .call("settings.workspace_auto_sync.get", {
                  workspace_id: workspace.workspace_id,
                })
                .catch(() => null),
            ),
          ]);
          if (
            !connectionClient.isCurrent() ||
            currentRequest !== requestId.current
          ) {
            return;
          }
          const syncByWorkspace: Record<string, WorkspaceAutoSyncInfo> = {};
          for (const result of syncResults) {
            if (!result || typeof result.workspace_id !== "string") continue;
            syncByWorkspace[result.workspace_id] =
              result as WorkspaceAutoSyncInfo;
          }
          setListResult({
            scope,
            list: worktreeList,
            workspaces: listedWorkspaces,
          });
          if (openedResourceTargetsRef.current === rememberedTargets) {
            const liveIds = new Set(
              listedWorkspaces.map((workspace) => workspace.workspace_id),
            );
            const retained = Object.fromEntries(
              Object.entries(rememberedTargets).filter(([, id]) =>
                liveIds.has(id),
              ),
            );
            if (
              Object.keys(retained).length !==
              Object.keys(rememberedTargets).length
            ) {
              openedResourceTargetsRef.current = retained;
              setOpenedResourceTargets(retained);
            }
          }
          setHooks(hookResult as WorktreeHookInfo);
          setAutoSync(syncByWorkspace);
          setError("");
        } catch (loadError) {
          if (
            connectionClient.isCurrent() &&
            currentRequest === requestId.current
          ) {
            setError((loadError as Error).message);
          }
        } finally {
          if (
            connectionClient.isCurrent() &&
            currentRequest === requestId.current
          ) {
            setLoading(false);
          }
        }
      })();
      inFlightLoad.current = {
        workspaceId: repositoryWorkspaceId,
        promise,
      };
      try {
        await promise;
      } finally {
        if (inFlightLoad.current?.promise === promise) {
          inFlightLoad.current = null;
        }
      }
    },
    [connectionClient, readWorkspaces, repositoryWorkspaceId, scope],
  );

  useEffect(() => {
    if (!ready || !open || !repositoryWorkspaceId) return;
    setListResult(null);
    setHooks(null);
    setAutoSync({});
    setError("");
    setOperation(null);
    operationIdRef.current += 1;
    operationRunningRef.current = false;
    void load(true, true);
    const timer = window.setInterval(() => void load(false), 5_000);
    return () => {
      window.clearInterval(timer);
      requestId.current += 1;
      operationIdRef.current += 1;
      operationRunningRef.current = false;
      inFlightLoad.current = null;
    };
  }, [load, ready, open, repositoryWorkspaceId]);

  useEffect(() => {
    openedResourceTargetsRef.current = {};
    setOpenedResourceTargets({});
    return () => {
      resourceAdmissionRef.current?.abort();
      resourceAdmissionRef.current = null;
    };
  }, [
    open,
    repositoryWorkspaceId,
    connectionClient.connectionId,
    connectionClient.generation,
    connectionClient.serverRuntimeGeneration,
  ]);

  const list =
    listResult && listResult.scope === scope ? listResult.list : null;
  const rows = useMemo(
    () =>
      list
        ? buildWorktreeLifecycleRows(list, listResult?.workspaces ?? workspaces)
        : [],
    [list, listResult, workspaces],
  );
  const reviews = useWorktreePullRequests(
    connectionClient,
    repositoryWorkspaceId,
    open && list
      ? { ...list, worktrees: rows.map((row) => row.worktree) }
      : null,
    reviewRefresh,
  );
  const repositoryLoading =
    loading || (!!open && !!repositoryWorkspaceId && !list && !error);

  useEffect(() => {
    if (!open) return;
    if (newWorktreeOpen || openWorktreeOpen || hooksOpen || removeRow) return;
    const cancelFocus = focusDialogElement(dialogRef.current);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      cancelFocus();
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [hooksOpen, newWorktreeOpen, onClose, open, openWorktreeOpen, removeRow]);

  const configuredHooks = hooks?.hooks
    ? Object.values(hooks.hooks).filter(Boolean).length
    : 0;
  const openCount = rows.filter(
    (row) => row.workspace || openedResourceTargets[row.worktree.path],
  ).length;
  const changedCount = rows.filter(
    (row) => lifecycleGitChangeCount(row.gitStatus) > 0,
  ).length;
  const operationRunning = operation?.status === "running";

  const runOperation = async (
    key: string,
    label: string,
    action: () => Promise<unknown>,
  ) => {
    if (operationRunningRef.current || !connectionClient.isCurrent()) return;
    const operationId = ++operationIdRef.current;
    const operationIsCurrent = () =>
      connectionClient.isCurrent() && operationIdRef.current === operationId;
    operationRunningRef.current = true;
    setOperation({ key, label, status: "running" });
    try {
      const result = await action();
      if (!operationIsCurrent()) return;
      if (result === undefined) {
        await store.refresh();
        if (!operationIsCurrent()) return;
        await load(false, true);
        if (!operationIsCurrent()) return;
        setOperation({
          key,
          label,
          status: "failed",
          detail:
            store.get().error ?? t("worktree.operationFailedDetail", { label }),
        });
        return;
      }
      await store.refresh();
      if (!operationIsCurrent()) return;
      await load(false, true);
      if (!operationIsCurrent()) return;
      const actionError = lifecycleActionError(result);
      const actionWarning = lifecycleActionWarning(result);
      setOperation({
        key,
        label,
        status: actionError
          ? "failed"
          : actionWarning
            ? "warning"
            : "succeeded",
        detail: actionError ?? actionWarning,
      });
    } catch (actionError) {
      if (!operationIsCurrent()) return;
      await store.refresh().catch(() => undefined);
      if (!operationIsCurrent()) return;
      await load(false, true).catch(() => undefined);
      if (!operationIsCurrent()) return;
      setOperation({
        key,
        label,
        status: "failed",
        detail: (actionError as Error).message,
      });
    } finally {
      if (operationIdRef.current === operationId) {
        operationRunningRef.current = false;
      }
    }
  };

  if (!open) return null;

  const createWorktree = (branch: string) => {
    const value = branch.trim();
    if (!value || !actionSourceWorkspaceId) return;
    setNewWorktreeOpen(false);
    void runOperation("create", t("worktree.creating", { branch: value }), () =>
      store.createWorktree(actionSourceWorkspaceId, value),
    );
  };

  const setHooksEnabled = (enabled: boolean) => {
    if (!hooks?.key) return;
    void runOperation("hooks", t("worktree.updatingHookPolicy"), () =>
      store.setRepoWorktreeHooksEnabled(hooks.key!, enabled),
    );
  };

  const setWorktreeCommand = (command: string) => {
    if (!hooks?.key) return;
    setCommandOpen(false);
    void runOperation(
      "command",
      t("worktree.updatingWorktreeCommand"),
      async () => {
        const result = await store.setRepoWorktreeCommand(
          hooks.key!,
          command.trim(),
        );
        await load(false, true);
        return result;
      },
    );
  };

  const setWorktreeRemoveCommand = (command: string) => {
    if (!hooks?.key) return;
    setRemoveCommandOpen(false);
    void runOperation(
      "remove-command",
      t("worktree.updatingRemoveCommand"),
      async () => {
        const result = await store.setRepoWorktreeRemoveCommand(
          hooks.key!,
          command.trim(),
        );
        await load(false, true);
        return result;
      },
    );
  };

  const setWorktreeDirectory = (directory: string) => {
    if (!hooks?.key) return;
    setDirectoryOpen(false);
    void runOperation("directory", t("worktree.updatingLocation"), async () => {
      const result = await store.setRepoWorktreeDirectory(
        hooks.key!,
        directory.trim(),
      );
      await load(false, true);
      return result;
    });
  };

  const openWorktree = (row: WorktreeLifecycleRow, focus = true) => {
    const openSource = resolveWorktreeOpenSource(
      list,
      actionSourceWorkspaceId ?? null,
    );
    if (openSource?.workspaceId) {
      return store.openWorktree(
        openSource.workspaceId,
        row.worktree.path,
        focus,
      );
    }
    if (!openSource?.cwd) {
      throw new Error(t("worktree.repoRootUnavailable"));
    }
    return store.openWorktreeFromCwd(openSource.cwd, row.worktree.path, focus);
  };

  const openWorktreeResource = async (
    row: WorktreeLifecycleRow,
    view: InspectorView,
  ) => {
    const controller = new AbortController();
    resourceAdmissionRef.current?.abort();
    resourceAdmissionRef.current = controller;
    try {
      let existingWorkspaceId: string | undefined =
        row.workspace?.workspace_id ??
        openedResourceTargetsRef.current[row.worktree.path];
      if (existingWorkspaceId) {
        const listedWorkspaces = await readWorkspaces();
        if (controller.signal.aborted || !connectionClient.isCurrent()) {
          throw new Error(t("worktree.resourceValidationCancelled"));
        }
        if (
          !listedWorkspaces.some(
            (workspace) => workspace.workspace_id === existingWorkspaceId,
          )
        ) {
          existingWorkspaceId = undefined;
          const retained = { ...openedResourceTargetsRef.current };
          delete retained[row.worktree.path];
          openedResourceTargetsRef.current = retained;
          setOpenedResourceTargets(retained);
        }
      }
      const result = existingWorkspaceId
        ? { workspace: { workspace_id: existingWorkspaceId } }
        : await openWorktree(row, true);
      const targetWorkspaceId = lifecycleOpenedWorkspaceId(result);
      if (!targetWorkspaceId) {
        throw new Error(t("worktree.openedNoWorkspaceId"));
      }
      if (controller.signal.aborted || !connectionClient.isCurrent()) {
        throw new Error(t("worktree.resourceRequestCancelled"));
      }
      const targets = {
        ...openedResourceTargetsRef.current,
        [row.worktree.path]: targetWorkspaceId,
      };
      openedResourceTargetsRef.current = targets;
      setOpenedResourceTargets(targets);
      const admitted = await requestWorkspaceInspector(
        {
          connectionId: connectionClient.connectionId,
          generation: connectionClient.generation,
          runtimeGeneration:
            connectionClient.serverRuntimeGeneration ?? undefined,
          workspaceId: targetWorkspaceId,
          view,
        },
        controller.signal,
      );
      if (!admitted) {
        throw new Error(
          t("worktree.resourceViewFailed", {
            view:
              view === "files"
                ? t("worktree.filesAction")
                : t("worktree.changesAction"),
          }),
        );
      }
      onClose();
      return result;
    } finally {
      if (resourceAdmissionRef.current === controller)
        resourceAdmissionRef.current = null;
    }
  };

  const removeWorktree = async (row: WorktreeLifecycleRow) => {
    let targetWorkspaceId = row.workspace?.workspace_id;
    let workspaceHint = row.workspace;
    let temporaryWorkspace = false;
    if (!targetWorkspaceId) {
      const opened = await openWorktree(row, false);
      targetWorkspaceId = lifecycleOpenedWorkspaceId(opened);
      if (!targetWorkspaceId) {
        throw new Error(t("worktree.openedNoWorkspaceId"));
      }
      workspaceHint = removalWorkspaceHint(
        opened,
        row,
        list,
        targetWorkspaceId,
      );
      temporaryWorkspace = true;
    }

    return removeTemporaryWorkspaceSafely({
      workspaceId: targetWorkspaceId,
      temporary: temporaryWorkspace,
      remove: () =>
        store.removeWorktree(targetWorkspaceId, false, workspaceHint),
      close: async (workspaceId) => {
        if (!connectionClient.isCurrent()) {
          throw new Error(t("worktree.connectionChangedBeforeClose"));
        }
        await store.closeWorkspaceOrThrow(workspaceId);
      },
    });
  };

  return createPortal(
    <>
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div
          ref={dialogRef}
          className="modal worktree-lifecycle-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("worktree.lifecycleAria")}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="modal-head lifecycle-head">
            <div>
              <span className="lifecycle-kicker">
                {t("worktree.kickerRepositoryOperations")}
              </span>
              <h2>{t("worktree.lifecycleTitle")}</h2>
              <p>
                {list?.source.repo_name ??
                  selectedWorkspace?.worktree?.repo_name ??
                  t("worktree.repositoryFallback")}
                <code title={list?.source.repo_root}>
                  {list?.source.repo_root ??
                    selectedWorkspace?.worktree?.repo_root ??
                    ""}
                </code>
              </p>
            </div>
            <div className="lifecycle-head-actions">
              <button
                type="button"
                className="ghost lifecycle-icon-button"
                aria-label={t("worktree.refreshLifecycleAria")}
                title={t("worktree.refreshAction")}
                disabled={repositoryLoading || operationRunning}
                onClick={() => {
                  setListResult(null);
                  setReviewRefresh((value) => value + 1);
                  void load(true, true);
                }}
              >
                <RefreshCw
                  size={16}
                  className={repositoryLoading ? "is-spinning" : ""}
                />
              </button>
              <CloseButton onClick={onClose} />
            </div>
          </div>

          <div className="lifecycle-toolbar">
            <button
              type="button"
              title={
                actionSourceWorkspaceId
                  ? t("worktree.createLinkedTitle")
                  : t("worktree.openMainFirstTitle")
              }
              disabled={!actionSourceWorkspaceId || operationRunning}
              onClick={() => {
                setNewWorktreeOpen(true);
              }}
            >
              <GitBranch size={15} />
              {t("worktree.newWorktreeAction")}
            </button>
            <button
              type="button"
              className="ghost"
              title={t("worktree.openExistingTitle")}
              disabled={!repositoryWorkspaceId || operationRunning}
              onClick={() => setOpenWorktreeOpen(true)}
            >
              <FolderOpen size={15} />
              {t("worktree.openExistingAction")}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!repositoryWorkspaceId}
              onClick={() => setHooksOpen(true)}
            >
              <Settings size={15} />
              {t("worktree.hookDetailsAction")}
            </button>
          </div>

          {operation ? (
            <div
              className={`lifecycle-operation is-${operation.status}`}
              role={operation.status === "failed" ? "alert" : "status"}
            >
              {operation.status === "running" ? (
                <span className="hook-loading-mark" />
              ) : (
                <span className="lifecycle-operation-mark" />
              )}
              <div>
                <strong>{operation.label}</strong>
                <span>
                  {operation.detail ??
                    (operation.status === "running"
                      ? t("worktree.waitingHooks")
                      : operation.status === "succeeded"
                        ? t("worktree.stateRefreshed")
                        : t("worktree.operationFailed"))}
                </span>
              </div>
            </div>
          ) : null}

          {repositoryLoading && !list ? (
            <div className="lifecycle-loading" role="status">
              <span className="hook-loading-mark" />
              <span>{t("worktree.loadingLifecycle")}</span>
            </div>
          ) : error && !list ? (
            <div className="lifecycle-empty is-error">
              <strong>{t("worktree.lifecycleUnavailable")}</strong>
              <span>{error}</span>
              <button type="button" onClick={() => void load(true, true)}>
                {t("diff.retry")}
              </button>
            </div>
          ) : (
            <div className="lifecycle-content">
              <div
                className="lifecycle-overview"
                aria-label={t("worktree.repositorySummaryAria")}
              >
                <div>
                  <strong>{rows.length}</strong>
                  <span>{t("worktree.overviewCheckouts")}</span>
                </div>
                <div>
                  <strong>{openCount}</strong>
                  <span>{t("worktree.overviewOpen")}</span>
                </div>
                <div>
                  <strong>{changedCount}</strong>
                  <span>{t("worktree.overviewWithChanges")}</span>
                </div>
              </div>

              <section className="lifecycle-policy">
                <div className="lifecycle-policy-main">
                  <span className="lifecycle-policy-icon">
                    <Settings size={16} />
                  </span>
                  <div>
                    <strong>{t("worktree.repoHooksTitle")}</strong>
                    <span>
                      {hooks?.config_source
                        ? t("worktree.hooksConfiguredWith", {
                            count: configuredHooks,
                            format:
                              hooks.config_source === "paseo"
                                ? t("worktree.formatPaseo")
                                : t("worktree.formatRoamgate"),
                          })
                        : t("worktree.noHookConfig")}
                    </span>
                    {hooks?.config_path ? (
                      <span title={hooks.config_path}>{hooks.config_path}</span>
                    ) : null}
                    {hooks?.error ? (
                      <span role="alert" title={hooks.error}>
                        {hooks.error}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={t("worktree.enableHooksRepoAria")}
                  aria-checked={hooks?.enabled ?? true}
                  className={`settings-switch ${hooks?.enabled ? "is-on" : ""}`}
                  disabled={!hooks?.key || operationRunning}
                  onClick={() => setHooksEnabled(!(hooks?.enabled ?? true))}
                >
                  <span />
                </button>
              </section>

              <section className="lifecycle-policy">
                <div className="lifecycle-policy-main">
                  <span className="lifecycle-policy-icon">
                    <Settings size={16} />
                  </span>
                  <div>
                    <strong>{t("worktree.worktreeLocationTitle")}</strong>
                    <span title={hooks?.worktree_directory ?? undefined}>
                      {hooks?.worktree_directory
                        ? hooks.worktree_directory
                        : t("worktree.locationDefaultHerdr")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hooks?.key || operationRunning}
                  onClick={() => setDirectoryOpen(true)}
                >
                  {t("worktree.changeAction")}
                </button>
              </section>

              <section className="lifecycle-policy">
                <div className="lifecycle-policy-main">
                  <span className="lifecycle-policy-icon">
                    <Settings size={16} />
                  </span>
                  <div>
                    <strong>{t("worktree.worktreeCommandTitle")}</strong>
                    <span>
                      {hooks?.worktree_command ||
                        hooks?.default_worktree_command ||
                        t("worktree.commandDefaultHerdr")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hooks?.key || operationRunning}
                  onClick={() => setCommandOpen(true)}
                >
                  {t("worktree.changeAction")}
                </button>
              </section>

              <section className="lifecycle-policy">
                <div className="lifecycle-policy-main">
                  <span className="lifecycle-policy-icon">
                    <Settings size={16} />
                  </span>
                  <div>
                    <strong>{t("worktree.removeCommandTitle")}</strong>
                    <span>
                      {hooks?.worktree_remove_command ||
                        hooks?.default_worktree_remove_command ||
                        t("worktree.removeCommandDefaultHerdr")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hooks?.key || operationRunning}
                  onClick={() => setRemoveCommandOpen(true)}
                >
                  {t("worktree.changeAction")}
                </button>
              </section>

              {error ? <p className="modal-error">{error}</p> : null}
              <div className="lifecycle-list" role="list">
                {rows.map((row) => {
                  const workspaceIdForRow = row.workspace?.workspace_id;
                  const syncInfo = workspaceIdForRow
                    ? autoSync[workspaceIdForRow]
                    : undefined;
                  const rowKey = row.worktree.path;
                  return (
                    <WorktreeLifecycleRowItem
                      key={rowKey}
                      row={row}
                      openedWorkspaceId={openedResourceTargets[rowKey]}
                      reviewStatus={reviews[rowKey]}
                      syncInfo={syncInfo}
                      operationRunning={operationRunning}
                      rowBusy={
                        operation?.status === "running" &&
                        operation.key === rowKey
                      }
                      runOperation={(key, label, action) => {
                        void runOperation(key, label, action);
                      }}
                      onFocus={(targetWorkspaceId) => {
                        void store.focusWorkspace(targetWorkspaceId);
                        onClose();
                      }}
                      onOpen={(targetRow) => openWorktree(targetRow)}
                      onOpenResource={openWorktreeResource}
                      onRemove={setRemoveRow}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <TextInputDialog
        open={newWorktreeOpen}
        title={t("worktree.newWorktreeDialogTitle")}
        label={t("worktree.branchLabel")}
        initialValue={luckyWorktreeBranchName}
        placeholder={t("worktree.branchPlaceholder")}
        submitLabel={t("worktree.createAction")}
        onClose={() => setNewWorktreeOpen(false)}
        onSubmit={createWorktree}
      />
      <TextInputDialog
        open={directoryOpen}
        title={t("worktree.locationTitle")}
        label={t("worktree.locationDirectoryLabel")}
        initialValue={hooks?.worktree_directory ?? ""}
        placeholder="/path/to/worktrees"
        submitLabel={t("worktree.saveAction")}
        onClose={() => setDirectoryOpen(false)}
        onSubmit={setWorktreeDirectory}
      />
      <TextInputDialog
        open={commandOpen}
        title={t("worktree.worktreeCommandDialogTitle")}
        label={t("worktree.commandTemplateLabel", {
          path: "{path}",
          branch: "{branch}",
          base: "{base}",
          repo: "{repo}",
        })}
        initialValue={hooks?.worktree_command ?? ""}
        placeholder="git recworktree add {path} --branch {branch} --base {base}"
        submitLabel={t("worktree.saveAction")}
        onClose={() => setCommandOpen(false)}
        onSubmit={setWorktreeCommand}
      />
      <TextInputDialog
        open={removeCommandOpen}
        title={t("worktree.removeCommandDialogTitle")}
        label={t("worktree.removeCommandTemplateLabel", {
          path: "{path}",
          repo: "{repo}",
          force: "{force}",
        })}
        initialValue={hooks?.worktree_remove_command ?? ""}
        placeholder="git recworktree remove {path} {force}"
        submitLabel={t("worktree.saveAction")}
        onClose={() => setRemoveCommandOpen(false)}
        onSubmit={setWorktreeRemoveCommand}
      />
      <WorktreeOpenDialog
        open={openWorktreeOpen}
        workspaceId={repositoryWorkspaceId ?? null}
        sourceWorkspaceId={actionSourceWorkspaceId ?? null}
        sourceCwd={list?.source.repo_root ?? null}
        onClose={() => {
          setOpenWorktreeOpen(false);
          void store.refresh().then(() => load(false, true));
        }}
      />
      <WorktreeHooksDialog
        open={hooksOpen}
        workspaceId={repositoryWorkspaceId ?? undefined}
        onClose={() => {
          setHooksOpen(false);
          void load(false, true);
        }}
      />
      <ConfirmDialog
        open={!!removeRow}
        title={t("worktree.removeWorktreeDialogTitle")}
        message={
          removeRow
            ? removeRow.workspace
              ? t("worktree.removeOpenMessage", {
                  name: lifecycleWorktreeTitle(removeRow.worktree),
                })
              : t("worktree.removeClosedMessage", {
                  name: lifecycleWorktreeTitle(removeRow.worktree),
                })
            : t("worktree.removeGenericMessage")
        }
        confirmLabel={t("worktree.removeAction")}
        danger
        onClose={() => setRemoveRow(null)}
        onConfirm={() => {
          const row = removeRow;
          setRemoveRow(null);
          if (!row) return;
          void runOperation(
            row.worktree.path,
            t("worktree.removingWorktree"),
            () => removeWorktree(row),
          );
        }}
      />
    </>,
    document.body,
  );
}
