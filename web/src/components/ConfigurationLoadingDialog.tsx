import { useEffect, useRef } from "react";
import { focusDialogElement } from "./dialogFocus";
import { MobileSheetHandle } from "./MobileSheetHandle";
import { useT } from "../i18n";
import "./ConfigurationDialog.css";

export function ConfigurationLoadingDialog({
  onClose,
  buttonLabel,
}: {
  onClose: () => void;
  buttonLabel?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = useT();
  useEffect(() => {
    const cancelFocus = focusDialogElement(buttonRef.current);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "Tab") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") onClose();
      else {
        const handle =
          buttonRef.current?.parentElement?.querySelector<HTMLButtonElement>(
            ".mobile-sheet-handle",
          );
        if (
          document.activeElement === buttonRef.current &&
          handle?.getClientRects().length
        )
          handle.focus();
        else buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      cancelFocus();
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop configuration-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal configuration-loading-modal mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("aria.loadingConfiguration")}
      >
        <MobileSheetHandle
          label={t("aria.dismissLoadingConfiguration")}
          onClose={onClose}
        />
        <p role="status">{t("aria.loadingConfigurationText")}</p>
        <button ref={buttonRef} type="button" onClick={onClose}>
          {buttonLabel ?? t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
