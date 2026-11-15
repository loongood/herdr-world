import { CircleCheck, CircleOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WorldSourceStatus } from "../../../shared/worldSources";
import { CloseButton } from "../components/CloseButton";
import { focusDialogElement } from "../components/dialogFocus";
import { ThemedSelect } from "../components/ThemedSelect";
import { useT } from "../i18n";
import { useLayer } from "../layerStack";
import {
  updateWorldSource,
  useWorldSources,
  worldSourcesStore,
} from "./worldSources";

const MERGED_WINDOWS = [1, 3, 7, 14, 30, 90];

/** The offered windows, plus a saved one that is not among them. */
const mergedWindows = (current: number) =>
  MERGED_WINDOWS.includes(current)
    ? MERGED_WINDOWS
    : [...MERGED_WINDOWS, current].sort((a, b) => a - b);

/**
 * Sources settings: each built-in source with its state, an on/off switch and
 * its own fields. Jira's API token is write-only; the service keeps it.
 */
export function SourcesDialog({ onClose }: { onClose(): void }) {
  const t = useT();
  const snapshot = useWorldSources();
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  // Escape and Back close it through the shared stack, top layer first, so
  // they never also reach Board or a Work lens underneath.
  useLayer(true, onClose, { element: () => backdropRef.current });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jira, setJira] = useState({ site: "", email: "", jql: "", token: "" });
  const [jiraLoaded, setJiraLoaded] = useState(false);

  const jiraStatus = snapshot.sources.find((source) => source.id === "jira");
  useEffect(() => {
    if (jiraLoaded || jiraStatus?.config.kind !== "jira") return;
    setJira({
      site: jiraStatus.config.site?.replace(/^https:\/\//u, "") ?? "",
      email: jiraStatus.config.email ?? "",
      jql: jiraStatus.config.jql,
      token: "",
    });
    setJiraLoaded(true);
  }, [jiraLoaded, jiraStatus]);

  useEffect(() => {
    const cancelFocus = focusDialogElement(dialogRef.current);
    void worldSourcesStore.refresh();
    return cancelFocus;
  }, []);

  const run = async (
    label: string,
    task: () => Promise<unknown>,
    done: string,
  ) => {
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      await task();
      setMessage(done);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : t("sources.saveFailed"),
      );
    } finally {
      setBusy(null);
    }
  };

  const toggle = (source: WorldSourceStatus) =>
    void run(
      source.id,
      () => updateWorldSource(source.id, { enabled: !source.enabled }),
      `${source.label} ${t(source.enabled ? "sources.switchedOff" : "sources.switchedOn")}.`,
    );

  return (
    <div ref={backdropRef} className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal compact-modal world-sources-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("sources.title")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t("sources.title")}</h2>
          <CloseButton onClick={onClose} label={t("sources.closeAria")} />
        </div>
        <p className="world-observability-help">{t("sources.help")}</p>

        {snapshot.sources.length ? null : (
          <p className="world-observability-field-help">
            {t("sources.loading")}
          </p>
        )}
        {snapshot.sources.map((source) => (
          <section
            key={source.id}
            className="world-source"
            aria-label={source.label}
          >
            <div className="world-source-head">
              <h3>{source.label}</h3>
              <button
                type="button"
                role="switch"
                aria-checked={source.enabled}
                aria-label={t("sources.sourceAria", { label: source.label })}
                className="world-source-switch"
                disabled={busy !== null}
                onClick={() => toggle(source)}
              >
                <span />
              </button>
            </div>
            <div
              className="world-observability-health"
              data-status={
                source.state === "connected"
                  ? "available"
                  : source.state === "error"
                    ? "degraded"
                    : "unavailable"
              }
              role="status"
            >
              {source.state === "connected" ? (
                <CircleCheck size={15} aria-hidden="true" />
              ) : source.state === "error" ? (
                <TriangleAlert size={15} aria-hidden="true" />
              ) : (
                <CircleOff size={15} aria-hidden="true" />
              )}
              <span>{source.detail}</span>
            </div>
            {source.id === "github" &&
            source.enabled &&
            source.config.kind === "github" ? (
              <>
                <p className="world-observability-field-help">
                  {t("sources.githubHelp")}
                </p>
                <label className="form-field">
                  <span>{t("sources.mergedWindow")}</span>
                  <ThemedSelect
                    aria-label={t("sources.mergedWindow")}
                    value={String(source.config.mergedDays)}
                    disabled={busy !== null}
                    options={mergedWindows(source.config.mergedDays).map(
                      (days) => ({
                        value: String(days),
                        label:
                          days === 1
                            ? t("sources.lastDay")
                            : t("sources.lastDays", { count: days }),
                      }),
                    )}
                    onChange={(value) => {
                      const mergedDays = Number(value);
                      void run(
                        "github",
                        () => updateWorldSource("github", { mergedDays }),
                        t("sources.githubSaved"),
                      );
                    }}
                  />
                </label>
              </>
            ) : null}
            {source.id === "jira" && source.enabled ? (
              <form
                className="world-source-fields"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(
                    "jira",
                    async () => {
                      await updateWorldSource("jira", {
                        site: jira.site,
                        email: jira.email,
                        jql: jira.jql,
                        ...(jira.token ? { token: jira.token } : {}),
                      });
                      setJira((value) => ({ ...value, token: "" }));
                    },
                    t("sources.jiraSaved"),
                  );
                }}
              >
                <label className="form-field">
                  <span>{t("sources.site")}</span>
                  <input
                    value={jira.site}
                    placeholder="example.atlassian.net"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => {
                      const site = event.currentTarget.value;
                      setJira((value) => ({ ...value, site }));
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>{t("sources.email")}</span>
                  <input
                    type="email"
                    value={jira.email}
                    placeholder="you@example.com"
                    autoComplete="off"
                    onChange={(event) => {
                      const email = event.currentTarget.value;
                      setJira((value) => ({ ...value, email }));
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>{t("sources.token")}</span>
                  <input
                    type="password"
                    value={jira.token}
                    placeholder={
                      source.config.kind === "jira" && source.config.tokenSet
                        ? t("sources.tokenSetPlaceholder")
                        : t("sources.tokenPlaceholder")
                    }
                    autoComplete="new-password"
                    onChange={(event) => {
                      const token = event.currentTarget.value;
                      setJira((value) => ({ ...value, token }));
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>{t("sources.jql")}</span>
                  <textarea
                    rows={3}
                    value={jira.jql}
                    spellCheck={false}
                    onChange={(event) => {
                      const jql = event.currentTarget.value;
                      setJira((value) => ({ ...value, jql }));
                    }}
                  />
                </label>
                <p className="world-observability-field-help">
                  {t("sources.jiraHelp")}
                </p>
                <div className="modal-actions world-observability-actions">
                  <button
                    type="button"
                    className="ghost"
                    disabled={
                      busy !== null ||
                      !(source.config.kind === "jira" && source.config.tokenSet)
                    }
                    onClick={() =>
                      void run(
                        "jira",
                        () => updateWorldSource("jira", { token: null }),
                        t("sources.tokenRemoved"),
                      )
                    }
                  >
                    {t("sources.removeToken")}
                  </button>
                  <button type="submit" disabled={busy !== null}>
                    {busy === "jira"
                      ? t("sources.saving")
                      : t("sources.saveJira")}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        ))}

        {error ? (
          <p className="modal-error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="modal-message">{message}</p> : null}
        <div className="modal-actions">
          <button
            type="button"
            className="ghost"
            disabled={busy !== null}
            onClick={() =>
              void run(
                "refresh",
                () => worldSourcesStore.refresh(true),
                t("sources.refreshed"),
              )
            }
          >
            <RefreshCw size={14} aria-hidden="true" /> {t("sources.refresh")}
          </button>
        </div>
      </div>
    </div>
  );
}
