import { useCallback, useEffect, useRef, useState } from "react";
import { useOperationalStore } from "../store";
import { uiLocale } from "../uiLocale";
import { t, useT } from "../i18n";
import { useConnectionClient } from "../useConnectionClient";
import { CloseButton } from "./CloseButton";
import { focusDialogElement } from "./dialogFocus";
import "./AutoSyncRepositoriesDialog.css";

type AutoSyncStatus = "updated" | "up_to_date" | "skipped" | "failed";

type AutoSyncConfig = {
  key: string;
  enabled: boolean;
  interval_minutes: number;
  checkout_path?: string;
  host?: string;
  last_run_at?: string;
  last_status?: AutoSyncStatus;
  last_message?: string;
  last_branch?: string;
  running?: boolean;
};

type AutoSyncConfigList = {
  configs: AutoSyncConfig[];
  path: string;
};

export function AutoSyncRepositoriesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const store = useOperationalStore();
  const connectionClient = useConnectionClient();
  const [data, setData] = useState<AutoSyncConfigList | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const requestSequence = useRef(0);
  const pendingLoads = useRef(new Set<number>());
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      const requestId = ++requestSequence.current;
      pendingLoads.current.add(requestId);
      if (showLoading) setLoading(true);
      try {
        const result = await connectionClient.call(
          "settings.workspace_auto_sync.list",
        );
        if (
          connectionClient.isCurrent() &&
          requestId === requestSequence.current
        ) {
          setData(result as AutoSyncConfigList);
          setError("");
        }
      } catch (loadError) {
        if (requestId === requestSequence.current) {
          setError(
            connectionClient.isCurrent()
              ? (loadError as Error).message
              : t("worktree.hostUnavailable"),
          );
        }
      } finally {
        pendingLoads.current.delete(requestId);
        if (requestId === requestSequence.current) {
          if (!connectionClient.isCurrent()) {
            setData(null);
            setError(t("worktree.hostUnavailable"));
          }
          setLoading(false);
        }
      }
    },
    [connectionClient],
  );

  useEffect(() => {
    if (!open) return;
    setData(null);
    setSavingKeys(new Set());
    setError("");
    void load(true);
    const timer = window.setInterval(() => {
      if (pendingLoads.current.size === 0) void load(false);
    }, 5_000);
    return () => {
      window.clearInterval(timer);
      requestSequence.current += 1;
      pendingLoads.current.clear();
    };
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    return focusDialogElement(dialogRef.current);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  const setEnabled = async (config: AutoSyncConfig, enabled: boolean) => {
    if (!connectionClient.isCurrent()) return;
    setSavingKeys((current) => new Set(current).add(config.key));
    const result = await store.setWorkspaceAutoSyncConfigEnabled(
      config.key,
      enabled,
    );
    if (result && connectionClient.isCurrent()) await load(false);
    if (!connectionClient.isCurrent()) return;
    setSavingKeys((current) => {
      const next = new Set(current);
      next.delete(config.key);
      return next;
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal auto-sync-repositories-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("worktree.autoSyncReposAria")}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{t("worktree.autoSyncTitle")}</h2>
            <p>{t("worktree.autoSyncReposSubtitle")}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {loading ? (
          <div className="auto-sync-config-loading" role="status">
            <span className="hook-loading-mark" />
            <span>{t("worktree.loadingConfigs")}</span>
          </div>
        ) : (
          <div className="auto-sync-config-content">
            {error ? <p className="modal-error">{error}</p> : null}
            {data?.configs.length ? (
              <div className="auto-sync-config-list">
                {data.configs.map((config) => {
                  const saving = savingKeys.has(config.key);
                  return (
                    <div className="auto-sync-config-item" key={config.key}>
                      <div className="auto-sync-config-main">
                        <div className="auto-sync-config-heading">
                          <strong>{configName(config)}</strong>
                          <span
                            className={
                              "auto-sync-status auto-sync-status-" +
                              (config.running
                                ? "syncing"
                                : (config.last_status ?? "idle"))
                            }
                          >
                            {config.running
                              ? t("worktree.syncingLabel")
                              : statusLabel(config.last_status)}
                          </span>
                        </div>
                        <code title={configLocation(config)}>
                          {configLocation(config)}
                        </code>
                        <div className="auto-sync-config-meta">
                          <span>
                            {t("worktree.everyMinutes", {
                              minutes: config.interval_minutes,
                            })}
                          </span>
                          <span>{formatLastRun(config.last_run_at)}</span>
                          {config.last_branch ? (
                            <span>
                              {t("worktree.branchPrefix", {
                                branch: config.last_branch,
                              })}
                            </span>
                          ) : null}
                        </div>
                        {config.last_message ? (
                          <p title={config.last_message}>
                            {config.last_message}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label={t("worktree.updatesForAria", {
                          name: configName(config),
                        })}
                        aria-checked={config.enabled}
                        className={
                          "settings-switch" + (config.enabled ? " is-on" : "")
                        }
                        disabled={saving}
                        onClick={() => void setEnabled(config, !config.enabled)}
                      >
                        <span />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : error ? null : (
              <div className="auto-sync-config-empty">
                <strong>{t("worktree.noSavedRepos")}</strong>
                <span>{t("worktree.enableFromMenuHint")}</span>
              </div>
            )}
            {data?.path ? (
              <div className="auto-sync-config-store">
                <span>{t("worktree.settingsWord")}</span>
                <code title={data.path}>{data.path}</code>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function configName(config: AutoSyncConfig) {
  const path = config.checkout_path || config.key;
  const parts = path.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || path;
}

function configLocation(config: AutoSyncConfig) {
  if (config.checkout_path) {
    return config.host
      ? config.host + ":" + config.checkout_path
      : config.checkout_path;
  }
  return config.key;
}

function statusLabel(status?: AutoSyncStatus) {
  switch (status) {
    case "updated":
      return t("worktree.statusUpdated");
    case "up_to_date":
      return t("worktree.statusUpToDate");
    case "skipped":
      return t("worktree.statusSkipped");
    case "failed":
      return t("worktree.statusFailedShort");
    default:
      return t("worktree.statusNotRun");
  }
}

function formatLastRun(value?: string) {
  if (!value) return t("worktree.neverRun");
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : t("worktree.lastRunAt", { time: date.toLocaleString(uiLocale()) });
}
