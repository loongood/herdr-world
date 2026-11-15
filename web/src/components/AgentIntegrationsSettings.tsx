import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Info, RefreshCw, Trash2 } from "lucide-react";
import { type TranslationKey, useT } from "../i18n";
import { AgentIcon } from "./AgentIcon";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  connectionClientScopeKey,
  useConnectionClient,
  useConnectionReady,
} from "../useConnectionClient";
import { useStoreSelector } from "../store";
import { focusIfUnchanged } from "./dialogFocus";
import {
  useWorldIntegrations,
  WorldIntegrationRow,
} from "./WorldIntegrationRow";
import { worldHarnessFor, type WorldIntegration } from "../worldIntegrations";
import "./AgentIntegrationsSettings.css";

import {
  lacksIntegrationManagement,
  parseAgentIntegrations,
  type AgentIntegration,
} from "../agentIntegrations";
export {
  parseAgentIntegrations,
  type AgentIntegration,
} from "../agentIntegrations";

type IntegrationChangeOutcome = { messages: string[]; error: string | null };

// A submitted RPC outlives its settings view. Keep its outcome until a view
// on the same connection lease displays it, even if it settles while unmounted.
const pendingChanges = new Map<string, Promise<IntegrationChangeOutcome>>();

const STATE_LABEL_KEYS: Record<AgentIntegration["state"], TranslationKey> = {
  not_installed: "agents.stateNotInstalled",
  current: "agents.stateCurrent",
  outdated: "agents.stateOutdated",
};

export function AgentIntegrationsSettings({
  connectionLabel,
  sshDestination,
}: {
  connectionLabel: string;
  sshDestination?: string;
}) {
  const client = useConnectionClient();
  const t = useT();
  const scope = connectionClientScopeKey(
    client,
    client.serverRuntimeGeneration,
  );
  // World restarts and runtime replacements briefly leave this client stale;
  // the hook captures a current one once World's catalog is back.
  const ready = useConnectionReady(client);
  const waitingState = useStoreSelector((s) =>
    s.status !== "connected" || !s.catalogueReady
      ? ("world" as const)
      : s.connections.find((c) => c.id === client.connectionId)?.state !==
          "ready"
        ? ("herdr" as const)
        : null,
  );
  const waiting =
    waitingState === "world"
      ? t("agents.reconnectingToWorld")
      : waitingState === "herdr"
        ? t("agents.waitingForHerdr")
        : null;
  const [items, setItems] = useState<AgentIntegration[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const destination = sshDestination
    ? `${connectionLabel} (${sshDestination})`
    : connectionLabel;
  // World's skill rows cover World's own host; SSH hosts are a later slice.
  const labelFor = (harness: string) =>
    items?.find((item) => worldHarnessFor(item.target) === harness)?.label ??
    harness;
  const world = useWorldIntegrations(
    !sshDestination && ready,
    labelFor,
    client,
  );
  const worldRow = (harness: string) =>
    world.items?.find((item) => item.harness === harness);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError(null);
    const operation = pendingChanges.get(scope);
    let outcome: IntegrationChangeOutcome | undefined;
    try {
      outcome = await operation;
      if (
        !mounted.current ||
        !client.isCurrent() ||
        request !== sequence.current
      )
        return;
      const integrations = parseAgentIntegrations(
        await client.call("integration.list"),
      );
      if (
        mounted.current &&
        client.isCurrent() &&
        request === sequence.current
      ) {
        setItems(integrations);
        if (outcome?.messages) setMessages(outcome.messages);
        if (outcome?.error) setError(outcome.error);
      }
    } catch (e) {
      if (mounted.current && request === sequence.current) {
        setItems(null);
        // A stale client is shown as reconnecting, not as a failure.
        setError(
          !client.isCurrent()
            ? null
            : [
                outcome?.error,
                t("agents.loadFailed", { message: (e as Error).message }),
              ]
                .filter(Boolean)
                .join(" "),
        );
      }
    } finally {
      if (mounted.current && request === sequence.current) {
        if (!client.isCurrent()) {
          setItems(null);
          setError(null);
        } else if (outcome) {
          setMessages(outcome.messages);
          if (pendingChanges.get(scope) === operation)
            pendingChanges.delete(scope);
        }
        setLoading(false);
      }
    }
  }, [client, scope, t]);

  useEffect(() => {
    mounted.current = true;
    // Also reload when the same client becomes current again.
    if (ready) void load();
    else setLoading(false);
    return () => {
      mounted.current = false;
    };
  }, [load, ready]);

  const change = async (
    item: AgentIntegration,
    action: "install" | "uninstall",
  ) => {
    if (
      pendingChanges.has(scope) ||
      loading ||
      !client.isCurrent() ||
      (action === "install" && !item.available)
    )
      return;
    const verb =
      action === "uninstall"
        ? t("agents.verbUninstall")
        : item.state === "outdated"
          ? t("agents.verbUpdate")
          : t("agents.verbInstall");
    if (
      !window.confirm(
        `${t("agents.changeConfirmTitle", {
          verb,
          label: item.label,
          destination,
        })}\n\n${t("agents.changeConfirmBody")}`,
      ) ||
      !client.isCurrent()
    )
      return;
    const source = document.activeElement;
    const operation: Promise<IntegrationChangeOutcome> = client
      .call(`integration.${action}`, { target: item.target })
      .then((result) => {
        if (
          result?.target !== item.target ||
          !Array.isArray(result?.details?.messages) ||
          !result.details.messages.every(
            (message: unknown) => typeof message === "string",
          )
        )
          throw new Error(t("agents.invalidIntegrationResult"));
        return {
          messages: [
            t("agents.completedFor", { verb, label: item.label }),
            ...result.details.messages,
          ],
          error: null,
        };
      })
      .catch((e: Error) => ({
        messages: [],
        error: t("agents.confirmFailed", { verb, message: e.message }),
      }));
    pendingChanges.set(scope, operation);
    void operation.then(() => {
      if (!client.isCurrent() && pendingChanges.get(scope) === operation)
        pendingChanges.delete(scope);
    });
    setBusy(item.target);
    setError(null);
    setMessages([]);
    try {
      const outcome = await operation;
      if (!mounted.current || !client.isCurrent()) return;
      if (pendingChanges.get(scope) === operation) pendingChanges.delete(scope);
      if (outcome.error) {
        setItems(null);
        setError(outcome.error);
      } else {
        setMessages(outcome.messages);
        await load();
      }
    } finally {
      if (mounted.current && client.isCurrent()) {
        setBusy(null);
        window.requestAnimationFrame(() => {
          if (mounted.current && client.isCurrent())
            focusIfUnchanged(refreshButton.current, source);
        });
      }
    }
  };

  const disabled = loading || busy !== null || !client.isCurrent();
  const visible = (items ?? [])
    .filter((item) => item.available || item.state !== "not_installed")
    .sort((a, b) => {
      const rank = { outdated: 0, current: 1, not_installed: 2 };
      return rank[a.state] - rank[b.state];
    });
  const unavailable = (items ?? []).filter(
    (item) => !item.available && item.state === "not_installed",
  );
  const worldDisabled = world.busy !== null || !ready;
  const renderWorld = (row: WorldIntegration | undefined) =>
    row ? (
      <WorldIntegrationRow
        item={row}
        label={labelFor}
        disabled={worldDisabled}
        onChange={(item, action) => void world.change(item, action)}
      />
    ) : null;
  // World harnesses Herdr did not report (or all, when Herdr's list failed).
  const worldOnly = loading
    ? []
    : (world.items ?? []).filter(
        (row) =>
          !items?.some((item) => worldHarnessFor(item.target) === row.harness),
      );
  const renderList = (list: AgentIntegration[]) => (
    <ul className="agent-integrations-list">
      {list.map((item) => (
        <li key={item.target} data-state={item.state}>
          <AgentIcon agent={item.target} />
          <div className="agent-integrations-copy">
            <strong>{item.label}</strong>
            <div className="agent-integrations-meta">
              {item.state !== "not_installed" ? (
                <span className="agent-integrations-version">
                  <span
                    title={
                      item.installed_version === undefined
                        ? t("agents.versionMetadataUnavailable")
                        : t("agents.installedVersionTitle")
                    }
                  >
                    {item.installed_version === undefined
                      ? t("agents.versionUnavailable")
                      : `v${item.installed_version}`}
                  </span>
                  {item.state === "outdated" &&
                  item.available_version !== undefined ? (
                    <>
                      <ArrowRight
                        size={12}
                        aria-label={t("agents.updateToAria")}
                      />
                      <span title={t("agents.availableVersionTitle")}>
                        v{item.available_version}
                      </span>
                    </>
                  ) : null}
                </span>
              ) : null}
              <span
                className="agent-integrations-badge"
                data-state={item.state}
              >
                {!item.available && item.state === "not_installed"
                  ? t("agents.notDetected")
                  : t(STATE_LABEL_KEYS[item.state])}
              </span>
            </div>
            {!item.available && item.state !== "not_installed" ? (
              <span
                className="agent-integrations-missing"
                title={t("agents.commandNotFound", { command: item.command })}
              >
                {t("agents.notOnPath")}
              </span>
            ) : null}
          </div>
          <div className="agent-integrations-actions">
            {item.state !== "current" ? (
              <button
                type="button"
                className={
                  item.state === "outdated" ? "agent-integrations-update" : ""
                }
                aria-label={t("agents.actionIntegrationAria", {
                  action:
                    item.state === "outdated"
                      ? t("agents.verbUpdate")
                      : t("agents.verbInstall"),
                  label: item.label,
                })}
                aria-disabled={disabled || !item.available}
                title={
                  !item.available
                    ? t("agents.commandNotFound", { command: item.command })
                    : undefined
                }
                onClick={() => void change(item, "install")}
              >
                {item.state === "outdated"
                  ? t("agents.verbUpdate")
                  : t("agents.verbInstall")}
              </button>
            ) : null}
            {item.state !== "not_installed" ? (
              <button
                type="button"
                className="agent-integrations-icon-button agent-integrations-uninstall"
                aria-label={t("agents.uninstallIntegrationAria", {
                  label: item.label,
                })}
                title={t("agents.uninstallIntegrationAria", {
                  label: item.label,
                })}
                aria-disabled={disabled}
                onClick={() => void change(item, "uninstall")}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {renderWorld(worldRow(worldHarnessFor(item.target)))}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="agent-integrations-settings">
      <div className="agent-integrations-toolbar">
        <div className="agent-integrations-heading">
          <strong>{destination}</strong>
          <span>{t("agents.integrationsHeading")}</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="agent-integrations-icon-button"
              aria-label={t("agents.aboutIntegrations")}
              title={t("agents.aboutIntegrations")}
            >
              <Info size={16} aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="configuration-help-content"
            aria-label={t("agents.aboutIntegrations")}
            collisionPadding={12}
          >
            {t("agents.integrationsDescription")}
          </PopoverContent>
        </Popover>
        <button
          ref={refreshButton}
          type="button"
          className="agent-integrations-icon-button"
          aria-label={t("agents.refreshIntegrations")}
          title={t("agents.refreshIntegrations")}
          aria-disabled={disabled}
          onClick={() => {
            if (!pendingChanges.has(scope) && !disabled) {
              void load();
              void world.load();
            }
          }}
        >
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </div>
      <div role="status" className="agent-integrations-status">
        {busy
          ? t("agents.applyingChange")
          : !ready && waiting
            ? waiting
            : loading
              ? t("agents.loadingIntegrations")
              : null}
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>
      {!ready ? (
        waiting ? null : (
          <div className="configuration-error" role="alert">
            <span>{t("agents.connectionLost")}</span>{" "}
            <button type="button" onClick={() => window.location.reload()}>
              {t("agents.reloadAction")}
            </button>
          </div>
        )
      ) : error ? (
        <div className="configuration-error" role="alert">
          <span>
            {error}
            {lacksIntegrationManagement(error)
              ? t("agents.lacksManagementNote")
              : ""}
          </span>
        </div>
      ) : null}
      {world.busy || (ready && (world.message || world.error)) ? (
        <div
          role={world.error ? "alert" : "status"}
          className={
            world.error ? "configuration-error" : "agent-integrations-status"
          }
        >
          {world.busy
            ? t("agents.applyingWorldChange")
            : (world.error ?? world.message)}
        </div>
      ) : null}
      {sshDestination ? (
        <p className="configuration-scope">{t("agents.localOnlyNote")}</p>
      ) : null}
      {items?.length === 0 ? (
        <p className="configuration-scope">{t("agents.noneReported")}</p>
      ) : null}
      {visible.length > 0 ? renderList(visible) : null}
      {unavailable.length > 0 ? (
        <details className="agent-integrations-unavailable">
          <summary>
            {t("agents.otherAgents")} <span>{unavailable.length}</span>
          </summary>
          {renderList(unavailable)}
        </details>
      ) : null}
      {worldOnly.length > 0 ? (
        <ul
          className="agent-integrations-list agent-integrations-world-only"
          aria-label={t("agents.worldOnlyAria")}
        >
          {worldOnly.map((row) => (
            <li key={row.harness} data-state={row.state}>
              <AgentIcon agent={row.harness} />
              <div className="agent-integrations-copy">
                <strong>{row.harness}</strong>
              </div>
              <div />
              {renderWorld(row)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
