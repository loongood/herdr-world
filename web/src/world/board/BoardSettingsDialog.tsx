import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "../../components/CloseButton";
import { focusDialogElement } from "../../components/dialogFocus";
import { useT } from "../../i18n";
import { useLayer } from "../../layerStack";
import type { WorldAgentStatus } from "../worldObject";
import {
  BOARD_STATUS_LABEL_KEYS,
  type BoardAppearance,
  type BoardStatusLabelKey,
  defaultBoardStatusColor,
} from "./boardAppearance";

export function BoardSettingsDialog({
  mode,
  appearance,
  onChange,
  onClose,
}: {
  mode: "help" | "colors";
  appearance: BoardAppearance;
  onChange(next: BoardAppearance): void;
  onClose(): void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const title =
    mode === "help" ? t("board.titleHelp") : t("board.titleColours");
  useLayer(true, onClose, { element: () => ref.current });
  useEffect(() => focusDialogElement(ref.current), []);
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        ref={ref}
        className="modal compact-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <CloseButton
            label={
              mode === "help" ? t("board.closeHelp") : t("board.closeColours")
            }
            onClick={onClose}
          />
        </div>
        {mode === "help" ? (
          <>
            <p>{t("board.helpNext")}</p>
            <p>{t("board.helpPan")}</p>
            <p>{t("board.helpArrange")}</p>
            <p>{t("board.helpNote")}</p>
            <p>{t("board.helpPhone")}</p>
            <p>{t("board.helpSurface")}</p>
          </>
        ) : (
          <>
            <p>{t("board.coloursIntro")}</p>
            {(
              Object.entries(BOARD_STATUS_LABEL_KEYS) as [
                WorldAgentStatus,
                BoardStatusLabelKey,
              ][]
            ).map(([status, key]) => (
              <label key={status} className="form-field">
                <span>{t(key)}</span>
                <input
                  type="color"
                  aria-label={t("board.statusColourAria", { label: t(key) })}
                  value={
                    appearance.statusColors[status] ??
                    defaultBoardStatusColor(
                      status,
                      appearance,
                      document.documentElement.dataset.theme,
                    )
                  }
                  onChange={(event) =>
                    onChange({
                      ...appearance,
                      statusColors: {
                        ...appearance.statusColors,
                        [status]: event.currentTarget.value,
                      },
                    })
                  }
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...appearance, statusColors: {} })}
            >
              {t("board.resetColours")}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
