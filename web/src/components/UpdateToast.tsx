import { useT } from "../i18n";
import type { UpdateInfo } from "../store/types";
import { CloseButton } from "./CloseButton";
import { ToastMark } from "./NoticeContent";
import { Toast } from "./Toast";

export function UpdateToast({
  info,
  dismissedVersion,
  installing,
  onDismiss,
  onInstall,
}: {
  info: UpdateInfo | null;
  dismissedVersion: string | null;
  installing: boolean;
  onDismiss: () => void;
  onInstall: () => void;
}) {
  const t = useT();
  if (!info?.update_available || dismissedVersion === info.latest_version)
    return null;
  return (
    <Toast
      className={`toast toast-info ${installing ? "toast-loading" : ""}`}
      role="status"
      onDismiss={onDismiss}
      notificationKey={info.latest_version}
      dismissDisabled={installing}
    >
      <ToastMark kind="info" loading={installing} />
      <div className="toast-content">
        <strong>
          {t("toasts.updateAvailable", { version: info.latest_version ?? "" })}
        </strong>
        <p>
          {t("toasts.currentVersion", { version: info.current_version })}
          {info.can_auto_update
            ? ` · ${t("toasts.readyToRestart")}`
            : info.reason
              ? ` · ${info.reason}`
              : ""}
        </p>
        <div className="toast-actions">
          {info.can_auto_update ? (
            <button
              type="button"
              className="toast-action primary"
              onClick={onInstall}
              disabled={installing}
            >
              {installing ? t("toasts.updating") : t("toasts.upgradeRestart")}
            </button>
          ) : null}
          <button
            type="button"
            className="toast-action"
            onClick={onDismiss}
            disabled={installing}
          >
            {t("common.dismiss")}
          </button>
        </div>
      </div>
      <CloseButton
        variant="toast"
        label={t("toasts.dismissUpdateAria")}
        onClick={onDismiss}
        disabled={installing}
      />
    </Toast>
  );
}
