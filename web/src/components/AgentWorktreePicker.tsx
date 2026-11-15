import {
  ResourceConnectionClientContext,
  connectionClientScopeGeneration,
  connectionClientScopeKey,
  type ConnectionClientScope,
} from "../useConnectionClient";
import { resourcePresentationClient } from "../resourcePresentationClient";
import {
  useId,
  useRef,
  useMemo,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Activity,
  FileText,
  FolderGit2,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { AGENT_WORKTREE_SOURCE_LABELS } from "../../../shared/agentWorktree";
import { useT } from "../i18n";
import type { AgentWorktreeView } from "../useAgentWorktree";
import { middleEllipsis } from "./middleEllipsis";
import "./AgentWorktreePicker.css";

export function AgentWorktreeLine({ view }: { view: AgentWorktreeView }) {
  const t = useT();
  const { selected, observation, target } = view;
  const source = selected?.source;
  const Icon =
    source === "foreground_cwd"
      ? Activity
      : source === "session_cwd"
        ? FileText
        : source === "agent_report"
          ? MessageSquare
          : source === "branch_match"
            ? GitBranch
            : FolderGit2;
  const stale = observation?.state === "stale";
  return (
    <span
      className={`agent-worktree-line${stale ? " is-stale" : !target ? " is-ambiguous" : ""}`}
    >
      <span
        title={
          source
            ? AGENT_WORKTREE_SOURCE_LABELS[source]
            : t("worktree.evidenceTitle")
        }
      >
        <Icon size={12} aria-hidden="true" />
      </span>
      <span
        className="agent-worktree-line-text"
        title={selected?.canonicalRoot}
      >
        {selected ? (
          <>
            <span className="agent-worktree-line-name">
              <bdi>
                {selected.canonicalRoot.split("/").filter(Boolean).pop() ??
                  selected.canonicalRoot}
              </bdi>
            </span>
            <span className="agent-worktree-line-branch">
              {" "}
              · {selected.branch ?? "detached HEAD"}
              {stale ? t("worktree.staleSuffix") : ""}
            </span>
          </>
        ) : observation?.state === "ambiguous" ? (
          t("worktree.ambiguousChoose", {
            count: observation.candidates.length,
          })
        ) : view.loading ? (
          t("worktree.readingWorktree")
        ) : (
          t("worktree.unavailableChoose")
        )}
      </span>
    </span>
  );
}

export function AgentWorktreePicker({ view }: { view: AgentWorktreeView }) {
  const t = useT();
  const name = useId();
  const stale = view.observation?.state === "stale";
  return (
    <section className="agent-worktree-picker">
      <fieldset>
        <legend>{t("worktree.pickerLegend")}</legend>
        <p>{t("worktree.pickerDescription")}</p>
        {view.observation?.candidates.map((candidate) => (
          <label key={candidate.candidateId} className="agent-worktree-choice">
            <input
              type="radio"
              name={name}
              value={candidate.candidateId}
              aria-label={`${candidate.canonicalRoot} · ${AGENT_WORKTREE_SOURCE_LABELS[candidate.source]}`}
              checked={view.selected?.candidateId === candidate.candidateId}
              disabled={stale || view.observation?.state === "unavailable"}
              onChange={() => view.select(candidate.candidateId)}
            />
            <span>
              <span
                className="agent-worktree-choice-path"
                title={candidate.canonicalRoot}
              >
                {middleEllipsis(candidate.canonicalRoot, 36)}
              </span>
              <small>
                {AGENT_WORKTREE_SOURCE_LABELS[candidate.source]}
                {stale
                  ? t("worktree.staleSuffix")
                  : view.observation?.state === "ambiguous"
                    ? t("worktree.ambiguousSuffix")
                    : ""}
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      {view.selected ? (
        <p title={view.selected.canonicalRoot}>
          {t("worktree.viewingRoot", {
            path: middleEllipsis(view.selected.canonicalRoot, 64),
          })}
        </p>
      ) : (
        <p>{view.observation?.reason ?? t("worktree.chooseForFilesChanges")}</p>
      )}
      {view.observation?.reportedPr ? (
        <a href={view.observation.reportedPr} target="_blank" rel="noreferrer">
          {t("worktree.reportedPr")}
        </a>
      ) : null}
      {view.observation?.unavailableEvidence?.map((evidence) => (
        <p key={`${evidence.source}:${evidence.path}`} title={evidence.path}>
          {AGENT_WORKTREE_SOURCE_LABELS[evidence.source]} ·{" "}
          {middleEllipsis(evidence.path, 56)}: {evidence.reason}
        </p>
      ))}
      {view.observation?.truncated ? (
        <p>{t("worktree.boundedSetNote")}</p>
      ) : null}
      <button type="button" disabled={view.loading} onClick={view.refresh}>
        {view.loading
          ? t("worktree.refreshingAction")
          : t("worktree.refreshAction")}
      </button>
    </section>
  );
}

export function AgentWorktreeGate({
  view,
  retainPresentation = false,
  onChoose,
  children,
}: {
  view?: AgentWorktreeView;
  onChoose(): void;
  children: ReactNode;
  retainPresentation?: boolean;
}) {
  const t = useT();
  const client = useContext(ResourceConnectionClientContext);
  const owner = JSON.stringify([
    client?.connectionId,
    client && connectionClientScopeGeneration(client),
    view?.observation?.subject,
  ]);
  const admitted = useRef<{
    owner: string;
    identity: string;
    scope: ConnectionClientScope | null;
  } | null>(null);
  const identity = client ? connectionClientScopeKey(client) : "";
  if (
    (!view || view.target) &&
    (admitted.current?.owner !== owner ||
      admitted.current?.identity !== identity)
  ) {
    admitted.current = {
      owner,
      identity,
      scope: client
        ? {
            connectionId: client.connectionId,
            generation: client.generation,
            serverRuntimeGeneration: client.serverRuntimeGeneration,
            agentWorktree: client.agentWorktree,
          }
        : null,
    };
  }
  const scope =
    admitted.current?.owner === owner ? admitted.current.scope : client;
  const presentationClient = useMemo(
    () =>
      client && scope ? resourcePresentationClient(client, scope) : client,
    [client, scope],
  );
  if (
    !view ||
    view.target ||
    (retainPresentation && admitted.current?.owner === owner)
  )
    return (
      <ResourceConnectionClientContext.Provider value={presentationClient}>
        {children}
      </ResourceConnectionClientContext.Provider>
    );
  return (
    <div className="workspace-inspector-unavailable" role="status">
      <strong>
        {view.observation?.state === "stale"
          ? t("worktree.gateStale")
          : t("worktree.gateChoose")}
      </strong>
      <span>
        {view.observation?.reason ??
          (view.loading
            ? t("worktree.readingEvidence")
            : t("worktree.needSelection"))}
      </span>
      <button type="button" onClick={onChoose}>
        {t("worktree.gateChoose")}
      </button>
    </div>
  );
}

/**
 * One Inspector view that reads the agent's worktree: Files, Changes or
 * Commits. While the worktree is re-read (`held`), it keeps its last
 * presentation and takes no input. Chat and Terminal never wait on the
 * worktree (#837); `retain` is the whole Inspector's disconnected hold.
 */
export function AgentWorktreeResource({
  className,
  style,
  view,
  retain,
  held,
  onChoose,
  children,
}: {
  className: string;
  style?: CSSProperties;
  view?: AgentWorktreeView;
  retain: boolean;
  held: boolean;
  onChoose(): void;
  children: ReactNode;
}) {
  return (
    <div
      ref={(element) => {
        element?.toggleAttribute("inert", held);
      }}
      className={className}
      style={style}
    >
      <AgentWorktreeGate
        view={view}
        retainPresentation={retain || held}
        onChoose={onChoose}
      >
        {children}
      </AgentWorktreeGate>
    </div>
  );
}
