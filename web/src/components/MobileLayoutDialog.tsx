import { useEffect, useRef } from "react";
import { useT } from "../i18n";
import { CloseButton } from "./CloseButton";
import { ThemedSelect } from "./ThemedSelect";
import { focusDialogElement } from "./dialogFocus";
import {
  type LayoutMode,
  MOBILE_BREAKPOINT_MAX,
  MOBILE_BREAKPOINT_MIN,
  type SidebarOrder,
  updateLayoutPreferences,
  useLayoutPreferences,
} from "../layoutPreferences";
import "./MobileLayoutDialog.css";

export function MobileLayoutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) return focusDialogElement(dialogRef.current);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // An open popover (themed select) consumes Escape to close itself.
      if (document.querySelector(".popover-content")) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onClose]);
  const { preferences, mobile, urlOverride } = useLayoutPreferences();
  const t = useT();
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        // Clicks inside portaled popovers bubble here through the React tree.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal mobile-layout-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("shell.layoutPreferences")}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled), input:not(:disabled), select:not(:disabled)",
            ),
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === event.currentTarget)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="modal-head">
          <div>
            <h2>{t("shell.layoutPreferences")}</h2>
            <p>{t("shell.layoutPreferencesHint")}</p>
          </div>
          <CloseButton
            label={t("shell.closeLayoutPreferences")}
            onClick={onClose}
          />
        </div>
        <div className="layout-preferences">
          <label>
            <span>{t("shell.displayMode")}</span>
            <ThemedSelect
              aria-label={t("shell.displayMode")}
              value={urlOverride ?? preferences.mode}
              options={[
                { value: "auto", label: t("shell.displayAuto") },
                { value: "mobile", label: t("shell.displayMobile") },
                { value: "desktop", label: t("shell.displayDesktop") },
              ]}
              onChange={(mode) =>
                updateLayoutPreferences({ mode: mode as LayoutMode })
              }
            />
          </label>
          <p className="muted">
            {mobile
              ? t("shell.usingMobileLayout")
              : t("shell.usingDesktopLayout")}
            {urlOverride
              ? t("shell.urlOverrideSuffix")
              : t("shell.layoutPeriod")}
            {t("shell.bookmarkHint")}
          </p>
          <label>
            <span>{t("shell.mobileUpTo")}</span>
            <input
              key={preferences.mobileBreakpoint}
              type="number"
              min={MOBILE_BREAKPOINT_MIN}
              max={MOBILE_BREAKPOINT_MAX}
              step={1}
              defaultValue={preferences.mobileBreakpoint}
              onBlur={(event) => {
                if (
                  event.currentTarget.value &&
                  event.currentTarget.validity.valid
                ) {
                  updateLayoutPreferences({
                    mobileBreakpoint: event.currentTarget.valueAsNumber,
                  });
                } else {
                  event.currentTarget.value = String(
                    preferences.mobileBreakpoint,
                  );
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </label>
          {(["mobile", "desktop"] as const).map((view) => (
            <label key={view}>
              <span>
                {view === "mobile"
                  ? t("shell.sidebarMobile")
                  : t("shell.sidebarDesktop")}
              </span>
              <ThemedSelect
                aria-label={
                  view === "mobile"
                    ? t("shell.sidebarMobile")
                    : t("shell.sidebarDesktop")
                }
                value={preferences[`${view}SidebarOrder`]}
                options={[
                  { value: "agents-first", label: t("shell.agentsOnTop") },
                  {
                    value: "workspaces-first",
                    label: t("shell.workspacesOnTop"),
                  },
                ]}
                onChange={(order) =>
                  updateLayoutPreferences({
                    [`${view}SidebarOrder`]: order as SidebarOrder,
                  })
                }
              />
            </label>
          ))}
          <p className="muted">{t("shell.sidebarOrderHint")}</p>
        </div>
        <div className="modal-actions">
          <span className="muted">{t("shell.changesSavedInBrowser")}</span>
          <button type="button" onClick={onClose}>
            {t("config.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
