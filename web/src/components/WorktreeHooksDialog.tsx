import { useEffect, useRef, useState } from "react";
import { useOperationalStore } from "../store";
import { useConnectionClient } from "../useConnectionClient";
import type { WorktreeHookInfo } from "../worktreeLifecycle";
import { useT } from "../i18n";
import { CloseButton } from "./CloseButton";
import "./WorktreeHooksDialog.css";

const HOOKS = ["setup", "opened", "teardown", "removed"] as const;

export function WorktreeHooksDialog({
  open,
  workspaceId,
  onClose,
}: {
  open: boolean;
  workspaceId?: string;
  onClose: () => void;
}) {
  const t = useT();
  const store = useOperationalStore();
  const connectionClient = useConnectionClient();
  const [info, setInfo] = useState<WorktreeHookInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const scopeKey = JSON.stringify([
    open,
    workspaceId ?? null,
    connectionClient.connectionId,
    connectionClient.serverRuntimeGeneration ?? connectionClient.generation,
  ]);
  const priorScopeKeyRef = useRef(scopeKey);
  const scopeVersionRef = useRef(0);
  if (priorScopeKeyRef.current !== scopeKey) {
    priorScopeKeyRef.current = scopeKey;
    scopeVersionRef.current += 1;
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;
    const scopeVersion = scopeVersionRef.current;
    const request = ++requestRef.current;
    const requestIsCurrent = () =>
      !cancelled &&
      scopeVersionRef.current === scopeVersion &&
      requestRef.current === request &&
      connectionClient.isCurrent();
    setLoading(true);
    setSaving(false);
    setError("");
    setInfo(null);
    connectionClient
      .call("settings.worktree_hooks.get", { workspace_id: workspaceId })
      .then((result) => {
        if (requestIsCurrent()) setInfo(result as WorktreeHookInfo);
      })
      .catch((err) => {
        if (requestIsCurrent()) setError((err as Error).message);
      })
      .finally(() => {
        if (requestIsCurrent()) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionClient, open, scopeKey, workspaceId]);

  if (!open) return null;

  const setEnabled = async (enabled: boolean) => {
    if (!info?.key || !connectionClient.isCurrent()) return;
    const infoKey = info.key;
    const scopeVersion = scopeVersionRef.current;
    const request = ++requestRef.current;
    const requestIsCurrent = () =>
      scopeVersionRef.current === scopeVersion &&
      requestRef.current === request &&
      connectionClient.isCurrent();
    setSaving(true);
    setError("");
    try {
      const result = await store.setRepoWorktreeHooksEnabled(infoKey, enabled);
      if (!requestIsCurrent()) return;
      if (result === undefined) {
        setError(store.get().error || t("worktree.hooksUpdateFailed"));
        return;
      }
      setInfo((current) =>
        current?.key === infoKey ? { ...current, enabled } : current,
      );
    } catch (err) {
      if (requestIsCurrent()) setError((err as Error).message);
    } finally {
      if (requestIsCurrent()) setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal worktree-hooks-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("worktree.hooksAria")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t("worktree.hooksTitle")}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <p className="hook-doc-note">
          {t("worktree.hooksNoteBefore")} <code>roamgate.json</code>
          {t("worktree.hooksNoteMiddle")} <code>paseo.json</code>
          {t("worktree.hooksNoteAfter")}{" "}
          <a
            href="https://github.com/powerfooI/roamgate/blob/main/docs/DEPLOYMENT.md#worktree-hooks"
            target="_blank"
            rel="noreferrer"
          >
            {t("worktree.viewDocs")}
          </a>
        </p>

        {loading ? (
          <div className="hook-loading" role="status">
            <span className="hook-loading-mark" />
            <span>{t("worktree.loadingHooks")}</span>
          </div>
        ) : (
          <>
            {error || info?.error ? (
              <p className="modal-error">{error || info?.error}</p>
            ) : null}

            <div className="hook-summary">
              <SummaryRow
                label={t("worktree.summaryRepo")}
                value={info?.repo_name ?? "-"}
              />
              <SummaryRow
                label={t("worktree.summaryStoreKey")}
                value={info?.key ?? "-"}
              />
              <SummaryRow
                label={t("worktree.summaryConfiguration")}
                value={info?.config_path ?? "-"}
              />
              <SummaryRow
                label={t("worktree.summaryFormat")}
                value={
                  info?.config_source === "paseo"
                    ? t("worktree.formatPaseo")
                    : info?.config_source === "roamgate"
                      ? t("worktree.formatRoamgate")
                      : "-"
                }
              />
              <SummaryRow
                label={t("worktree.summaryCheckout")}
                value={info?.checkout_path ?? "-"}
              />
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={info?.enabled ?? true}
                disabled={!info?.key || saving}
                onChange={(e) => void setEnabled(e.currentTarget.checked)}
              />
              <span>
                {saving
                  ? t("worktree.savingLabel")
                  : t("worktree.enableHooksLabel")}
              </span>
            </label>

            <div className="hook-fields">
              {HOOKS.map((name) => {
                const value = info?.hooks?.[name] ?? "";
                const label =
                  name === "setup"
                    ? t("worktree.hookSetup")
                    : name === "opened"
                      ? t("worktree.hookOpened")
                      : name === "teardown"
                        ? t("worktree.hookTeardown")
                        : t("worktree.hookRemoved");
                return (
                  <section key={name} className="hook-field">
                    <span>{label}</span>
                    <pre className={value ? "" : "is-empty"}>
                      <code>{value || t("worktree.notConfigured")}</code>
                    </pre>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="hook-summary-row">
      <span>{label}</span>
      <code title={value}>{value}</code>
    </div>
  );
}
