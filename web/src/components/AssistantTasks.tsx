import { TaskForm } from "./AssistantTaskForm";
import { ChevronLeft, LoaderCircle, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type AssistantSnapshot,
  type AssistantSource,
  type AssistantTaskDetail,
  type AssistantTaskProposal,
  type AssistantTaskSchedule,
  type AssistantWorkspace,
  type AssistantWorkspaceRef,
} from "../../../shared/assistant";
import { callAssistant, getAssistantTask } from "../assistant";
import { t, useT, type TranslationKey } from "../i18n";
import type { RangerTaskNotificationTarget } from "../taskNotifications";
import { formatUiDateTime } from "../uiLocale";
import { ActionCard, AssistantMessageActivity } from "./AssistantPanel";
import { MarkdownPreview } from "./markdown";
import { AssistantThinking } from "./AssistantThinking";
import { ConfirmDialog } from "./ModalDialogs";
import { ThemedSelect } from "./ThemedSelect";
import "./AssistantTasks.css";

function workspaceKey(ref: AssistantWorkspaceRef) {
  return JSON.stringify([ref.connection_id, ref.workspace_id]);
}

export function taskScheduleLabel(schedule: AssistantTaskSchedule) {
  if (schedule.type === "once")
    return t("assistant.taskScheduleSummaryOnce", {
      at: formatUiDateTime(schedule.at),
    });
  if (schedule.type === "daily")
    return t("assistant.taskScheduleSummaryDaily", {
      time: schedule.time,
      timezone: schedule.timezone,
    });
  return t(
    schedule.minutes === 1
      ? "assistant.taskScheduleSummaryEveryOne"
      : "assistant.taskScheduleSummaryEveryMany",
    { minutes: schedule.minutes },
  );
}

const liveRun = (status: string | undefined) =>
  !!status && ["queued", "running", "waiting"].includes(status);

const PROPOSAL_OPERATION_KEYS = {
  create: "assistant.proposalOperationCreate",
  update: "assistant.proposalOperationUpdate",
  pause: "assistant.proposalOperationPause",
  resume: "assistant.proposalOperationResume",
  cancel: "assistant.proposalOperationCancel",
  delete: "assistant.proposalOperationDelete",
} as const satisfies Record<string, TranslationKey>;

const PROPOSAL_CONFIRMED_KEYS = {
  create: "assistant.proposalConfirmedCreate",
  update: "assistant.proposalConfirmedUpdate",
  pause: "assistant.proposalConfirmedPause",
  resume: "assistant.proposalConfirmedResume",
  cancel: "assistant.proposalConfirmedCancel",
  delete: "assistant.proposalConfirmedDelete",
} as const satisfies Record<string, TranslationKey>;

const PROPOSAL_EXPLAIN_KEYS = {
  create: "assistant.proposalExplainCreate",
  update: "assistant.proposalExplainUpdate",
  pause: "assistant.proposalExplainPause",
  resume: "assistant.proposalExplainResume",
  cancel: "assistant.proposalExplainCancel",
  delete: "assistant.proposalExplainDelete",
} as const satisfies Record<string, TranslationKey>;

const PROPOSAL_CONFIRM_KEYS = {
  create: "assistant.proposalConfirmCreate",
  update: "assistant.proposalConfirmUpdate",
  pause: "assistant.proposalConfirmPause",
  resume: "assistant.proposalConfirmResume",
  cancel: "assistant.proposalConfirmCancel",
  delete: "assistant.proposalConfirmDelete",
} as const satisfies Record<string, TranslationKey>;

export function TaskProposalCard({
  proposal,
  busy,
  run,
}: {
  proposal: AssistantTaskProposal;
  busy: boolean;
  run: (action: string, params?: Record<string, unknown>) => Promise<boolean>;
}) {
  const t = useT();
  const operation = proposal.operation ?? "create";
  const operationLabel = t(PROPOSAL_OPERATION_KEYS[operation]);
  const confirmedLabel = t(PROPOSAL_CONFIRMED_KEYS[operation]);
  const explanation = t(PROPOSAL_EXPLAIN_KEYS[operation]);
  return (
    <div
      className="assistant-task-proposal assistant-action-card"
      role="group"
      aria-label={t("assistant.taskProposalAria")}
      tabIndex={-1}
    >
      <div className="assistant-action-head">
        <strong>{proposal.title}</strong>
        <span>
          {proposal.status === "pending"
            ? t("assistant.proposalNeedsConfirmation")
            : proposal.status === "confirmed"
              ? confirmedLabel
              : t("assistant.proposalPreviewCancelled")}
        </span>
      </div>
      {operation !== "create" ? (
        <>
          <p>{operationLabel}</p>
          <span className="assistant-hint">
            {t("assistant.proposalTaskId", { id: proposal.task_id ?? "" })}
          </span>
        </>
      ) : null}
      <p>{taskScheduleLabel(proposal.schedule)}</p>
      <span className="assistant-hint">
        {proposal.all_workspaces
          ? t("assistant.proposalScopeAll", {
              count: proposal.scope.length,
            })
          : proposal.scope.length === 1
            ? t("assistant.proposalScopeOne")
            : t("assistant.proposalScopeMany", {
                count: proposal.scope.length,
              })}
      </span>
      <details className="assistant-task-prompt">
        <summary>{t("assistant.taskPromptSummary")}</summary>
        <p>{proposal.prompt}</p>
      </details>
      <span className="assistant-hint">
        {proposal.notification_mode === "agent"
          ? t("assistant.proposalNotifyAgent")
          : t("assistant.proposalNotifyStatus")}
      </span>
      {proposal.detail ? (
        <p className="assistant-hint">{proposal.detail}</p>
      ) : null}
      {proposal.status === "pending" ? (
        <>
          <p className="assistant-hint">{explanation}</p>
          <div className="assistant-action-buttons">
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.currentTarget
                  .closest<HTMLElement>(".assistant-task-proposal")
                  ?.focus({ preventScroll: true });
                void run("task.confirm_proposal", { proposal_id: proposal.id });
              }}
            >
              {t(PROPOSAL_CONFIRM_KEYS[operation])}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={(event) => {
                event.currentTarget
                  .closest<HTMLElement>(".assistant-task-proposal")
                  ?.focus({ preventScroll: true });
                void run("task.cancel_proposal", { proposal_id: proposal.id });
              }}
            >
              {t("history.cancel")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function AssistantTasks({
  active = true,
  requestedTask,
  onRequestedTaskHandled,
  snapshot,
  connected,
  workspaces,
  onOpenSettings,
  onOpenSource,
}: {
  active?: boolean;
  requestedTask?: RangerTaskNotificationTarget | null;
  onRequestedTaskHandled?: () => void;
  snapshot: AssistantSnapshot;
  connected: boolean;
  workspaces: AssistantWorkspace[];
  onOpenSettings: () => void;
  onOpenSource: (source: AssistantSource) => void;
}) {
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | undefined>();
  const [detail, setDetail] = useState<AssistantTaskDetail | null>(null);
  const [editor, setEditor] = useState<"new" | "edit" | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<"cancel" | "delete" | null>(
    null,
  );
  const [showCancelled, setShowCancelled] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const pending = useRef(false);
  const cancelDetailRequest = useRef<(() => void) | null>(null);
  const creationRequest = useRef<{ key: string; id: string } | null>(null);
  const tasks = snapshot.tasks ?? [];
  const visibleTasks = tasks.filter(
    (item) => showCancelled || item.status !== "cancelled",
  );
  const summary = tasks.find((task) => task.id === selectedId);
  const selectedAvailable = !!summary;
  const requestedTaskAvailable =
    !!requestedTask && tasks.some((task) => task.id === requestedTask.taskId);
  useEffect(() => {
    if (!requestedTask) return;
    cancelDetailRequest.current?.();
    setSelectedId(null);
    setRunId(undefined);
    setDetail(null);
    setEditor(null);
    setConfirmation(null);
    onRequestedTaskHandled?.();
    if (!requestedTaskAvailable) {
      setError(t("assistant.taskUnavailable"));
      return;
    }
    setSelectedId(requestedTask.taskId);
    setRunId(requestedTask.runId);
    setError(null);
    setRefresh((value) => value + 1);
  }, [requestedTask, requestedTaskAvailable, onRequestedTaskHandled]);
  const signature = summary
    ? JSON.stringify([
        summary.updated_at,
        summary.status,
        summary.current_run?.id,
        summary.current_run?.status,
        summary.last_run?.id,
        summary.last_run?.status,
      ])
    : "";
  const ready =
    connected &&
    !!snapshot.config.provider &&
    !!snapshot.config.model &&
    snapshot.providers.some(
      (provider) =>
        provider.id === snapshot.config.provider && provider.configured,
    ) &&
    snapshot.models.some(
      (model) =>
        model.provider === snapshot.config.provider &&
        model.id === snapshot.config.model,
    ) &&
    !["waiting", "working"].includes(snapshot.auth?.status ?? "");
  useEffect(() => {
    if (selectedId && !selectedAvailable && !busy) {
      setSelectedId(null);
      setRunId(undefined);
      setDetail(null);
      setEditor(null);
      setError(null);
      setConfirmation(null);
    }
  }, [selectedId, selectedAvailable, busy]);
  useEffect(() => {
    if (
      !active ||
      !selectedId ||
      !selectedAvailable ||
      !connected ||
      editor ||
      busy
    )
      return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll = liveRun(summary?.current_run?.status);
    setLoading(true);
    const load = async () => {
      try {
        const value = await getAssistantTask(selectedId, runId);
        if (cancelled) return;
        setDetail(value);
        setError(null);
        if (!runId && !value.run && value.runs.length)
          setRunId(
            value.task.current_run?.id ??
              value.task.last_run?.id ??
              value.runs[0].id,
          );
        poll =
          liveRun(value.task.current_run?.status) || liveRun(value.run?.status);
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) {
          setLoading(false);
          if (poll) timer = setTimeout(() => void load(), 1000);
        }
      }
    };
    const cancel = () => {
      cancelled = true;
      clearTimeout(timer);
    };
    cancelDetailRequest.current = cancel;
    void load();
    return cancel;
  }, [
    active,
    selectedId,
    selectedAvailable,
    runId,
    connected,
    snapshot.instance_id,
    signature,
    summary?.current_run?.status,
    refresh,
    editor,
    busy,
  ]);
  const select = (id: string | null) => {
    cancelDetailRequest.current?.();
    setSelectedId(id);
    setRunId(undefined);
    setDetail(null);
    setEditor(null);
    setError(null);
    creationRequest.current = null;
  };
  const mutate = async (action: string, params: Record<string, unknown>) => {
    if (pending.current || !connected) return null;
    cancelDetailRequest.current?.();
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const value = (await callAssistant(
        `task.${action}`,
        params,
      )) as AssistantSnapshot;
      setRefresh((value) => value + 1);
      return value;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const task = detail?.task ?? summary;
  const selectedRun = detail?.run;
  const runBusy =
    ["queued", "running"].includes(selectedRun?.status ?? "") ||
    !!selectedRun?.messages.some((message) =>
      message.actions?.some((action) => action.status === "executing"),
    );
  return (
    <div
      className="assistant-tasks"
      aria-label={t("assistant.tasksAria")}
      hidden={!active}
    >
      {error ? (
        <p className="assistant-task-error" role="alert">
          {error}
        </p>
      ) : null}
      {editor ? (
        <TaskForm
          active={active}
          key={editor === "edit" ? task?.id : "new"}
          task={editor === "edit" ? task : undefined}
          workspaces={workspaces}
          busy={busy || !connected}
          ready={ready}
          highPermission={snapshot.config.approval_mode === "auto"}
          allWorkspacesAllowed={
            snapshot.config.approval_mode === "auto" &&
            snapshot.config.workspace_scope === "all"
          }
          onOpenSettings={onOpenSettings}
          onCancel={() => setEditor(null)}
          onSave={async (input) => {
            const key = JSON.stringify(input);
            if (editor === "new" && creationRequest.current?.key !== key)
              creationRequest.current = { key, id: crypto.randomUUID() };
            const result = await mutate(
              editor === "edit" ? "update" : "create",
              {
                ...input,
                ...(editor === "edit"
                  ? { task_id: selectedId }
                  : { request_id: creationRequest.current!.id }),
              },
            );
            if (!result) return;
            const id =
              editor === "edit"
                ? selectedId
                : result.tasks?.find(
                    (item) =>
                      !tasks.some((previous) => previous.id === item.id),
                  )?.id;
            select(id ?? null);
          }}
        />
      ) : !selectedId ? (
        <>
          <div className="assistant-section-heading">
            <h3>{t("assistant.tasksHeading")}</h3>
            <button
              type="button"
              className="ghost"
              disabled={!connected || snapshot.tasks === undefined}
              onClick={() => {
                creationRequest.current = null;
                setEditor("new");
              }}
            >
              <Plus size={13} /> {t("assistant.newTask")}
            </button>
          </div>
          <p className="assistant-hint">{t("assistant.tasksHint")}</p>
          {tasks.some((item) => item.status === "cancelled") ? (
            <label className="assistant-task-filter">
              <button
                type="button"
                role="switch"
                aria-label={t("assistant.showCancelledAria")}
                aria-checked={showCancelled}
                className={`settings-switch${showCancelled ? " is-on" : ""}`}
                onClick={() => setShowCancelled((current) => !current)}
              >
                <span />
              </button>
              {t("assistant.showCancelled")}
            </label>
          ) : null}
          {visibleTasks.length ? (
            <ul className="assistant-task-list">
              {visibleTasks.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="assistant-task-row"
                    onClick={() => select(item.id)}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <span
                        className={`assistant-task-state is-${item.status}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <span>{taskScheduleLabel(item.schedule)}</span>
                    <small>
                      {item.current_run
                        ? t("assistant.taskCurrentRun", {
                            status: item.current_run.status,
                          })
                        : item.last_run
                          ? t("assistant.taskLastRun", {
                              status: item.last_run.status,
                            })
                          : t("assistant.taskNoRuns")}
                    </small>
                    <small>
                      {item.next_run_at
                        ? t("assistant.taskNextRun", {
                            at: formatUiDateTime(item.next_run_at),
                          })
                        : t("assistant.taskNoUpcoming")}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="assistant-panel-empty">
              <strong>
                {snapshot.tasks === undefined
                  ? t("assistant.tasksUpdateBridge")
                  : tasks.length
                    ? t("assistant.tasksNoneActive")
                    : t("assistant.tasksNoneYet")}
              </strong>
              <span>{t("assistant.tasksCreateHint")}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="assistant-section-heading">
            <button
              type="button"
              className="ghost"
              onClick={() => select(null)}
            >
              <ChevronLeft size={13} /> {t("assistant.allTasks")}
            </button>
            {task ? (
              <button
                type="button"
                className="ghost"
                disabled={busy || !connected || task.status === "cancelled"}
                onClick={() => setEditor("edit")}
              >
                {t("assistant.edit")}
              </button>
            ) : null}
          </div>
          {task ? (
            <>
              <section
                className="assistant-task-overview"
                aria-label={t("assistant.taskOverviewAria")}
              >
                <div className="assistant-task-heading">
                  <h3>{task.title}</h3>
                  <span className={`assistant-task-state is-${task.status}`}>
                    {task.status}
                  </span>
                </div>
                <dl className="assistant-task-schedule">
                  <div>
                    <dt>{t("assistant.taskScheduleLabel")}</dt>
                    <dd>{taskScheduleLabel(task.schedule)}</dd>
                  </div>
                  <div>
                    <dt>{t("assistant.taskNextRunDt")}</dt>
                    <dd>
                      {task.next_run_at
                        ? formatUiDateTime(task.next_run_at)
                        : t("assistant.taskNoUpcoming")}
                    </dd>
                  </div>
                </dl>
                <div className="assistant-task-buttons">
                  <button
                    type="button"
                    className="assistant-task-primary"
                    disabled={
                      busy ||
                      !connected ||
                      task.status === "cancelled" ||
                      liveRun(task.current_run?.status)
                    }
                    onClick={() => void mutate("run_now", { task_id: task.id })}
                  >
                    {t("assistant.taskRunNow")}
                  </button>
                  {task.status !== "cancelled" ? (
                    <>
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy || !connected}
                        onClick={() =>
                          void mutate(
                            task.status === "paused" ? "resume" : "pause",
                            { task_id: task.id },
                          )
                        }
                      >
                        {task.status === "paused"
                          ? t("assistant.taskResume")
                          : t("assistant.taskPause")}
                      </button>
                      <button
                        type="button"
                        className="ghost danger-text"
                        disabled={busy || !connected}
                        onClick={() => setConfirmation("cancel")}
                      >
                        {t("assistant.proposalOperationCancel")}
                      </button>
                    </>
                  ) : null}
                  {task.status === "cancelled" && !task.current_run ? (
                    <button
                      type="button"
                      className="ghost danger-text"
                      disabled={busy || !connected}
                      onClick={() => setConfirmation("delete")}
                    >
                      {t("assistant.proposalOperationDelete")}
                    </button>
                  ) : null}
                  {liveRun(task.current_run?.status) ? (
                    <button
                      type="button"
                      className="ghost"
                      disabled={busy || !connected}
                      onClick={() => void mutate("stop", { task_id: task.id })}
                    >
                      {t("assistant.taskStopRun")}
                    </button>
                  ) : null}
                </div>
              </section>
              <section
                className="assistant-task-details"
                aria-label={t("assistant.taskDetailsAria")}
              >
                <details className="assistant-task-prompt" open>
                  <summary>{t("assistant.taskPromptSummary")}</summary>
                  <p>{task.prompt}</p>
                </details>
                <dl className="assistant-task-metadata">
                  <div>
                    <dt>{t("assistant.taskWorkspacesLegend")}</dt>
                    <dd>
                      {task.all_workspaces ? (
                        <p className="assistant-hint">
                          {t("assistant.taskAllScopeNote")}
                        </p>
                      ) : null}
                      <ul className="assistant-task-workspaces">
                        {task.workspaces.map((ref) => (
                          <li key={workspaceKey(ref)}>
                            <span>{ref.connection_label} / </span>
                            {ref.label}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("assistant.taskModelDt")}</dt>
                    <dd>{task.model.id}</dd>
                  </div>
                  <div>
                    <dt>{t("assistant.taskPermissionsDt")}</dt>
                    <dd>
                      {task.approval_mode === "auto"
                        ? snapshot.config.approval_mode === "auto"
                          ? t("assistant.taskPermHighAuto")
                          : t("assistant.taskPermHighGlobalOff")
                        : t("assistant.taskPermManual")}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("assistant.taskNotificationsLabel")}</dt>
                    <dd>
                      {task.notification_mode === "agent"
                        ? t("assistant.proposalNotifyAgent")
                        : t("assistant.proposalNotifyStatus")}
                    </dd>
                  </div>
                </dl>
              </section>
            </>
          ) : null}
          {loading && (!detail || (runId && !selectedRun)) ? (
            <p className="assistant-hint" role="status">
              <LoaderCircle size={13} className="assistant-spinner" />
              {runId
                ? t("assistant.loadingRunHistory")
                : t("assistant.loadingTaskHistory")}
            </p>
          ) : null}
          {detail ? (
            <section
              className="assistant-task-history"
              aria-label={t("assistant.runHistory")}
            >
              <h4>{t("assistant.runHistory")}</h4>
              {detail.runs.length ? (
                <ThemedSelect
                  aria-label={t("assistant.taskRunAria")}
                  value={runId ?? selectedRun?.id ?? ""}
                  options={detail.runs.map((run) => ({
                    value: run.id,
                    label: `${formatUiDateTime(run.scheduled_at)} / ${run.status}`,
                  }))}
                  onChange={(id) => {
                    if (id === runId) return;
                    setRunId(id);
                    setDetail({ ...detail, run: undefined });
                  }}
                />
              ) : (
                <p className="assistant-task-history-empty">
                  {t("assistant.runHistoryEmpty")}
                </p>
              )}
              {selectedRun ? (
                <div
                  className="assistant-task-run"
                  aria-label={t("assistant.taskRunOutputAria")}
                  aria-busy={liveRun(selectedRun.status)}
                >
                  <div className="assistant-task-run-status" role="status">
                    {t("assistant.runStatus", { status: selectedRun.status })}
                    {selectedRun.started_at
                      ? t("assistant.runStarted", {
                          at: formatUiDateTime(selectedRun.started_at),
                        })
                      : ""}
                  </div>
                  {selectedRun.notice ? (
                    <p className="assistant-hint">{selectedRun.notice}</p>
                  ) : null}
                  {selectedRun.error ? (
                    <p className="assistant-task-error" role="alert">
                      {selectedRun.error}
                    </p>
                  ) : null}
                  {selectedRun.messages.map((message) => (
                    <section
                      className={`assistant-message is-${message.role}`}
                      key={message.id}
                      aria-label={
                        message.role === "assistant"
                          ? t("assistant.runMessageAriaRanger")
                          : t("assistant.runMessageAriaTask")
                      }
                    >
                      <div className="assistant-message-head">
                        <strong>
                          {message.role === "assistant"
                            ? "Ranger"
                            : t("assistant.taskPromptSummary")}
                        </strong>
                        <time dateTime={message.sent_at}>
                          {formatUiDateTime(message.sent_at)}
                        </time>
                      </div>
                      {message.role === "assistant" &&
                      message.thinking?.length ? (
                        <AssistantThinking
                          message={message}
                          active={
                            !message.text &&
                            selectedRun.status === "running" &&
                            message ===
                              selectedRun.messages[
                                selectedRun.messages.length - 1
                              ]
                          }
                        />
                      ) : null}
                      {message.role === "assistant" ? (
                        message.text ? (
                          <MarkdownPreview
                            text={message.text}
                            className="assistant-markdown"
                            breaks
                            imageUrlResolver={() => null}
                          />
                        ) : liveRun(selectedRun.status) ? (
                          // The open reasoning block already reports progress.
                          selectedRun.status === "running" &&
                          message.thinking?.length ? null : (
                            <span className="assistant-hint">
                              {t("assistant.working")}
                            </span>
                          )
                        ) : (
                          <span className="assistant-hint">
                            {t("assistant.noResponseText")}
                          </span>
                        )
                      ) : (
                        <p className="assistant-user-text">{message.text}</p>
                      )}
                      {message.actions?.map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          busy={busy || !connected}
                          running={runBusy}
                          run={async (name, params) =>
                            !!(await mutate(name, {
                              ...params,
                              task_id: detail.task.id,
                              run_id: selectedRun.id,
                            }))
                          }
                        />
                      ))}
                      {message.task_proposals?.map((proposal) => (
                        <TaskProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          busy={busy || !connected}
                          run={async (name, params) =>
                            !!(await mutate(
                              name.replace(/^task\./, ""),
                              params ?? {},
                            ))
                          }
                        />
                      ))}
                      {message.tools.length || message.sources.length ? (
                        <AssistantMessageActivity
                          message={message}
                          running={
                            selectedRun.status === "running" &&
                            message ===
                              selectedRun.messages[
                                selectedRun.messages.length - 1
                              ]
                          }
                          onOpenSource={onOpenSource}
                        />
                      ) : null}
                    </section>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
          <ConfirmDialog
            open={active && confirmation !== null}
            title={
              confirmation === "delete"
                ? t("assistant.confirmDeleteTitle")
                : t("assistant.confirmCancelTitle")
            }
            message={
              confirmation === "delete"
                ? t("assistant.confirmDeleteMessage")
                : t("assistant.confirmCancelMessage")
            }
            confirmLabel={
              confirmation === "delete"
                ? t("assistant.proposalOperationDelete")
                : t("assistant.proposalOperationCancel")
            }
            danger
            onClose={() => setConfirmation(null)}
            onConfirm={() => {
              const action = confirmation;
              setConfirmation(null);
              if (task && action)
                void (async () => {
                  const result = await mutate(action, { task_id: task.id });
                  if (result && action === "delete") select(null);
                })();
            }}
          />
        </>
      )}
    </div>
  );
}
