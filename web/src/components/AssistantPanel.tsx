import {
  ChevronDown,
  ChevronLeft,
  Compass,
  CornerDownRight,
  ExternalLink,
  History,
  ListPlus,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ASSISTANT_MAX_CUSTOM_MODELS,
  ASSISTANT_MAX_WORKSPACES,
  ASSISTANT_THINKING_LEVELS,
  type AssistantAction,
  type AssistantAuthState,
  type AssistantConfig,
  type AssistantMessage,
  type AssistantMentionTarget,
  type AssistantModelConnection,
  type AssistantQueuedMessage,
  type AssistantSnapshot,
  type AssistantSource,
  type AssistantThinkingLevel,
  type AssistantWorkspace,
  type AssistantWorkspaceRef,
} from "../../../shared/assistant";
import { bridge } from "../api";
import type { RangerTaskNotificationTarget } from "../taskNotifications";
import {
  assistantActionExecuting,
  assistantQueueSupported,
  callAssistant,
  getAssistantMentions,
  parseAssistantContext,
  permittedAssistantWorkspaces,
  pruneAssistantWorkspaceRefs,
  reconcileAssistantConfig,
  readAssistantState,
  refreshAssistant,
  sendAssistant,
  setAssistantDraft,
  useAssistantState,
} from "../assistant";
import { formatUiDateTime } from "../uiLocale";
import { t, useT, type TranslationKey } from "../i18n";
import { useStoreSelector } from "../store";
import { MarkdownPreview } from "./markdown";
import { ConfirmDialog } from "./ModalDialogs";
import { ThemedSelect } from "./ThemedSelect";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AssistantChatControls } from "./AssistantChatControls";
import {
  sameAssistantSelection,
  thinkingForModel,
  thinkingLabels,
  thinkingOptions,
} from "../assistantModels";
import { AssistantTasks, TaskProposalCard } from "./AssistantTasks";
import { AssistantMentionComposer } from "./AssistantMentionComposer";
import { AssistantThinking } from "./AssistantThinking";
import { ConversationMinimap } from "./ConversationMinimap";
import { AssistantQueue } from "./AssistantQueue";
import { assistantMentionKey } from "../assistantMentions";
import { detectShortcutPlatform } from "../shortcutBindings";
import "./AssistantPanel.css";
import { credentialStatus } from "../assistantModels";

const altEnter =
  detectShortcutPlatform() === "mac" ? "Option+Enter" : "Alt+Enter";

function workspaceKey(workspace: AssistantWorkspaceRef) {
  return JSON.stringify([workspace.connection_id, workspace.workspace_id]);
}

export function AssistantUserMessage({
  message,
  onOpenMention,
}: {
  message: AssistantMessage;
  onOpenMention: (target: AssistantMentionTarget) => void;
}) {
  let end = 0;
  return (
    <p className="assistant-user-text">
      {message.mentions?.map((mention) => {
        const text = message.text.slice(end, mention.start);
        end = mention.end;
        return (
          <Fragment key={`${mention.start}:${assistantMentionKey(mention)}`}>
            {text}
            <button
              type="button"
              className="assistant-message-mention"
              title={`${mention.connection_label} / ${mention.workspace_label}`}
              onClick={() => onOpenMention(mention)}
            >
              {message.text.slice(mention.start, mention.end)}
            </button>
          </Fragment>
        );
      })}
      {message.text.slice(end)}
    </p>
  );
}

function includesWorkspace(
  workspaces: AssistantWorkspaceRef[],
  workspace: AssistantWorkspaceRef,
) {
  return workspaces.some(
    (item) => workspaceKey(item) === workspaceKey(workspace),
  );
}

function toggleWorkspace(
  workspaces: AssistantWorkspaceRef[],
  workspace: AssistantWorkspaceRef,
) {
  return includesWorkspace(workspaces, workspace)
    ? workspaces.filter(
        (item) => workspaceKey(item) !== workspaceKey(workspace),
      )
    : [
        ...workspaces,
        {
          connection_id: workspace.connection_id,
          workspace_id: workspace.workspace_id,
        },
      ];
}

function connectionReady(snapshot: AssistantSnapshot) {
  return (
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
    )
  );
}

function endpointHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const ACTIVITY_LABEL_KEYS = {
  workspace_status: "assistant.activityWorkspaceStatus",
  workspace_diff: "assistant.activityWorkspaceDiff",
  workspace_terminal: "assistant.activityTerminal",
  workspace_history: "assistant.activityHistory",
  list_ranger_tasks: "assistant.activityRangerTasks",
  send_user_notification: "assistant.activityNotification",
} as const satisfies Record<string, TranslationKey>;

const activityLabel = (name: string) => {
  const key = ACTIVITY_LABEL_KEYS[name as keyof typeof ACTIVITY_LABEL_KEYS];
  return key ? t(key) : name;
};

export function AssistantMessageActivity({
  message,
  running,
  onOpenSource,
}: {
  message: Pick<AssistantMessage, "tools" | "sources">;
  running: boolean;
  onOpenSource: (source: AssistantSource) => void;
}) {
  const t = useT();
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (details.current) details.current.open = running;
  }, [running]);
  return (
    <details className="assistant-tools" ref={details}>
      <summary>
        {running && message.tools.some((tool) => tool.status === "running")
          ? t("assistant.activityReading")
          : t("assistant.activityWork")}{" "}
        ({message.tools.length + message.sources.length})
      </summary>
      {message.tools.length ? (
        <ul>
          {message.tools.map((tool) => (
            <li key={tool.id}>
              <details className="assistant-activity-card assistant-tool-details">
                <summary>
                  <span>{activityLabel(tool.name)}</span>
                  <span className={`assistant-tool-state is-${tool.status}`}>
                    {tool.status}
                  </span>
                </summary>
                <div className="assistant-tool-content">
                  {tool.arguments !== undefined ? (
                    <>
                      <strong>{t("assistant.activityArguments")}</strong>
                      <pre tabIndex={0}>{tool.arguments}</pre>
                    </>
                  ) : null}
                  {tool.output !== undefined ? (
                    <>
                      <strong>
                        {tool.status === "failed"
                          ? t("assistant.activityError")
                          : t("assistant.activityResult")}
                      </strong>
                      <pre tabIndex={0}>{tool.output}</pre>
                    </>
                  ) : null}
                  {tool.arguments === undefined && tool.output === undefined ? (
                    <p className="assistant-hint">
                      {t("assistant.activityCallUnavailable")}
                    </p>
                  ) : null}
                  {tool.arguments !== undefined && tool.output === undefined ? (
                    <p className="assistant-hint">
                      {tool.status === "running"
                        ? t("assistant.activityResultPending")
                        : t("assistant.activityResultUnavailable")}
                    </p>
                  ) : null}
                  {tool.arguments === undefined && tool.output !== undefined ? (
                    <p className="assistant-hint">
                      {t("assistant.activityArgsUnavailable")}
                    </p>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : null}
      {message.sources.length ? (
        <div
          className="assistant-sources"
          aria-label={t("assistant.sourcesAria")}
        >
          {message.sources.map((source) => (
            <button
              type="button"
              key={source.id}
              className="assistant-activity-card"
              onClick={() => onOpenSource(source)}
            >
              <span>
                <ExternalLink size={12} /> {source.title}
              </span>
              <small>
                {activityLabel(`workspace_${source.kind}`)} &middot;{" "}
                {t("assistant.sourceRead", {
                  time: formatUiDateTime(source.read_at),
                })}
              </small>
            </button>
          ))}
        </div>
      ) : null}
    </details>
  );
}

function AssistantModelForm({
  config,
  provider,
  providers,
  selectedModel,
  adding,
  tasksRunning,
  disabled,
  onCancel,
  onSave,
}: {
  config: AssistantConfig;
  provider: AssistantSnapshot["providers"][number] | undefined;
  providers: AssistantSnapshot["providers"];
  selectedModel: AssistantSnapshot["models"][number] | undefined;
  /** Adding starts with no IDs but keeps the selected custom endpoint. */
  adding: boolean;
  tasksRunning: boolean;
  disabled: boolean;
  onCancel(): void;
  onSave(input: AssistantModelConnection): Promise<boolean>;
}) {
  const custom = selectedModel?.custom ?? provider?.custom;
  const [providerId, setProviderId] = useState(
    custom ? (provider?.id ?? "") : "",
  );
  const [model, setModel] = useState(custom && !adding ? config.model : "");
  const [baseUrl, setBaseUrl] = useState(custom?.base_url ?? "");
  const [api, setApi] = useState(custom?.api ?? "openai-completions");
  const [apiKey, setApiKey] = useState("");
  const [thinkingLevels, setThinkingLevels] = useState<
    AssistantThinkingLevel[] | undefined
  >();
  const models = [
    ...new Set(
      model
        .split(/[,\r\n]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  const keySaved = providers.some(
    (item) => item.id === providerId.trim() && item.configured,
  );
  const savedModel =
    providerId.trim() === selectedModel?.provider &&
    models.length === 1 &&
    models[0] === selectedModel.id
      ? selectedModel
      : undefined;
  const supportedLevels =
    thinkingLevels ??
    savedModel?.thinking_levels ??
    (savedModel?.custom?.reasoning
      ? ASSISTANT_THINKING_LEVELS.slice(0, 5)
      : ["off"]);
  const t = useT();
  return (
    <form
      className="assistant-custom-model"
      aria-label={t("assistant.customModelFormAria")}
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          disabled ||
          tasksRunning ||
          !models.length ||
          models.length > ASSISTANT_MAX_CUSTOM_MODELS ||
          !supportedLevels.length
        )
          return;
        if (
          await onSave({
            provider: providerId.trim(),
            model: models[0]!,
            ...(models.length > 1 ? { models } : {}),
            base_url: baseUrl.trim(),
            api,
            ...(apiKey ? { api_key: apiKey } : {}),
            ...(thinkingLevels ? { thinking_levels: thinkingLevels } : {}),
            credential_source: config.credential_source,
          })
        ) {
          setApiKey("");
          setThinkingLevels(undefined);
        }
      }}
    >
      <div className="assistant-settings-body">
        <fieldset disabled={disabled || tasksRunning}>
          <section
            className="assistant-settings-section"
            aria-label={t("assistant.customModelsSectionAria")}
          >
            <h4>{t("assistant.modelsHeading")}</h4>
            <label className="form-field">
              <span className="assistant-field-heading">
                <span>{t("assistant.modelIdsLabel")}</span>
                <small
                  className={
                    models.length > ASSISTANT_MAX_CUSTOM_MODELS
                      ? "is-invalid"
                      : undefined
                  }
                >
                  {models.length} / {ASSISTANT_MAX_CUSTOM_MODELS}
                </small>
              </span>
              <textarea
                aria-label={t("assistant.customModelIdsAria")}
                aria-describedby="assistant-custom-model-ids-hint"
                aria-invalid={models.length > ASSISTANT_MAX_CUSTOM_MODELS}
                required
                rows={3}
                autoFocus
                maxLength={ASSISTANT_MAX_CUSTOM_MODELS * 501}
                autoComplete="off"
                spellCheck={false}
                placeholder="your-model-id"
                value={model}
                onChange={(event) => setModel(event.currentTarget.value)}
              />
            </label>
            <p className="assistant-hint" id="assistant-custom-model-ids-hint">
              {t("assistant.modelIdsHint", {
                max: ASSISTANT_MAX_CUSTOM_MODELS,
              })}
            </p>
            <fieldset
              className="assistant-thinking-levels"
              aria-label={t("assistant.thinkingLevelsAria")}
              aria-describedby="assistant-custom-thinking-hint"
            >
              <legend>{t("assistant.thinkingLevelsLegend")}</legend>
              <div>
                {ASSISTANT_THINKING_LEVELS.map((level) => (
                  <label key={level}>
                    <input
                      type="checkbox"
                      aria-label={t("assistant.supportThinkingAria", {
                        label: thinkingLabels[level],
                      })}
                      checked={supportedLevels.includes(level)}
                      onChange={(event) =>
                        setThinkingLevels(
                          ASSISTANT_THINKING_LEVELS.filter((item) =>
                            item === level
                              ? event.currentTarget.checked
                              : supportedLevels.includes(item),
                          ),
                        )
                      }
                    />
                    <span>{thinkingLabels[level]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="assistant-hint" id="assistant-custom-thinking-hint">
              {t("assistant.thinkingHint")}
            </p>
            {!supportedLevels.length ? (
              <p className="assistant-hint is-error" role="alert">
                {t("assistant.selectAtLeastOne")}
              </p>
            ) : null}
          </section>
          <section
            className="assistant-settings-section"
            aria-label={t("assistant.endpointSectionAria")}
          >
            <h4>{t("assistant.endpointHeading")}</h4>
            <label className="form-field">
              <span>{t("assistant.providerIdLabel")}</span>
              <input
                aria-label={t("assistant.customProviderIdAria")}
                required
                maxLength={64}
                pattern="[a-zA-Z0-9][a-zA-Z0-9_.:-]*"
                autoComplete="off"
                spellCheck={false}
                placeholder="my-provider"
                value={providerId}
                onChange={(event) => setProviderId(event.currentTarget.value)}
              />
            </label>
            <label className="form-field">
              <span>{t("assistant.apiFormatLabel")}</span>
              <ThemedSelect
                aria-label={t("assistant.customApiFormatAria")}
                value={api}
                options={[
                  {
                    value: "openai-completions",
                    label: "OpenAI Chat Completions",
                  },
                  { value: "openai-responses", label: "OpenAI Responses" },
                  { value: "anthropic-messages", label: "Anthropic Messages" },
                ]}
                onChange={(value) => setApi(value as typeof api)}
              />
            </label>
            <label className="form-field">
              <span>{t("assistant.apiBaseUrlLabel")}</span>
              <input
                type="url"
                aria-label={t("assistant.customApiBaseUrlAria")}
                required
                maxLength={2000}
                autoComplete="off"
                spellCheck={false}
                placeholder="https://api.example.com/v1"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.currentTarget.value)}
              />
            </label>
            <label className="form-field">
              <span>{t("assistant.apiKeyLabel")}</span>
              <input
                type="password"
                aria-label={t("assistant.customApiKeyAria")}
                required={!keySaved}
                maxLength={10000}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={
                  keySaved
                    ? t("assistant.apiKeyKeepPlaceholder")
                    : t("assistant.apiKeyLabel")
                }
                value={apiKey}
                onChange={(event) => setApiKey(event.currentTarget.value)}
              />
            </label>
            <p className="assistant-hint">
              {config.credential_source === "pi"
                ? t("assistant.keySavedPi")
                : t("assistant.keySavedAssistant")}{" "}
              {t("assistant.dummyKeyHint")}
            </p>
          </section>
          {tasksRunning ? (
            <p className="assistant-hint">{t("assistant.tasksRunningHint")}</p>
          ) : null}
        </fieldset>
      </div>
      <div className="assistant-settings-save assistant-settings-actions">
        <button
          type="button"
          className="ghost"
          aria-label={t("assistant.cancelCustomAria")}
          disabled={disabled}
          onClick={onCancel}
        >
          {t("history.cancel")}
        </button>
        <button
          className="assistant-settings-primary"
          type="submit"
          disabled={
            disabled ||
            tasksRunning ||
            !models.length ||
            models.length > ASSISTANT_MAX_CUSTOM_MODELS ||
            !supportedLevels.length
          }
        >
          {t("assistant.saveCustomModels")}
        </button>
      </div>
    </form>
  );
}

const ACTION_NAME_KEYS = {
  create_workspace: "assistant.actionCreateWorkspace",
  create_worktree: "assistant.actionCreateWorktree",
  create_tab: "assistant.actionCreateTab",
  split_pane: "assistant.actionSplitPane",
  start_agent: "assistant.actionStartAgent",
  send_prompt: "assistant.actionSendPrompt",
  close_workspace: "assistant.actionCloseWorkspace",
  close_pane: "assistant.actionClosePane",
  close_agent: "assistant.actionCloseAgent",
} as const satisfies Record<AssistantAction["kind"], TranslationKey>;

const actionName = (kind: AssistantAction["kind"]) => t(ACTION_NAME_KEYS[kind]);

const ACTION_STATUS_KEYS = {
  pending: "assistant.statusPending",
  executing: "assistant.statusExecuting",
  succeeded: "assistant.statusSucceeded",
  failed: "assistant.statusFailed",
  uncertain: "assistant.statusUncertain",
  cancelled: "assistant.statusCancelled",
} as const satisfies Record<AssistantAction["status"], TranslationKey>;

const actionStatus = (status: AssistantAction["status"]) =>
  t(ACTION_STATUS_KEYS[status]);

const ACTION_FIELD_KEYS = {
  cwd: "assistant.fieldCwd",
  label: "assistant.fieldLabel",
  branch: "assistant.fieldBranch",
  pane_id: "assistant.fieldPaneId",
  tab_id: "assistant.fieldTabId",
  terminal_id: "assistant.fieldTerminalId",
  direction: "assistant.fieldDirection",
  pane_count: "assistant.fieldPaneCount",
  panes: "assistant.fieldPanes",
  closes_workspace: "assistant.fieldClosesWorkspace",
  agent: "assistant.fieldAgent",
  name: "assistant.fieldName",
  prompt: "assistant.fieldPrompt",
  base: "assistant.fieldBase",
  setup_hook: "assistant.fieldSetupHook",
  setup_hook_enabled: "assistant.fieldSetupHookEnabled",
} as const satisfies Record<string, TranslationKey>;

const actionField = (key: string) => {
  const fieldKey = ACTION_FIELD_KEYS[key as keyof typeof ACTION_FIELD_KEYS];
  return fieldKey ? t(fieldKey) : key;
};

export function ActionCard({
  action,
  busy,
  running,
  run,
}: {
  action: AssistantAction;
  busy: boolean;
  running: boolean;
  run: (action: string, params?: Record<string, unknown>) => Promise<boolean>;
}) {
  const t = useT();
  const name = actionName(action.kind);
  const isPrompt = action.kind === "send_prompt";
  const isPaneClose =
    action.kind === "close_pane" || action.kind === "close_agent";
  const isAgentAction = isPrompt || action.kind === "start_agent";
  const acceptedPrompt =
    isPrompt &&
    action.status === "uncertain" &&
    action.detail ===
      "Herdr accepted the prompt. Delivery and the agent's response have not been independently verified. Do not resend automatically.";
  const details = (
    <dl
      className="assistant-action-details"
      aria-label={t("assistant.actionDetailsAria", { name })}
      tabIndex={0}
    >
      <dt>{t("assistant.dtConnection")}</dt>
      <dd>
        {action.connection_label}
        <small>{action.connection_id}</small>
      </dd>
      <dt>{t("assistant.dtWorkspace")}</dt>
      <dd>
        {action.workspace_label}
        <small>{action.workspace_id}</small>
      </dd>
      {!isAgentAction ? (
        <>
          <dt>{t("assistant.dtProposed")}</dt>
          <dd>
            <time dateTime={action.created_at}>
              {formatUiDateTime(action.created_at)}
            </time>
          </dd>
        </>
      ) : null}
      {Object.entries(action.params)
        .filter(
          ([key]) =>
            !(isPrompt && key === "prompt") &&
            (key !== "terminal_id" ||
              action.kind === "create_tab" ||
              action.kind === "split_pane" ||
              isPaneClose),
        )
        .map(([key, value]) => (
          <Fragment key={key}>
            <dt>
              {key === "cwd" && action.kind === "create_worktree"
                ? t("assistant.sourceRepository")
                : key === "pane_id" &&
                    (action.kind === "create_tab" ||
                      action.kind === "split_pane")
                  ? t("assistant.sourcePane")
                  : key === "terminal_id" && isPaneClose
                    ? t("assistant.targetTerminal")
                    : actionField(key)}
            </dt>
            <dd>
              <pre>
                {key === "setup_hook_enabled" &&
                (value === "true" || value === "false")
                  ? value === "true"
                    ? t("assistant.valueEnabled")
                    : t("assistant.valueDisabled")
                  : key === "closes_workspace"
                    ? value === "true"
                      ? t("assistant.valueYes")
                      : t("assistant.valueNo")
                    : key === "direction" && action.kind === "split_pane"
                      ? value === "right"
                        ? t("assistant.directionRight")
                        : value === "down"
                          ? t("assistant.directionDown")
                          : value
                      : value}
              </pre>
            </dd>
          </Fragment>
        ))}
    </dl>
  );
  return (
    <div
      className={`assistant-action-card is-${action.status}${isAgentAction ? " is-agent-action" : ""}${isPrompt ? " is-prompt" : ""}`}
      role="group"
      aria-label={t("assistant.proposalAria", { name })}
      tabIndex={-1}
    >
      <div className="assistant-action-head">
        <strong>{name}</strong>
        <span role="status">
          {isPrompt && action.status === "uncertain"
            ? t("assistant.statusUnverified")
            : actionStatus(action.status)}
        </span>
      </div>
      {isAgentAction ? (
        <>
          <div className="assistant-action-target assistant-prompt-target">
            <strong>{action.workspace_label}</strong>
            <span>{action.connection_label}</span>
            <code>{action.params.pane_id}</code>
            {action.params.agent ? <code>{action.params.agent}</code> : null}
          </div>
          {!isPrompt && action.params.name ? (
            <div className="assistant-action-agent-name">
              {t("assistant.namePrefix")} <code>{action.params.name}</code>
            </div>
          ) : null}
          {action.status === "pending" ? (
            <p className="assistant-action-note assistant-prompt-note">
              {isPrompt
                ? t("assistant.promptReviewNote")
                : t("assistant.startAgentNote")}
            </p>
          ) : null}
          {isPrompt ? (
            <details
              className="assistant-prompt-content"
              open={
                action.status === "pending" || action.status === "executing"
              }
            >
              <summary>
                {t("assistant.promptLabel")}
                <span>
                  {t("assistant.promptCharacters", {
                    count: action.params.prompt?.length ?? 0,
                  })}
                </span>
              </summary>
              <pre aria-label={t("assistant.exactPromptAria")} tabIndex={0}>
                {action.params.prompt}
              </pre>
            </details>
          ) : null}
          <details className="assistant-action-meta">
            <summary>
              {t("assistant.detailsLabel")}
              <time dateTime={action.created_at}>
                {formatUiDateTime(action.created_at)}
              </time>
            </summary>
            {details}
            {!isPrompt ? <p>{action.summary}</p> : null}
            {acceptedPrompt ? <p>{action.detail}</p> : null}
          </details>
        </>
      ) : (
        <>
          <p>{action.summary}</p>
          {details}
        </>
      )}
      {action.detail ? (
        <p
          role="status"
          className={
            isAgentAction
              ? "assistant-action-note assistant-prompt-note"
              : undefined
          }
        >
          {acceptedPrompt ? t("assistant.acceptedNote") : action.detail}
        </p>
      ) : null}
      {action.status === "pending" ? (
        <div className="assistant-action-buttons">
          <button
            type="button"
            disabled={busy || running}
            onClick={(event) => {
              if (busy || running) return;
              event.currentTarget
                .closest<HTMLElement>(".assistant-action-card")
                ?.focus({ preventScroll: true });
              void run("action.confirm", { action_id: action.id });
            }}
          >
            {t("assistant.confirmAction")}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={busy || running}
            onClick={(event) => {
              if (busy || running) return;
              event.currentTarget
                .closest<HTMLElement>(".assistant-action-card")
                ?.focus({ preventScroll: true });
              void run("action.cancel", { action_id: action.id });
            }}
          >
            {t("history.cancel")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function assistantAuthUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function AuthCard({
  auth,
  label,
  busy,
  run,
}: {
  auth: AssistantAuthState;
  label: string;
  busy: boolean;
  run: (action: string, params?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [value, setValue] = useState(auth.prompt?.options?.[0]?.id ?? "");
  const url = assistantAuthUrl(auth.url);
  const pending = auth.status === "waiting" || auth.status === "working";
  const t = useT();
  return (
    <div
      className="assistant-auth-card"
      aria-label={t("assistant.modelLoginAria")}
    >
      <strong>
        {auth.status === "completed"
          ? t("assistant.authConnected", { label })
          : t("assistant.authConnect", { label })}
      </strong>
      <p role="status">{auth.message}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {t("assistant.openSignIn")} <ExternalLink size={13} />
        </a>
      ) : null}
      {auth.user_code ? (
        <div className="assistant-device-code">
          <span>{t("assistant.enterCode")}</span>
          <code>{auth.user_code}</code>
        </div>
      ) : null}
      {auth.prompt && pending ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !value.trim()) return;
            const submitted = value;
            setValue("");
            await run("auth.respond", {
              auth_id: auth.id,
              prompt_id: auth.prompt!.id,
              value: submitted,
            });
          }}
        >
          <label className="form-field">
            <span>{auth.prompt.message}</span>
            {auth.prompt.type === "select" ? (
              <ThemedSelect
                value={value}
                options={(auth.prompt.options ?? []).map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                aria-label={auth.prompt.message}
                onChange={setValue}
              />
            ) : (
              <input
                autoFocus
                type={
                  auth.prompt.type === "secret" ||
                  auth.prompt.type === "manual_code"
                    ? "password"
                    : "text"
                }
                value={value}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={busy}
                onChange={(event) => setValue(event.currentTarget.value)}
              />
            )}
          </label>
          <button type="submit" disabled={busy || !value.trim()}>
            {t("assistant.continueLabel")}
          </button>
        </form>
      ) : null}
      {pending ? (
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => void run("auth.cancel", { auth_id: auth.id })}
        >
          {t("assistant.cancelLogin")}
        </button>
      ) : null}
      {auth.status === "failed" ? (
        <span className="assistant-hint">{t("assistant.authRetryHint")}</span>
      ) : null}
    </div>
  );
}

export function AssistantPanel({
  open,
  floating,
  mobile,
  requestedTask,
  onRequestedTaskHandled,
  onClose,
  onToggleFloating,
  onOpenSource,
}: {
  open: boolean;
  floating: boolean;
  mobile: boolean;
  requestedTask?: RangerTaskNotificationTarget | null;
  onRequestedTaskHandled?: () => void;
  onClose: () => void;
  onToggleFloating: () => void;
  onOpenSource: (source: AssistantSource) => void;
}) {
  const t = useT();
  const state = useAssistantState();
  const snapshot = state.snapshot;
  const currentConnectionId = useStoreSelector(
    (state) => state.activeConnectionId,
  );
  const currentWorkspaceId = useStoreSelector(
    (state) =>
      state.workspaces.find((workspace) => workspace.focused)?.workspace_id,
  );
  const connectionSignature = useStoreSelector((snapshot) =>
    snapshot.connections
      .map(({ id, state, generation }) =>
        JSON.stringify([id, state, generation]),
      )
      .sort()
      .join(","),
  );
  // Start with setup when needed, then respect the user's chosen panel.
  const [settingsOpen, setSettingsOpen] = useState<boolean | null>(null);
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [workspaces, setWorkspaces] = useState<AssistantWorkspace[]>([]);
  const [contextErrors, setContextErrors] = useState<string[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [view, setView] = useState<"chat" | "tasks">("chat");
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [maximumWidth, setMaximumWidth] = useState(380);
  const [contextTruncated, setContextTruncated] = useState(false);
  // Settings is one page; only the custom model editor replaces it.
  const [modelEditor, setModelEditor] = useState<"add" | "edit" | null>(null);
  useEffect(() => {
    if (!requestedTask) return;
    setSettingsOpen(false);
    setHistoryOpen(false);
    setView("tasks");
  }, [requestedTask]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const followingOutput = useRef(true);
  const minimapEntries = useMemo(
    () =>
      (snapshot?.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        label: message.role === "user" ? t("history.labelYou") : "Ranger",
        text: message.text,
      })),
    [snapshot?.messages, t],
  );
  const pinMinimapLayout = useCallback(() => {
    if (followingOutput.current && listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, []);
  const jumpToMinimapEntry = useCallback((index: number) => {
    const list = listRef.current;
    const sequence = String(index + 1);
    const section = Array.from(list?.children ?? []).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.dataset.sequence === sequence,
    );
    if (!list || !section) return;
    followingOutput.current = false;
    // Jump only this scroll container, in CSS pixels even when the UI is
    // zoomed. An immediate jump also avoids re-enabling stream following
    // mid-animation.
    const viewport = list.getBoundingClientRect();
    const scale = list.offsetHeight ? viewport.height / list.offsetHeight : 1;
    list.scrollTop +=
      (section.getBoundingClientRect().top - viewport.top) / (scale || 1) - 12;
  }, []);
  const composing = useRef(false);
  const pendingAction = useRef(false);
  const contextSequence = useRef(0);
  const savedWorkspaceGrants = JSON.stringify([
    snapshot?.instance_id,
    snapshot?.config.allowed_workspaces,
  ]);
  const latestSavedWorkspaceGrants = useRef(savedWorkspaceGrants);
  latestSavedWorkspaceGrants.current = savedWorkspaceGrants;
  const previousConfig = useRef<{
    instanceId: string;
    config: AssistantConfig;
  } | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const resizeStart = useRef<{
    pointerId: number;
    x: number;
    width: number;
    scale: number;
  } | null>(null);
  const settingsHeadingRef = useRef<HTMLHeadingElement>(null);
  const settingsReturnTarget = useRef<"add" | "edit" | null>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement>(null);
  const chatScrollTop = useRef(0);
  const closeModelEditor = () => setModelEditor(null);
  const width = Math.min(panelWidth, maximumWidth);
  const resizePanel = (next: number) =>
    setPanelWidth(Math.min(maximumWidth, Math.max(300, next)));
  useEffect(() => {
    const surfaces = panelRef.current?.parentElement;
    if (!open || !surfaces) return;
    const update = () => {
      const annotations = surfaces.querySelector<HTMLElement>(
        ":scope > .annotation-panel:not(.is-floating)",
      );
      setMaximumWidth(
        Math.max(
          380,
          surfaces.clientWidth -
            (annotations?.offsetWidth ?? 0) -
            (annotations ? 16 : 8) -
            240,
        ),
      );
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(surfaces);
    const stage = surfaces.querySelector(".workspace-stage");
    if (stage) observer.observe(stage);
    return () => observer.disconnect();
  }, [open, floating, mobile, maximized]);
  const savedConfig = snapshot
    ? JSON.stringify({
        provider: snapshot.config.provider,
        model: snapshot.config.model,
        thinking_level: snapshot.config.thinking_level,
        credential_source: snapshot.config.credential_source,
        allowed_workspaces: snapshot.config.allowed_workspaces,
        approval_mode: snapshot.config.approval_mode,
        workspace_scope: snapshot.config.workspace_scope,
      })
    : "";
  const highPermission = snapshot?.config.approval_mode === "auto";
  const allWorkspacesAllowed =
    highPermission && snapshot?.config.workspace_scope === "all";
  const connected = state.connectionStatus === "connected";
  const ready = !!snapshot && connectionReady(snapshot);
  const showSettings = settingsOpen ?? (!!snapshot && !ready);
  useEffect(() => {
    if (!open || !showSettings) return;
    if (modelEditor) {
      // The ID field autofocuses; disabled editors focus their heading instead.
      if (
        panelRef.current
          ?.querySelector<HTMLTextAreaElement>(
            `[aria-label="${t("assistant.customModelIdsAria")}"]`,
          )
          ?.closest("fieldset:disabled")
      )
        settingsHeadingRef.current?.focus({ preventScroll: true });
    } else if (settingsReturnTarget.current) {
      (
        panelRef.current?.querySelector<HTMLButtonElement>(
          `[data-settings-return="${settingsReturnTarget.current}"]`,
        ) ??
        panelRef.current?.querySelector<HTMLButtonElement>(
          '[data-settings-return="add"]',
        )
      )?.focus();
      settingsReturnTarget.current = null;
    }
  }, [open, showSettings, modelEditor, t]);
  const authPending =
    snapshot?.auth?.status === "waiting" ||
    snapshot?.auth?.status === "working";
  const executing = assistantActionExecuting(snapshot);
  const [headerStatus, headerTone] = !connected
    ? [t("assistant.statusReconnecting"), "warning"]
    : executing
      ? [t("assistant.statusExecutingAction"), "busy"]
      : snapshot?.running
        ? [t("assistant.statusWorking"), "busy"]
        : [t("assistant.statusIdle"), "idle"];
  const modelLabel =
    snapshot?.models.find(
      (model) =>
        model.provider === snapshot.config.provider &&
        model.id === snapshot.config.model,
    )?.label ?? snapshot?.config.model;
  const operationBusy = busy || executing;
  const queueSupported = assistantQueueSupported(snapshot);
  const completedActions = (snapshot?.messages ?? [])
    .flatMap((message) => message.actions ?? [])
    .filter((action) => !["pending", "executing"].includes(action.status))
    .map((action) => `${action.id}:${action.status}`)
    .join(",");
  const authorizedScope = (
    available: AssistantWorkspace[],
    config = snapshot?.config,
  ) =>
    permittedAssistantWorkspaces(config, available).map(
      ({ connection_id, workspace_id, runtime_generation }) => ({
        connection_id,
        workspace_id,
        runtime_generation,
      }),
    );
  const scope =
    allWorkspacesAllowed && contextTruncated ? [] : authorizedScope(workspaces);
  const truncatedScopeMessage = t("assistant.truncatedScope");
  const unavailableScopeMessage =
    allWorkspacesAllowed && contextTruncated
      ? truncatedScopeMessage
      : t("assistant.noAuthorizedWorkspaces");

  useEffect(() => {
    if (!savedConfig) return;
    const saved = JSON.parse(savedConfig) as AssistantConfig;
    const previous = previousConfig.current;
    setConfig((draft) =>
      reconcileAssistantConfig(
        draft,
        previous && previous.instanceId === snapshot?.instance_id
          ? previous.config
          : undefined,
        saved,
      ),
    );
    previousConfig.current = {
      instanceId: snapshot!.instance_id,
      config: saved,
    };
  }, [savedConfig, snapshot?.instance_id]);

  const loadContext = async () => {
    if (!connected || !state.supported) return;
    const sequence = ++contextSequence.current;
    const requestedSavedGrants = savedWorkspaceGrants;
    const requestedDraftGrants = JSON.stringify(config?.allowed_workspaces);
    setContextLoading(true);
    setContextErrors([]);
    try {
      const result = parseAssistantContext(
        await bridge.call("bridge.assistant.context"),
      );
      if (sequence === contextSequence.current) {
        setWorkspaces(result.workspaces);
        setContextErrors(result.errors);
        setContextTruncated(result.truncated ?? false);
        setConfig((draft) => {
          const current = readAssistantState().snapshot;
          const currentSavedGrants = current
            ? JSON.stringify([
                current.instance_id,
                current.config.allowed_workspaces,
              ])
            : latestSavedWorkspaceGrants.current;
          // A complete listing still predates grants checked locally or pushed
          // from another client while this request was in flight. Only prune
          // the unchanged draft that the request originally observed.
          if (
            !draft ||
            requestedSavedGrants !== currentSavedGrants ||
            requestedDraftGrants !== JSON.stringify(draft.allowed_workspaces)
          )
            return draft;
          return {
            ...draft,
            allowed_workspaces: pruneAssistantWorkspaceRefs(
              draft.allowed_workspaces,
              result,
            ),
          };
        });
      }
      return result;
    } catch (cause) {
      if (sequence === contextSequence.current)
        setContextErrors([
          cause instanceof Error ? cause.message : String(cause),
        ]);
    } finally {
      if (sequence === contextSequence.current) setContextLoading(false);
    }
  };

  useEffect(() => {
    const sequence = contextSequence;
    if (open && connected && state.supported) void loadContext();
    return () => {
      sequence.current++;
    };
    // Refresh when hosts change or actions finish, keeping unsaved config intact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    connected,
    state.supported,
    completedActions,
    connectionSignature,
    snapshot?.instance_id,
  ]);

  useEffect(() => {
    if (executing || snapshot?.running) {
      setConfirmNew(false);
      setConfirmApproval(false);
    }
  }, [executing, snapshot?.running]);

  useEffect(() => {
    followingOutput.current = true;
    setHistoryOpen(false);
    setConfirmNew(false);
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [snapshot?.session_id]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = followingOutput.current
      ? listRef.current.scrollHeight
      : chatScrollTop.current;
  }, [open, snapshot?.messages, showSettings, view, historyOpen]);

  useEffect(() => {
    setPermissionsOpen(false);
    if (!open || showSettings || view !== "chat") return;
    if (historyOpen) historyHeadingRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [open, showSettings, view, historyOpen]);

  const run = async (action: string, params: Record<string, unknown> = {}) => {
    if (
      pendingAction.current ||
      (executing &&
        action !== "stop" &&
        action !== "configure_approval" &&
        action !== "configure_chat" &&
        !action.startsWith("task.")) ||
      ((action === "action.confirm" || action === "action.cancel") &&
        snapshot?.running) ||
      ((action === "new_session" || action === "select_session") &&
        (!connected || snapshot?.running || authPending))
    )
      return false;
    pendingAction.current = true;
    setBusy(true);
    setError(null);
    try {
      await callAssistant(action, params);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      if (action === "configure_chat") await refreshAssistant().catch(() => {});
      return false;
    } finally {
      pendingAction.current = false;
      setBusy(false);
    }
  };

  /** While Ranger answers, Enter steers the turn and Alt+Enter queues. */
  const submit = async (queueMessage = false) => {
    const whenBusy = snapshot?.running
      ? queueMessage
        ? ("queue" as const)
        : ("steer" as const)
      : undefined;
    if (
      pendingAction.current ||
      !connected ||
      !ready ||
      authPending ||
      (snapshot?.running && !queueSupported) ||
      executing ||
      !state.draft.trim() ||
      !scope.length ||
      composing.current
    )
      return;
    pendingAction.current = true;
    setBusy(true);
    setError(null);
    followingOutput.current = true;
    try {
      const available = await loadContext();
      if (!available) throw new Error(t("assistant.refreshScopeFailed"));
      const current = readAssistantState().snapshot;
      if (
        current?.instance_id !== snapshot?.instance_id ||
        current?.session_id !== snapshot?.session_id
      )
        throw new Error(t("assistant.chatChanged"));
      if (
        snapshot?.chat_selection &&
        !sameAssistantSelection(current, snapshot)
      )
        throw new Error(t("assistant.modelChanged"));
      if (
        current?.config.approval_mode === "auto" &&
        current.config.workspace_scope === "all" &&
        available.truncated
      )
        throw new Error(truncatedScopeMessage);
      const scope = authorizedScope(available.workspaces, current?.config);
      if (!scope.length) throw new Error(unavailableScopeMessage);
      if (state.draftMentions?.length || whenBusy)
        await sendAssistant(
          state.draft,
          scope,
          state.draftMentions ?? [],
          whenBusy,
        );
      else await sendAssistant(state.draft, scope);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      pendingAction.current = false;
      setBusy(false);
    }
  };

  const editQueued = async (item: AssistantQueuedMessage) => {
    if (!(await run("queue.remove", { id: item.id }))) return;
    const { draft, draftMentions } = readAssistantState();
    const prefix = draft.trim() ? `${draft.trimEnd()}\n\n` : "";
    setAssistantDraft(`${prefix}${item.text}`, [
      ...(prefix ? (draftMentions ?? []) : []),
      ...(item.mentions ?? []).map((mention) => ({
        ...mention,
        start: mention.start + prefix.length,
        end: mention.end + prefix.length,
      })),
    ]);
    inputRef.current?.focus({ preventScroll: true });
  };

  const openMention = async (target: AssistantMentionTarget) => {
    setError(null);
    try {
      const catalog = await getAssistantMentions([
        {
          connection_id: target.connection_id,
          workspace_id: target.workspace_id,
        },
      ]);
      if (
        !catalog.targets.some(
          (current) =>
            assistantMentionKey(current) === assistantMentionKey(target),
        )
      )
        throw new Error(t("assistant.mentionUnavailable"));
      onOpenSource({
        id: assistantMentionKey(target),
        title: target.label,
        kind: target.kind === "agent" ? "history" : "status",
        connection_id: target.connection_id,
        workspace_id: target.workspace_id,
        runtime_generation: target.runtime_generation,
        ...(target.kind === "agent" ? { pane_id: target.pane_id } : {}),
        read_at: new Date().toISOString(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  if (!open) return null;

  const displayedError = error || state.error || snapshot?.error;
  const historySupported = !!snapshot?.session_id && !!snapshot.sessions;
  const sessions = [...(snapshot?.sessions ?? [])].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
  const currentSession = sessions.find(
    (session) => session.id === snapshot?.session_id,
  );
  const historyBlocked =
    operationBusy || !!snapshot?.running || !connected || !!authPending;
  const provider = snapshot?.providers.find(
    (item) => item.id === config?.provider,
  );
  // Saved credentials first, then the long tail of providers to sign in to.
  const providerOptions = [
    ...(snapshot?.providers ?? []).filter((item) => item.configured),
    ...(snapshot?.providers ?? [])
      .filter((item) => !item.configured)
      .sort((a, b) => a.label.localeCompare(b.label)),
  ].map((item) => ({
    value: item.id,
    label: item.label,
    detail: credentialStatus(item),
    keywords: [item.id],
  }));
  const modelOptions = (snapshot?.models ?? [])
    .filter((model) => model.provider === config?.provider)
    .map((model) => ({ value: model.id, label: model.label }));
  const selectedModel = snapshot?.models.find(
    (model) =>
      model.provider === config?.provider && model.id === config?.model,
  );
  const customEndpoint = selectedModel?.custom ?? provider?.custom;
  const workspaceSet = (refs: AssistantWorkspaceRef[]) =>
    refs.map(workspaceKey).sort().join("\n");
  const unavailableWorkspaces = (config?.allowed_workspaces ?? []).filter(
    (ref) => !includesWorkspace(workspaces, ref),
  );
  const settingsChanged =
    !!snapshot &&
    !!config &&
    (config.provider !== snapshot.config.provider ||
      config.model !== snapshot.config.model ||
      config.thinking_level !== snapshot.config.thinking_level ||
      workspaceSet(config.allowed_workspaces) !==
        workspaceSet(snapshot.config.allowed_workspaces));
  const modelLocked =
    operationBusy || !!snapshot?.running || !connected || !!authPending;
  const permittedWorkspaces = permittedAssistantWorkspaces(
    snapshot?.config,
    workspaces,
  );
  const allAllowedWorkspaces = Array.from(
    new Map(
      [...(config?.allowed_workspaces ?? []), ...workspaces].map(
        (workspace) => [
          workspaceKey(workspace),
          {
            connection_id: workspace.connection_id,
            workspace_id: workspace.workspace_id,
          },
        ],
      ),
    ).values(),
  );

  return (
    <aside
      ref={panelRef}
      className={`assistant-panel ${floating ? "is-floating" : ""} ${mobile ? "is-mobile" : maximized ? "is-maximized" : ""}`}
      style={{ "--assistant-panel-width": `${width}px` } as CSSProperties}
      aria-label="Ranger"
      onKeyDown={(event) => {
        // Global workspace shortcuts must not consume typing inside the panel.
        event.stopPropagation();
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          !event.nativeEvent.isComposing &&
          !confirmNew &&
          !confirmApproval
        ) {
          event.preventDefault();
          // Escape first dismisses a text selection in the panel.
          const selection = document.getSelection();
          if (
            selection &&
            !selection.isCollapsed &&
            event.currentTarget.contains(selection.anchorNode)
          ) {
            selection.removeAllRanges();
            return;
          }
          if (showSettings && modelEditor) {
            if (!operationBusy) closeModelEditor();
          } else if (!showSettings && view === "chat" && historyOpen) {
            setHistoryOpen(false);
          } else if (maximized && !mobile) setMaximized(false);
          else onClose();
        }
      }}
    >
      {!floating && !mobile && !maximized ? (
        <div
          className="assistant-panel-resizer"
          role="separator"
          aria-label={t("assistant.resizeAria")}
          aria-orientation="vertical"
          aria-valuemin={300}
          aria-valuemax={Math.round(maximumWidth)}
          aria-valuenow={Math.round(width)}
          tabIndex={0}
          title={t("assistant.resizeTitle")}
          onPointerDown={(event) => {
            if (event.button !== 0 || !panelRef.current) return;
            event.preventDefault();
            const panel = panelRef.current;
            resizeStart.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              width: panel.offsetWidth,
              scale:
                panel.getBoundingClientRect().width / panel.offsetWidth || 1,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = resizeStart.current;
            if (
              !start ||
              start.pointerId !== event.pointerId ||
              !event.currentTarget.hasPointerCapture(event.pointerId)
            )
              return;
            resizePanel(start.width + (start.x - event.clientX) / start.scale);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            resizeStart.current = null;
          }}
          onPointerCancel={() => {
            resizeStart.current = null;
          }}
          onLostPointerCapture={() => {
            resizeStart.current = null;
          }}
          onDoubleClick={() => setPanelWidth(380)}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowLeft"
                ? width + 24
                : event.key === "ArrowRight"
                  ? width - 24
                  : event.key === "Home"
                    ? 300
                    : event.key === "End"
                      ? maximumWidth
                      : null;
            if (next === null) return;
            event.preventDefault();
            resizePanel(next);
          }}
        />
      ) : null}
      <header className="assistant-panel-head">
        <div>
          <div className="assistant-panel-title">
            <strong title={t("assistant.experimentalTitle")}>Ranger</strong>
            <span className="assistant-panel-experimental">
              {t("assistant.experimentalBadge")}
            </span>
          </div>
          <div className="assistant-panel-meta">
            <nav
              className="assistant-primary-nav"
              aria-label={t("assistant.viewsAria")}
            >
              {(["chat", "tasks"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  className="ghost"
                  aria-pressed={!showSettings && view === item}
                  onClick={() => {
                    setView(item);
                    setSettingsOpen(false);
                    setHistoryOpen(false);
                  }}
                >
                  {item === "chat"
                    ? t("assistant.chatTab")
                    : t("assistant.tasksTab")}
                </button>
              ))}
            </nav>
            <span
              role="status"
              title={headerStatus}
              className={`assistant-panel-status is-${headerTone}`}
            >
              {headerStatus}
            </span>
          </div>
        </div>
        {!mobile && !maximized ? (
          <button
            type="button"
            className="assistant-icon-button"
            title={
              floating
                ? t("assistant.layoutFixed")
                : t("assistant.layoutFloating")
            }
            aria-label={
              floating ? t("assistant.pinAria") : t("assistant.floatAria")
            }
            aria-pressed={!floating}
            onClick={() => {
              setMaximized(false);
              onToggleFloating();
            }}
          >
            {floating ? <Pin size={16} /> : <PinOff size={16} />}
          </button>
        ) : null}
        {!mobile ? (
          <button
            type="button"
            className="assistant-icon-button"
            title={
              maximized
                ? t("assistant.restoreWindowTitle")
                : t("assistant.maximizeWindowTitle")
            }
            aria-label={
              maximized
                ? t("assistant.restoreAria")
                : t("assistant.maximizeAria")
            }
            aria-pressed={maximized}
            onClick={() => setMaximized((current) => !current)}
          >
            {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        ) : null}
        <button
          type="button"
          className="assistant-icon-button"
          aria-label={t("assistant.settingsAria")}
          title={t("assistant.settingsTitle")}
          aria-pressed={showSettings}
          onClick={() => {
            setSettingsOpen(!showSettings);
            setModelEditor(null);
          }}
        >
          <Settings size={16} />
        </button>
        <button
          type="button"
          className="assistant-icon-button"
          aria-label={t("assistant.closeRangerAria")}
          title={t("assistant.closeTitle")}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>

      {displayedError ? (
        <div className="assistant-error" role="alert">
          <span>{displayedError}</span>
          <button
            type="button"
            className="ghost"
            disabled={!connected || state.loading}
            onClick={() => {
              setError(null);
              void refreshAssistant().catch(() => {});
            }}
          >
            <RefreshCw size={12} /> {t("history.refresh")}
          </button>
        </div>
      ) : null}
      {!snapshot ? (
        <div className="assistant-panel-empty">
          {state.loading ? (
            <LoaderCircle className="assistant-spinner" size={24} />
          ) : (
            <Compass size={24} aria-hidden="true" />
          )}
          <strong>
            {state.loading
              ? t("assistant.loadingRanger")
              : !connected
                ? t("assistant.waitingBridge")
                : !state.supported
                  ? t("assistant.updateToUse")
                  : t("assistant.loadFailed")}
          </strong>
          <span>{t("assistant.rangerRunsInService")}</span>
        </div>
      ) : showSettings && config ? (
        <div className="assistant-panel-settings">
          <div className="assistant-settings-heading">
            {modelEditor ? (
              <>
                <button
                  type="button"
                  className="assistant-icon-button"
                  aria-label={t("assistant.backToSettingsAria")}
                  title={t("assistant.backToSettingsTitle")}
                  disabled={operationBusy}
                  onClick={closeModelEditor}
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 ref={settingsHeadingRef} tabIndex={-1}>
                  {modelEditor === "edit"
                    ? t("assistant.editCustomModelsHeading")
                    : t("assistant.addCustomModelsHeading")}
                </h3>
              </>
            ) : (
              <>
                <h3>{t("assistant.settingsHeading")}</h3>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setView("chat");
                    setSettingsOpen(false);
                    setHistoryOpen(false);
                  }}
                >
                  <ChevronLeft size={14} /> {t("assistant.backToChat")}
                </button>
              </>
            )}
          </div>
          {modelEditor ? (
            <AssistantModelForm
              key={JSON.stringify([
                modelEditor,
                config.credential_source,
                provider?.id,
                config.model,
                provider?.custom,
                selectedModel?.custom,
                selectedModel?.thinking_levels,
              ])}
              config={config}
              provider={provider}
              providers={snapshot.providers}
              selectedModel={selectedModel}
              adding={modelEditor === "add"}
              tasksRunning={
                snapshot.tasks?.some(
                  (task) => task.current_run?.status === "running",
                ) ?? false
              }
              disabled={modelLocked}
              onCancel={closeModelEditor}
              onSave={async (input) => {
                if (!(await run("configure_model", input))) return false;
                setConfig({
                  ...config,
                  provider: input.provider,
                  model: input.model,
                  thinking_level: undefined,
                });
                closeModelEditor();
                return true;
              }}
            />
          ) : (
            <>
              <div className="assistant-settings-body">
                <section
                  className="assistant-settings-section"
                  aria-label={t("assistant.modelSectionAria")}
                >
                  <h4>{t("assistant.modelHeading")}</h4>
                  <fieldset disabled={modelLocked}>
                    <div className="form-field">
                      <span>{t("assistant.credentialsLabel")}</span>
                      <div
                        className="assistant-credential-source"
                        role="group"
                        aria-label={t("assistant.credentialSourceAria")}
                      >
                        {(
                          [
                            {
                              value: "assistant",
                              label: t("assistant.credentialAssistant"),
                            },
                            {
                              value: "pi",
                              label: t("assistant.credentialPi"),
                            },
                          ] as const
                        ).map((item) => (
                          <button
                            type="button"
                            key={item.value}
                            aria-label={item.label}
                            aria-pressed={
                              config.credential_source === item.value
                            }
                            onClick={async () => {
                              if (
                                item.value === config.credential_source ||
                                pendingAction.current
                              )
                                return;
                              await run("configure", {
                                config: {
                                  ...config,
                                  credential_source: item.value,
                                  provider: "",
                                  model: "",
                                  thinking_level: undefined,
                                },
                              });
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <p className="assistant-hint">
                        {config.credential_source === "pi"
                          ? t("assistant.credentialHintPi")
                          : t("assistant.credentialHintAssistant")}
                      </p>
                    </div>
                    <div className="form-field">
                      <span className="assistant-field-heading">
                        <span>{t("assistant.providerLabel")}</span>
                        <button
                          type="button"
                          className="assistant-icon-button"
                          aria-label={t("assistant.refreshCredentialsAria")}
                          title={t("assistant.refreshCredentialsTitle")}
                          disabled={state.loading}
                          onClick={() => {
                            setError(null);
                            void refreshAssistant().catch(() => {});
                          }}
                        >
                          <RefreshCw size={12} />
                        </button>
                      </span>
                      <ThemedSelect
                        value={config.provider}
                        options={providerOptions}
                        aria-label={t("assistant.modelProviderAria")}
                        placeholder={t("assistant.chooseProvider")}
                        searchPlaceholder={t("assistant.searchProviders")}
                        emptyText={t("assistant.noProvidersFound")}
                        contentClassName={`assistant-settings-select${mobile ? " is-mobile" : ""}`}
                        disabled={modelLocked}
                        onChange={(value) => {
                          if (value !== config.provider)
                            setConfig({
                              ...config,
                              provider: value,
                              model: "",
                              thinking_level: undefined,
                            });
                        }}
                      />
                      {provider ? (
                        <div className="assistant-provider-status">
                          <span>{credentialStatus(provider)}</span>
                          {provider.methods.map((method) => (
                            <button
                              type="button"
                              key={method}
                              className={provider.configured ? "ghost" : ""}
                              aria-label={
                                method === "oauth"
                                  ? provider.configured
                                    ? t("assistant.signInAgainTo", {
                                        label: provider.label,
                                      })
                                    : t("assistant.signInTo", {
                                        label: provider.label,
                                      })
                                  : provider.configured
                                    ? t("assistant.updateApiKeyFor", {
                                        label: provider.label,
                                      })
                                    : t("assistant.enterApiKeyFor", {
                                        label: provider.label,
                                      })
                              }
                              onClick={() =>
                                void run("auth.start", {
                                  provider: provider.id,
                                  method,
                                })
                              }
                            >
                              {method === "oauth"
                                ? provider.configured
                                  ? t("assistant.signInAgain")
                                  : t("assistant.signIn")
                                : provider.configured
                                  ? t("assistant.updateApiKey")
                                  : t("assistant.enterApiKey")}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </fieldset>
                  {snapshot.auth &&
                  (authPending ||
                    snapshot.auth.provider === config.provider) ? (
                    <AuthCard
                      key={`${snapshot.auth.id}:${snapshot.auth.prompt?.id ?? ""}`}
                      auth={snapshot.auth}
                      label={
                        snapshot.providers.find(
                          (item) => item.id === snapshot.auth?.provider,
                        )?.label ?? snapshot.auth.provider
                      }
                      busy={operationBusy || !connected}
                      run={run}
                    />
                  ) : null}
                  <fieldset
                    className="assistant-model-selection"
                    disabled={modelLocked}
                  >
                    <label className="form-field">
                      <span>{t("assistant.defaultModelLabel")}</span>
                      <ThemedSelect
                        value={config.model}
                        options={modelOptions}
                        aria-label={t("assistant.rangerModelAria")}
                        disabled={!provider?.configured || !modelOptions.length}
                        searchPlaceholder={
                          modelOptions.length > 8
                            ? t("assistant.searchModels")
                            : undefined
                        }
                        contentClassName={`assistant-settings-select${mobile ? " is-mobile" : ""}`}
                        placeholder={
                          !provider
                            ? t("assistant.chooseProviderFirst")
                            : !provider.configured
                              ? t("assistant.connectProviderFirst")
                              : !modelOptions.length
                                ? t("assistant.noModelsAvailable")
                                : t("assistant.chooseModel")
                        }
                        onChange={(value) =>
                          setConfig({
                            ...config,
                            model: value,
                            thinking_level: thinkingForModel(
                              config,
                              snapshot.models.find(
                                (model) =>
                                  model.provider === config.provider &&
                                  model.id === value,
                              ),
                            ),
                          })
                        }
                      />
                    </label>
                    {snapshot.chat_selection ? (
                      <label className="form-field">
                        <span>{t("assistant.thinkingEffortLabel")}</span>
                        <ThemedSelect
                          value={config.thinking_level ?? "default"}
                          options={thinkingOptions(selectedModel, config)}
                          aria-label={t("assistant.defaultThinkingEffortAria")}
                          disabled={
                            !thinkingOptions(selectedModel, config).length
                          }
                          placeholder={
                            selectedModel?.default_thinking_level
                              ? t("assistant.thinkingDefaultPlaceholder", {
                                  label:
                                    thinkingLabels[
                                      selectedModel.default_thinking_level
                                    ],
                                })
                              : t("assistant.noAdjustableThinking")
                          }
                          onChange={(value) =>
                            setConfig({
                              ...config,
                              thinking_level:
                                value === "default"
                                  ? undefined
                                  : (value as AssistantConfig["thinking_level"]),
                            })
                          }
                        />
                      </label>
                    ) : null}
                  </fieldset>
                  <div className="assistant-custom-models">
                    <div>
                      <strong>{t("assistant.customModelsLabel")}</strong>
                      <span>
                        {customEndpoint
                          ? `${provider?.label ?? config.provider} · ${endpointHost(customEndpoint.base_url)}`
                          : t("assistant.customEndpointNone")}
                      </span>
                    </div>
                    {customEndpoint && config.model ? (
                      <button
                        type="button"
                        className="ghost"
                        aria-label={t("assistant.editCustomModelsAria")}
                        title={t("assistant.editCustomModelsTitle", {
                          model: config.model,
                        })}
                        data-settings-return="edit"
                        disabled={modelLocked}
                        onClick={() => {
                          settingsReturnTarget.current = "edit";
                          setModelEditor("edit");
                        }}
                      >
                        {t("assistant.edit")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label={t("assistant.addCustomModelsAria")}
                      title={
                        customEndpoint
                          ? t("assistant.addModelIdsTitle")
                          : t("assistant.connectEndpointTitle")
                      }
                      data-settings-return="add"
                      disabled={modelLocked}
                      onClick={() => {
                        settingsReturnTarget.current = "add";
                        setModelEditor("add");
                      }}
                    >
                      <Plus size={13} /> {t("assistant.add")}
                    </button>
                  </div>
                </section>
                <section
                  className="assistant-settings-section"
                  aria-label={t("assistant.workspaceAccessAria")}
                >
                  <h4>{t("assistant.workspaceAccessHeading")}</h4>
                  <div className="assistant-workspaces-heading">
                    <span>
                      {t("assistant.allowedWorkspaces")}
                      <small>
                        {allWorkspacesAllowed
                          ? t("assistant.allowedAll")
                          : t("assistant.allowedCount", {
                              count: workspaces.filter((workspace) =>
                                includesWorkspace(
                                  config.allowed_workspaces,
                                  workspace,
                                ),
                              ).length,
                              total: workspaces.length,
                            })}
                      </small>
                    </span>
                    {!allWorkspacesAllowed ? (
                      <>
                        <button
                          type="button"
                          className="ghost"
                          aria-label={t("assistant.selectAllAria")}
                          disabled={
                            contextLoading ||
                            operationBusy ||
                            snapshot.running ||
                            !connected ||
                            !workspaces.length ||
                            allAllowedWorkspaces.length >
                              ASSISTANT_MAX_WORKSPACES ||
                            workspaces.every((workspace) =>
                              includesWorkspace(
                                config.allowed_workspaces,
                                workspace,
                              ),
                            )
                          }
                          onClick={() =>
                            setConfig({
                              ...config,
                              allowed_workspaces: allAllowedWorkspaces,
                            })
                          }
                        >
                          {t("assistant.selectAll")}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          aria-label={t("assistant.clearAllowedAria")}
                          disabled={
                            contextLoading ||
                            operationBusy ||
                            snapshot.running ||
                            !connected ||
                            !config.allowed_workspaces.length
                          }
                          onClick={() =>
                            setConfig({ ...config, allowed_workspaces: [] })
                          }
                        >
                          {t("assistant.clear")}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="assistant-icon-button"
                      aria-label={t("assistant.refreshWorkspacesAria")}
                      title={t("assistant.refreshWorkspacesTitle")}
                      disabled={contextLoading || !connected}
                      onClick={() => void loadContext()}
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>
                  <p className="assistant-hint">
                    {allWorkspacesAllowed
                      ? t("assistant.scopeHintAll")
                      : highPermission
                        ? t("assistant.scopeHintHighPermission")
                        : t("assistant.scopeHintManual")}{" "}
                    {t("assistant.providerPrivacyNote")}
                  </p>
                  {!allWorkspacesAllowed &&
                  allAllowedWorkspaces.length > ASSISTANT_MAX_WORKSPACES ? (
                    <p className="assistant-hint">
                      {t("assistant.selectLimitHint", {
                        max: ASSISTANT_MAX_WORKSPACES,
                      })}
                    </p>
                  ) : null}
                  <fieldset
                    className="assistant-workspaces"
                    disabled={operationBusy || snapshot.running || !connected}
                  >
                    {workspaces.map((workspace) => (
                      <label
                        key={workspaceKey(workspace)}
                        className="assistant-workspace-choice"
                      >
                        <input
                          type="checkbox"
                          checked={
                            allWorkspacesAllowed ||
                            includesWorkspace(
                              config.allowed_workspaces,
                              workspace,
                            )
                          }
                          disabled={
                            allWorkspacesAllowed ||
                            (config.allowed_workspaces.length >=
                              ASSISTANT_MAX_WORKSPACES &&
                              !includesWorkspace(
                                config.allowed_workspaces,
                                workspace,
                              ))
                          }
                          onChange={() =>
                            setConfig({
                              ...config,
                              allowed_workspaces: toggleWorkspace(
                                config.allowed_workspaces,
                                workspace,
                              ),
                            })
                          }
                        />
                        <span>
                          {workspace.label}
                          <small>{workspace.connection_label}</small>
                        </span>
                      </label>
                    ))}
                    {unavailableWorkspaces.length ? (
                      <div
                        role="group"
                        aria-label={t("assistant.unavailableWorkspacesAria")}
                      >
                        <p className="assistant-hint">
                          {t("assistant.unavailableWorkspacesNote")}
                        </p>
                        {unavailableWorkspaces.map((ref) => (
                          <div
                            key={workspaceKey(ref)}
                            className="assistant-workspace-choice"
                          >
                            <span>
                              {ref.workspace_id}
                              <small>{ref.connection_id}</small>
                            </span>
                            <button
                              type="button"
                              className="assistant-icon-button"
                              aria-label={t("assistant.removeUnavailableAria", {
                                workspace: ref.workspace_id,
                                connection: ref.connection_id,
                              })}
                              title={t("assistant.removePermissionTitle")}
                              disabled={allWorkspacesAllowed}
                              onClick={() =>
                                setConfig({
                                  ...config,
                                  allowed_workspaces:
                                    config.allowed_workspaces.filter(
                                      (candidate) =>
                                        workspaceKey(candidate) !==
                                        workspaceKey(ref),
                                    ),
                                })
                              }
                            >
                              <X size={12} aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {!workspaces.length ? (
                      <span className="assistant-hint">
                        {contextLoading
                          ? t("assistant.loadingWorkspaces")
                          : t("assistant.noWorkspacesAvailable")}
                      </span>
                    ) : null}
                  </fieldset>
                  {contextTruncated ? (
                    <p className="assistant-hint" role="alert">
                      {allWorkspacesAllowed
                        ? truncatedScopeMessage
                        : t("assistant.partialListNote")}
                    </p>
                  ) : null}
                  {contextErrors.map((message) => (
                    <p key={message} className="assistant-hint">
                      {message}
                    </p>
                  ))}
                </section>
              </div>
              <div className="assistant-settings-save">
                <span role="status">
                  {settingsChanged ? t("assistant.unsavedChanges") : ""}
                </span>
                <button
                  type="button"
                  className="assistant-settings-primary"
                  disabled={modelLocked || !config.provider || !config.model}
                  onClick={async () => {
                    if (await run("configure", { config }))
                      setSettingsOpen(false);
                  }}
                >
                  {t("assistant.saveSettings")}
                </button>
              </div>
            </>
          )}
        </div>
      ) : view === "tasks" ? null : historySupported && historyOpen ? (
        <section
          className="assistant-chat-history"
          aria-label={t("assistant.savedChatsAria")}
        >
          <div className="assistant-history-heading">
            <h3 ref={historyHeadingRef} tabIndex={-1}>
              {t("assistant.historyHeading")}
            </h3>
            <button
              type="button"
              className="ghost"
              aria-label={t("assistant.closeHistoryAria")}
              onClick={() => setHistoryOpen(false)}
            >
              <ChevronLeft size={14} /> {t("assistant.backToChat")}
            </button>
          </div>
          <div className="assistant-history-body">
            {snapshot.messages.some((message) =>
              message.actions?.some((action) => action.status === "pending"),
            ) ? (
              <p>{t("assistant.historyCancelWarning")}</p>
            ) : null}
            {sessions.length ? (
              <ul>
                {sessions.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      className="ghost"
                      title={session.title}
                      aria-pressed={session.id === snapshot.session_id}
                      disabled={
                        historyBlocked || session.id === snapshot.session_id
                      }
                      onClick={async () => {
                        if (
                          historyBlocked ||
                          session.id === snapshot.session_id
                        )
                          return;
                        if (
                          await run("select_session", {
                            session_id: session.id,
                          })
                        )
                          setHistoryOpen(false);
                      }}
                    >
                      <strong>{session.title}</strong>
                      <span>
                        <time dateTime={session.updated_at}>
                          {formatUiDateTime(session.updated_at)}
                        </time>
                        <span>
                          {session.id === snapshot.session_id
                            ? t("assistant.currentChat")
                            : t("assistant.messageCount", {
                                count: session.message_count,
                              })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="assistant-panel-empty">
                <History size={24} aria-hidden="true" />
                <strong>{t("assistant.noSavedChats")}</strong>
                <span>{t("assistant.chatsSavedAutomatically")}</span>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="assistant-chat-toolbar">
            {historySupported ? (
              <div className="assistant-chat-title">
                <strong>
                  {currentSession?.title ?? t("assistant.newChat")}
                </strong>
                <span
                  title={`${snapshot.config.provider} / ${snapshot.config.model}`}
                >
                  {modelLabel}
                </span>
              </div>
            ) : (
              <span
                title={`${snapshot.config.provider} / ${snapshot.config.model}`}
              >
                {modelLabel}
              </span>
            )}
            {historySupported ? (
              <button
                type="button"
                className="ghost"
                aria-label={t("assistant.chatHistoryAria")}
                disabled={historyBlocked}
                onClick={() => {
                  if (!historyBlocked) setHistoryOpen(true);
                }}
              >
                <History size={13} /> {t("assistant.historyHeading")}
              </button>
            ) : null}
            <button
              type="button"
              className="ghost"
              disabled={historyBlocked || !snapshot.messages.length}
              onClick={() => {
                if (!historyBlocked && snapshot.messages.length)
                  setConfirmNew(true);
              }}
            >
              <Plus size={13} /> {` ${t("assistant.newChat")}`}
            </button>
          </div>
          {!ready || authPending || !scope.length ? (
            <div className="assistant-setup-notice">
              <span>
                {authPending
                  ? t("assistant.setupAuthPending")
                  : !ready
                    ? t("assistant.setupNotReady")
                    : !allWorkspacesAllowed &&
                        !snapshot.config.allowed_workspaces.length
                      ? t("assistant.setupNoWorkspaces")
                      : contextLoading
                        ? t("assistant.setupLoadingScope")
                        : unavailableScopeMessage}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setSettingsOpen(true);
                  setModelEditor(null);
                }}
              >
                <Settings size={13} />{" "}
                {ready && !authPending
                  ? t("assistant.rangerSettings")
                  : t("assistant.modelSettings")}
              </button>
            </div>
          ) : null}
          <div className="assistant-conversation">
            <div
              ref={listRef}
              className="assistant-panel-list"
              aria-label={t("assistant.conversationAria")}
              aria-busy={snapshot.running || executing}
              onScroll={(event) => {
                const list = event.currentTarget;
                chatScrollTop.current = list.scrollTop;
                followingOutput.current =
                  list.scrollHeight - list.scrollTop - list.clientHeight < 48;
              }}
            >
              {!snapshot.messages.length ? (
                <div className="assistant-panel-empty">
                  <Compass size={24} aria-hidden="true" />
                  <strong>{t("assistant.emptyQuestion")}</strong>
                  <span>{t("assistant.emptyHint")}</span>
                </div>
              ) : (
                snapshot.messages.map((message, index) => (
                  <section
                    key={message.id}
                    data-message-id={message.id}
                    data-sequence={index + 1}
                    className={`assistant-message is-${message.role}`}
                    aria-label={t("assistant.messageAria", {
                      role:
                        message.role === "user"
                          ? t("history.labelYou")
                          : "Ranger",
                    })}
                  >
                    <div className="assistant-message-head">
                      <strong>
                        {message.role === "user"
                          ? t("history.labelYou")
                          : "Ranger"}
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
                          snapshot.running &&
                          message ===
                            snapshot.messages[snapshot.messages.length - 1]
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
                      ) : snapshot.running &&
                        message ===
                          snapshot.messages[snapshot.messages.length - 1] ? (
                        // The open reasoning block already reports progress.
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
                      <AssistantUserMessage
                        message={message}
                        onOpenMention={(target) => void openMention(target)}
                      />
                    )}
                    {message.role === "assistant" &&
                    message.text.length >= 32_000 ? (
                      <span className="assistant-hint">
                        {t("assistant.responseTooLong")}
                      </span>
                    ) : null}
                    {message.role === "assistant"
                      ? message.actions?.map((action) => (
                          <ActionCard
                            key={action.id}
                            action={action}
                            busy={operationBusy || !connected}
                            running={snapshot.running}
                            run={run}
                          />
                        ))
                      : null}
                    {message.role === "assistant"
                      ? message.task_proposals?.map((proposal) => (
                          <TaskProposalCard
                            key={proposal.id}
                            proposal={proposal}
                            busy={busy || !connected}
                            run={run}
                          />
                        ))
                      : null}
                    {message.tools.length || message.sources.length ? (
                      <AssistantMessageActivity
                        message={message}
                        running={
                          snapshot.running &&
                          message ===
                            snapshot.messages[snapshot.messages.length - 1]
                        }
                        onOpenSource={onOpenSource}
                      />
                    ) : null}
                  </section>
                ))
              )}
            </div>
            {snapshot.messages.length ? (
              <ConversationMinimap
                key={snapshot.session_id ?? snapshot.instance_id}
                entries={minimapEntries}
                scrollerRef={listRef}
                itemsRef={listRef}
                orientation={mobile ? "horizontal" : "auto"}
                label={t("assistant.minimapAria")}
                emptyText={t("assistant.minimapEmpty")}
                onLayout={pinMinimapLayout}
                onSelect={jumpToMinimapEntry}
              />
            ) : null}
          </div>
          <form
            className="assistant-panel-footer"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <AssistantQueue
              queue={snapshot.queue ?? []}
              running={snapshot.running}
              held={snapshot.queue_held === true}
              reviewing={snapshot.messages.some(
                (message) =>
                  message.actions?.some(
                    (action) => action.status === "pending",
                  ) ||
                  message.task_proposals?.some(
                    (proposal) => proposal.status === "pending",
                  ),
              )}
              disabled={operationBusy || !connected}
              onEdit={(item) => void editQueued(item)}
              onRemove={(item) => void run("queue.remove", { id: item.id })}
              onResume={() => {
                followingOutput.current = true;
                void run("queue.resume");
              }}
            />
            <AssistantMentionComposer
              value={state.draft}
              mentions={state.draftMentions ?? []}
              workspaces={permittedWorkspaces}
              currentWorkspace={
                currentWorkspaceId
                  ? {
                      connection_id: currentConnectionId,
                      workspace_id: currentWorkspaceId,
                    }
                  : undefined
              }
              draftKey={`${snapshot.instance_id}:${snapshot.session_id ?? ""}`}
              inputRef={inputRef}
              mobile={mobile}
              onChange={setAssistantDraft}
              onSubmit={(options) => void submit(options?.queue)}
              onCompositionChange={(value) => {
                composing.current = value;
              }}
              onOpenMention={(target) => void openMention(target)}
            />
            <div className="assistant-compose-options">
              <AssistantChatControls
                key={`${snapshot.instance_id}:${snapshot.session_id ?? ""}`}
                snapshot={snapshot}
                mobile={mobile}
                disabled={busy || !connected || !!authPending}
                onChange={(params) => {
                  if (!composing.current) void run("configure_chat", params);
                }}
                onSelectedClose={() =>
                  inputRef.current?.focus({ preventScroll: true })
                }
              />
              <Popover open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`assistant-permission-trigger${highPermission ? " is-high-permission" : ""}`}
                    aria-label={t("assistant.permissionsAria")}
                    title={
                      highPermission
                        ? allWorkspacesAllowed
                          ? t("assistant.permissionTitleAll")
                          : t("assistant.permissionTitleSelected")
                        : t("assistant.permissionTitleConfirm")
                    }
                  >
                    <ShieldCheck size={13} aria-hidden="true" />
                    <span>
                      {highPermission
                        ? allWorkspacesAllowed
                          ? t("assistant.permissionFullAccess")
                          : t("assistant.permissionHigh")
                        : t("assistant.permissionAsk")}
                    </span>
                    <ChevronDown size={13} aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className={`assistant-permission-popover${mobile ? " is-mobile" : ""}`}
                  aria-label={t("assistant.permissionPopoverAria")}
                  side="top"
                  align="end"
                  collisionPadding={8}
                  onEscapeKeyDown={(event) => event.stopPropagation()}
                  onCloseAutoFocus={(event) => {
                    if (confirmApproval) event.preventDefault();
                  }}
                >
                  <div className="assistant-permission-toggle">
                    <div>
                      <strong>{t("assistant.highPermissionHeading")}</strong>
                      <p
                        className="assistant-hint"
                        id="ranger-high-permission-description"
                      >
                        {highPermission && !allWorkspacesAllowed
                          ? t("assistant.highPermissionSelectedNote")
                          : t("assistant.highPermissionSkipNote")}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label={t("assistant.highPermissionSwitchAria")}
                      aria-describedby="ranger-high-permission-description"
                      aria-checked={highPermission}
                      className={`settings-switch${highPermission ? " is-on" : ""}`}
                      disabled={
                        busy ||
                        !connected ||
                        !!authPending ||
                        (!highPermission && (executing || snapshot.running))
                      }
                      onClick={() => {
                        setPermissionsOpen(false);
                        if (highPermission)
                          void run("configure_approval", {
                            approval_mode: "manual",
                          });
                        else setConfirmApproval(true);
                      }}
                    >
                      <span />
                    </button>
                  </div>
                  {highPermission && !allWorkspacesAllowed ? (
                    <button
                      type="button"
                      className="assistant-permission-upgrade"
                      disabled={
                        busy ||
                        !connected ||
                        !!authPending ||
                        executing ||
                        snapshot.running
                      }
                      onClick={() => {
                        setPermissionsOpen(false);
                        setConfirmApproval(true);
                      }}
                    >
                      {t("assistant.enableAllWorkspaces")}
                    </button>
                  ) : null}
                </PopoverContent>
              </Popover>
              <div
                className="assistant-compose-actions"
                onMouseDown={
                  mobile ? (event) => event.preventDefault() : undefined
                }
              >
                {snapshot.running && queueSupported ? (
                  <>
                    <button
                      type="button"
                      aria-label={t("assistant.queueAria")}
                      title={t("assistant.queueTitle", { keys: altEnter })}
                      disabled={
                        operationBusy ||
                        !connected ||
                        !state.draft.trim() ||
                        !scope.length
                      }
                      onClick={() => void submit(true)}
                    >
                      <ListPlus size={13} />
                      {t("assistant.queue")}
                    </button>
                    <button
                      type="submit"
                      aria-label={t("assistant.steerAria")}
                      title={t("assistant.steerTitle")}
                      disabled={
                        operationBusy ||
                        !connected ||
                        !state.draft.trim() ||
                        !scope.length
                      }
                    >
                      <CornerDownRight size={13} />
                      {t("assistant.steer")}
                    </button>
                  </>
                ) : null}
                {snapshot.running ? (
                  <button
                    type="button"
                    aria-label={t("chat.stop")}
                    title={t("assistant.stopTitle")}
                    disabled={busy || !connected}
                    onClick={() => void run("stop")}
                  >
                    <Square size={13} />
                    {t("chat.stop")}
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label={t("history.send")}
                    title={t("assistant.sendTitle")}
                    disabled={
                      operationBusy ||
                      !connected ||
                      !ready ||
                      authPending ||
                      !state.draft.trim() ||
                      !scope.length
                    }
                  >
                    <Send size={13} />
                    {t("history.send")}
                  </button>
                )}
              </div>
            </div>
          </form>
        </>
      )}
      {snapshot ? (
        <AssistantTasks
          active={!showSettings && view === "tasks"}
          requestedTask={connected && !state.loading ? requestedTask : null}
          onRequestedTaskHandled={onRequestedTaskHandled}
          snapshot={snapshot}
          connected={connected}
          workspaces={permittedWorkspaces}
          onOpenSettings={() => {
            setSettingsOpen(true);
            setModelEditor(null);
          }}
          onOpenSource={onOpenSource}
        />
      ) : null}
      <ConfirmDialog
        open={confirmApproval}
        title={t("assistant.confirmHighPermissionTitle")}
        message={t("assistant.confirmHighPermissionMessage")}
        confirmLabel={t("assistant.confirmHighPermissionConfirm")}
        onConfirm={() =>
          void run("configure_approval", {
            approval_mode: "auto",
            workspace_scope: "all",
          })
        }
        onClose={() => setConfirmApproval(false)}
      />
      <ConfirmDialog
        open={confirmNew}
        title={t("assistant.confirmNewChatTitle")}
        message={
          historySupported
            ? t("assistant.confirmNewChatSaved")
            : t("assistant.confirmNewChatCleared")
        }
        confirmLabel={t("assistant.newChat")}
        onConfirm={() => void run("new_session")}
        onClose={() => setConfirmNew(false)}
      />
    </aside>
  );
}
