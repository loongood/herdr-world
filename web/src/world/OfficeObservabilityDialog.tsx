import { Activity, CircleOff, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CloseButton } from "../components/CloseButton";
import { focusDialogElement } from "../components/dialogFocus";
import { t, useT } from "../i18n";
import {
  fetchOfficeObservabilityConfiguration,
  type OfficeObservabilityConfiguration,
  updateOfficeObservabilityConfiguration,
} from "./officeObservability";

export function OfficeObservabilityDialog({
  onClose,
  onSaved,
}: {
  onClose(): void;
  onSaved(): void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const [endpoint, setEndpoint] = useState("");
  const [configuration, setConfiguration] =
    useState<OfficeObservabilityConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    let disposed = false;
    const cancelFocus = focusDialogElement(inputRef.current, { select: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    void fetchOfficeObservabilityConfiguration()
      .then((next) => {
        if (disposed) return;
        setConfiguration(next);
        setEndpoint(next.endpoint ?? "");
      })
      .catch((cause: unknown) => {
        if (!disposed)
          setError(errorText(cause, t("observability.loadFailed")));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
      cancelFocus();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const update = async (nextEndpoint: string | null) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await updateOfficeObservabilityConfiguration(nextEndpoint);
      setConfiguration(next);
      setEndpoint(next.endpoint ?? "");
      setMessage(
        next.configured
          ? t("observability.savedMessage")
          : t("observability.disabledMessage"),
      );
      onSaved();
    } catch (cause) {
      setError(errorText(cause, t("observability.saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  const status = configurationStatus(configuration, loading);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal compact-modal world-observability-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("observability.titleAria")}
        onSubmit={(event) => {
          event.preventDefault();
          void update(endpoint.trim() || null);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t("observability.title")}</h2>
          <CloseButton onClick={onClose} label={t("observability.closeAria")} />
        </div>

        <p className="world-observability-help">{t("observability.help")}</p>

        <label className="form-field">
          <span>{t("observability.urlLabel")}</span>
          <input
            ref={inputRef}
            type="url"
            value={endpoint}
            placeholder="http://127.0.0.1:9090"
            autoComplete="off"
            spellCheck={false}
            disabled={loading || busy}
            onChange={(event) => setEndpoint(event.currentTarget.value)}
          />
        </label>
        <p className="world-observability-field-help">
          {t("observability.urlHelp")}
        </p>

        <div
          className="world-observability-health"
          data-status={configuration?.health ?? "unavailable"}
          role="status"
        >
          {configuration?.health === "available" ? (
            <Activity size={15} aria-hidden="true" />
          ) : configuration?.health === "degraded" ? (
            <TriangleAlert size={15} aria-hidden="true" />
          ) : (
            <CircleOff size={15} aria-hidden="true" />
          )}
          <span>{status}</span>
        </div>
        {configuration?.source === "environment" ? (
          <p className="world-observability-field-help">
            {t("observability.envNote")}
          </p>
        ) : null}
        {configuration?.lastSuccessAt ? (
          <p className="world-observability-field-help">
            {t("observability.lastSuccess", {
              time: formatObservedAt(
                configuration.lastSuccessAt,
                t("observability.unknownTime"),
              ),
            })}
          </p>
        ) : null}

        {error ? (
          <p className="modal-error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="modal-message">{message}</p> : null}

        <div className="modal-actions world-observability-actions">
          <button
            type="button"
            className="ghost"
            disabled={
              loading || busy || (!configuration?.configured && !endpoint)
            }
            onClick={() => void update(null)}
          >
            {t("observability.disable")}
          </button>
          <button type="submit" disabled={loading || busy}>
            {busy ? t("observability.saving") : t("observability.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function configurationStatus(
  configuration: OfficeObservabilityConfiguration | null,
  loading: boolean,
) {
  if (loading) return t("observability.statusLoading");
  if (!configuration?.configured) return t("observability.statusNotConfigured");
  if (configuration.health === "available")
    return t("observability.statusAvailable");
  if (configuration.health === "degraded")
    return t("observability.statusDegraded");
  return t("observability.statusWaiting");
}

function formatObservedAt(value: number, fallback: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return fallback;
  }
}

function errorText(value: unknown, fallback: string) {
  return value instanceof Error && value.message ? value.message : fallback;
}
