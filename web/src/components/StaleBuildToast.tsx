import { useEffect, useState } from "react";
import {
  checkServedBuild,
  dismissReloadRequest,
  type ReloadOffer,
  reloadOffer,
  useBuildFreshness,
} from "../buildFreshness";
import { useT } from "../i18n";
import { CloseButton } from "./CloseButton";
import { reloadApplicationPage } from "./ConfigMenu";
import { ToastMark } from "./NoticeContent";
import { Toast } from "./Toast";

/** The reload to offer, or null while this tab is current or it was put off. */
export function useStaleBuild(status: string) {
  const build = useBuildFreshness();
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    // A server restart drops the socket; ask which build it serves once back.
    if (status === "connected") void checkServedBuild();
  }, [status]);
  const offer = reloadOffer(build, dismissed);
  if (!offer) return null;
  return {
    offer,
    onDismiss: () => {
      if (offer.kind === "chunk") dismissReloadRequest();
      setDismissed(build.served);
    },
  };
}

/** Offers, never takes, a reload when this tab's build is out of date. */
export function StaleBuildToast({
  offer,
  onDismiss,
}: {
  offer: ReloadOffer;
  onDismiss: () => void;
}) {
  const t = useT();
  return (
    <Toast
      className="toast toast-info"
      role="status"
      onDismiss={onDismiss}
      notificationKey={offer.kind === "build" ? offer.served : "chunk"}
    >
      <ToastMark kind="info" />
      <div className="toast-content">
        {offer.kind === "build" ? (
          <>
            <strong>{t("toasts.staleBuildTitle")}</strong>
            <p>
              {t("toasts.staleBuildDetail", {
                loaded: offer.loaded,
                served: offer.served,
              })}
            </p>
          </>
        ) : (
          <>
            <strong>{t("toasts.staleChunkTitle")}</strong>
            <p>{t("toasts.staleChunkDetail")}</p>
          </>
        )}
        <div className="toast-actions">
          <button
            type="button"
            className="toast-action primary"
            onClick={() => reloadApplicationPage()}
          >
            {t("common.reload")}
          </button>
          <button type="button" className="toast-action" onClick={onDismiss}>
            {t("common.later")}
          </button>
        </div>
      </div>
      <CloseButton
        variant="toast"
        label={t("toasts.dismissReloadAria")}
        onClick={onDismiss}
      />
    </Toast>
  );
}
