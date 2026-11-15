import { useState } from "react";
import { X } from "lucide-react";
import { AgentIcon } from "../components/AgentIcon";
import { t, useT } from "../i18n";
import type { WorldObjectNode } from "./worldObject";

export function worldReadOnlyMessage(
  currentGeneration: boolean,
  canSwitchHost: boolean,
) {
  if (!currentGeneration) {
    return t("intent.earlierConnection");
  }
  if (canSwitchHost) return t("intent.switchHosts");
  return t("intent.hostNotReady");
}

export default function WorldIntentProfile({
  node,
  currentGeneration,
  inspectorOpen,
  intentOpening,
  resourceError,
  onActivateHost,
  onClose,
}: {
  node: WorldObjectNode;
  currentGeneration: boolean;
  inspectorOpen: boolean;
  intentOpening: boolean;
  resourceError: string | null;
  onActivateHost(): Promise<void>;
  onClose(): void;
}) {
  const t = useT();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leaf = node.kind === "agent" || node.kind === "terminal" ? node : null;
  const disabled = !currentGeneration || working;
  const stateLabel = !currentGeneration
    ? t("intent.stale")
    : leaf?.kind === "agent"
      ? (leaf.stateLabels[leaf.status] ?? leaf.status)
      : hostStateLabel(node.hostState);

  async function run(action: () => Promise<void>, requiresActionable = true) {
    if (disabled || (requiresActionable && !node.actionable)) return;
    setWorking(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorking(false);
    }
  }

  // Once the Inspector owns the selected resource it also renders this
  // identity. Keeping a second profile shell above it creates two close
  // controls and can bury the dock controls in the bottom layout.
  if (inspectorOpen) return null;

  return (
    <aside
      className="world-selection-panel world-intent-profile"
      aria-label={t("intent.aria")}
      data-kind={node.kind}
    >
      <header className="world-intent-profile-header">
        <span className="world-intent-avatar" aria-hidden="true">
          {node.kind === "agent" ? (
            <AgentIcon agent={node.pane.agent} compact />
          ) : node.kind === "terminal" ? (
            ">_"
          ) : node.kind === "space" ? (
            "S"
          ) : (
            "H"
          )}
        </span>
        <div className="world-intent-identity">
          <p className="world-eyebrow">
            {kindWord(node.kind)} · {stateLabel}
          </p>
          <h2>{node.label}</h2>
          <p className="world-intent-context">
            {leaf ? `${leaf.spaceLabel} · ` : ""}
            {node.hostLabel}
          </p>
        </div>
        <div className="world-intent-header-actions">
          <button
            className="world-panel-close"
            type="button"
            onClick={onClose}
            title={t("intent.closeTitle")}
            aria-label={t("intent.closeTitle")}
          >
            <X size={16} />
          </button>
        </div>
      </header>
      {leaf?.taskSummary ? (
        <section
          className="world-task-summary"
          aria-label={t("intent.currentTask")}
        >
          <span>{t("intent.currentTask")}</span>
          <p>{leaf.taskSummary}</p>
        </section>
      ) : null}
      {currentGeneration && node.capabilities.activateHost ? (
        <div className="world-panel-actions">
          <button
            type="button"
            disabled={working}
            onClick={() => void run(onActivateHost, false)}
          >
            {t("intent.switchNow")}
          </button>
        </div>
      ) : null}
      {!currentGeneration || !node.actionable ? (
        <p className="world-panel-warning">
          {worldReadOnlyMessage(
            currentGeneration,
            node.capabilities.activateHost,
          )}
        </p>
      ) : null}
      {intentOpening ? (
        <p className="world-intent-loading" role="status">
          {t("intent.opening")}
        </p>
      ) : null}
      {error || resourceError ? (
        <p className="world-panel-error" role="alert">
          {error ?? resourceError}
        </p>
      ) : null}
    </aside>
  );
}

const kindWord = (kind: WorldObjectNode["kind"]) =>
  kind === "agent"
    ? t("intent.kindAgent")
    : kind === "terminal"
      ? t("intent.kindTerminal")
      : kind === "space"
        ? t("intent.kindSpace")
        : t("intent.kindHost");

function hostStateLabel(state: WorldObjectNode["hostState"]) {
  switch (state) {
    case "active":
      return "Active";
    case "ready-inactive":
      return "Ready · inactive";
    case "reconnecting":
      return "Reconnecting";
    case "offline-stale":
      return "Offline · stale";
  }
}
