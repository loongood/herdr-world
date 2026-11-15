import {
  ArrowRight,
  Check,
  Download,
  LoaderCircle,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useT } from "../i18n";
import "./HerdrSetupCard.css";

type SetupInfo = {
  state: "missing" | "installed";
  verified_version: string;
};

export function HerdrSetupCard({
  compact = false,
  enabled = true,
  children = null,
}: {
  compact?: boolean;
  enabled?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  const titleId = useId();
  const [info, setInfo] = useState<SetupInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestInProgress = useRef(false);
  const reviewButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/herdr/status", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        if (controller.signal.aborted) return;
        if (
          status?.can_setup === true &&
          (status.state === "missing" || status.state === "installed") &&
          typeof status.verified_version === "string"
        ) {
          setInfo(status);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [enabled]);

  function cancel() {
    setConfirming(false);
    requestAnimationFrame(() => reviewButton.current?.focus());
  }

  async function setup() {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/herdr/setup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "x-herdr-world-herdr-setup": "1" },
      });
      const result = await response.json();
      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.error ?? t("herdrSetup.failedTryAgain"));
      }
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("herdrSetup.failed"));
      setBusy(false);
      requestInProgress.current = false;
    }
  }

  if (!enabled) return children;
  if (checking) {
    return compact ? null : (
      <div className="herdr-setup-checking" role="status">
        <LoaderCircle
          size={16}
          className="herdr-setup-spinner"
          aria-hidden="true"
        />
        {t("herdrSetup.checking")}
      </div>
    );
  }
  if (!info) return children;

  const missing = info.state === "missing";
  const title = busy
    ? t("herdrSetup.titleBusy")
    : confirming
      ? missing
        ? t("herdrSetup.titleInstallVersion", {
            version: info.verified_version,
          })
        : t("herdrSetup.titleStartService")
      : missing
        ? t("herdrSetup.titleFirst")
        : t("herdrSetup.titleOnline");

  return (
    <section
      className={`herdr-setup-card${compact ? " herdr-setup-card-compact" : ""}`}
      aria-labelledby={titleId}
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key === "Escape" && confirming && !busy) {
          event.stopPropagation();
          cancel();
        }
      }}
    >
      <div className="herdr-setup-heading">
        <span className="herdr-setup-mark" aria-hidden="true">
          <Terminal size={24} />
        </span>
        <span className="herdr-setup-eyebrow">
          {missing
            ? t("herdrSetup.eyebrowFirst")
            : t("herdrSetup.eyebrowServer")}
        </span>
        <span className="herdr-setup-badge">
          {missing ? (
            <ShieldCheck size={13} aria-hidden="true" />
          ) : (
            <Server size={13} aria-hidden="true" />
          )}
          {missing
            ? t("herdrSetup.verifiedVersion", {
                version: info.verified_version,
              })
            : t("herdrSetup.installed")}
        </span>
      </div>

      <div className="herdr-setup-intro" aria-live="polite">
        <h2 id={titleId}>{title}</h2>
        <p>
          {busy
            ? t("herdrSetup.busyHelp")
            : confirming
              ? t("herdrSetup.confirmHelp")
              : missing
                ? t("herdrSetup.missingHelp")
                : t("herdrSetup.installedHelp")}
        </p>
      </div>

      {busy ? (
        <div className="herdr-setup-progress" role="status">
          <LoaderCircle
            size={18}
            className="herdr-setup-spinner"
            aria-hidden="true"
          />
          <div>
            <strong>
              {missing
                ? t("herdrSetup.stepInstalling")
                : t("herdrSetup.stepStarting")}
            </strong>
            <span>{t("herdrSetup.stepMayTake")}</span>
          </div>
        </div>
      ) : (
        <ul className="herdr-setup-steps">
          <li>
            {missing ? (
              <Download size={18} aria-hidden="true" />
            ) : (
              <Check size={18} aria-hidden="true" />
            )}
            <div>
              <strong>
                {missing
                  ? t("herdrSetup.stepVersion", {
                      version: info.verified_version,
                    })
                  : t("herdrSetup.stepExisting")}
              </strong>
              <span>
                {missing
                  ? t("herdrSetup.stepVerified")
                  : t("herdrSetup.stepUnchanged")}
              </span>
            </div>
          </li>
          <li>
            <Server size={18} aria-hidden="true" />
            <div>
              <strong>{t("herdrSetup.stepService")}</strong>
              <span>{t("herdrSetup.stepServiceDetail")}</span>
            </div>
          </li>
        </ul>
      )}

      {error ? (
        <div className="herdr-setup-error" role="alert">
          <strong>{t("herdrSetup.errorTitle")}</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="herdr-setup-footer">
        {confirming ? (
          <div className="herdr-setup-actions">
            <button
              type="button"
              className="herdr-setup-primary"
              disabled={busy}
              onClick={() => void setup()}
            >
              {busy
                ? t("herdrSetup.settingUp")
                : error
                  ? t("herdrSetup.tryAgain")
                  : missing
                    ? t("herdrSetup.installStart")
                    : t("herdrSetup.startService")}
              {!busy ? <ArrowRight size={16} aria-hidden="true" /> : null}
            </button>
            <button
              type="button"
              className="herdr-setup-cancel"
              disabled={busy}
              onClick={cancel}
            >
              {t("herdrSetup.cancel")}
            </button>
          </div>
        ) : (
          <button
            ref={reviewButton}
            type="button"
            className="herdr-setup-primary"
            onClick={() => setConfirming(true)}
          >
            {missing
              ? t("herdrSetup.setupAction")
              : t("herdrSetup.startAction")}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
        <p className="herdr-setup-footnote">
          {confirming
            ? t("herdrSetup.footnoteConfirm")
            : t("herdrSetup.footnoteReview")}
        </p>
      </div>
    </section>
  );
}
