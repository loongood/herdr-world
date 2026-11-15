import { useLayer } from "../layerStack";
import {
  WindowSwitcher,
  type WindowSwitcherEntry,
} from "../world/windows/WindowSwitcher";
import { t, useT } from "../i18n";
import { LayoutGrid, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { measuredFixedPositionScale } from "../fixedPositionScale";
import { shortcutLabel, useShortcutPreferences } from "../shortcutPreferences";
import type { ShortcutId } from "../shortcutBindings";
import type { TerminalWindowArrangementPreset } from "../world/terminalWindowArrangement";
import "./WindowArrangementMenu.css";

export type WindowArrangementCommand =
  | TerminalWindowArrangementPreset
  | "restore"
  | "close-all"
  | "open-all"
  | "fit-right"
  | "fit-left";

export type WindowArrangementControl = {
  windows?: readonly WindowSwitcherEntry[];
  activePreset: TerminalWindowArrangementPreset | null;
  disabledReasons: Partial<Record<WindowArrangementCommand, string>>;
  /** Commands not offered at all in this layout (phone: no Fit). */
  hidden?: readonly WindowArrangementCommand[];
  onSelect: (command: WindowArrangementCommand) => void;
};

export const WINDOW_ARRANGEMENT_CHOICES: readonly {
  command: WindowArrangementCommand;
  shortcutId?: ShortcutId;
  /** A placement of the active window: in Actions, not this menu. */
  actionOnly?: true;
}[] = [
  {
    command: "single",
    shortcutId: "arrangement.single",
  },
  {
    command: "cascade",
    shortcutId: "arrangement.cascade",
  },
  {
    command: "columns",
    shortcutId: "arrangement.columns",
  },
  {
    command: "rows",
    shortcutId: "arrangement.rows",
  },
  {
    command: "grid",
    shortcutId: "arrangement.grid",
  },
  {
    command: "restore",
    shortcutId: "arrangement.restore",
  },
  {
    command: "close-all",
  },
  {
    command: "open-all",
  },
  {
    command: "fit-right",
    shortcutId: "window.fitRight",
    actionOnly: true,
  },
  {
    command: "fit-left",
    shortcutId: "window.fitLeft",
    actionOnly: true,
  },
];

export function arrangementLabel(command: WindowArrangementCommand): string {
  switch (command) {
    case "single":
      return t("window.arrangeSingle");
    case "cascade":
      return t("window.arrangeCascade");
    case "columns":
      return t("window.arrangeColumns");
    case "rows":
      return t("window.arrangeRows");
    case "grid":
      return t("window.arrangeGrid");
    case "restore":
      return t("window.arrangeRestore");
    case "close-all":
      return t("window.arrangeCloseAll");
    case "open-all":
      return t("window.arrangeOpenAll");
    case "fit-right":
      return t("window.arrangeFitRight");
    case "fit-left":
      return t("window.arrangeFitLeft");
  }
}

export function arrangementDescription(
  command: WindowArrangementCommand,
): string {
  switch (command) {
    case "single":
      return t("window.arrangeSingleHint");
    case "cascade":
      return t("window.arrangeCascadeHint");
    case "columns":
      return t("window.arrangeColumnsHint");
    case "rows":
      return t("window.arrangeRowsHint");
    case "grid":
      return t("window.arrangeGridHint");
    case "restore":
      return t("window.arrangeRestoreHint");
    case "close-all":
      return t("window.arrangeCloseAllHint");
    case "open-all":
      return t("window.arrangeOpenAllHint");
    case "fit-right":
      return t("window.arrangeFitRightHint");
    case "fit-left":
      return t("window.arrangeFitLeftHint");
  }
}

/** The choices a layout offers in Actions; phone layouts hide Fit. */
export function offeredArrangementChoices(control: WindowArrangementControl) {
  return WINDOW_ARRANGEMENT_CHOICES.filter(
    ({ command }) => !control.hidden?.includes(command),
  );
}

export function WindowArrangementMenu({
  control,
  showWindowSwitcher = true,
}: {
  control: WindowArrangementControl;
  showWindowSwitcher?: boolean;
}) {
  const t = useT();
  useShortcutPreferences();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Escape, a press outside and Back close it through the shared stack.
  useLayer(open, () => setOpen(false), {
    element: () => menuRef.current,
    anchors: () => [triggerRef.current],
  });

  useEffect(() => {
    if (!open) return;
    const closeMenu = () => setOpen(false);
    const items =
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const firstEnabled = [...(items ?? [])].find(
      (item) => item.getAttribute("aria-disabled") !== "true",
    );
    (firstEnabled ?? items?.[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", closeMenu);
    const onScroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const triggerRect = open ? triggerRef.current?.getBoundingClientRect() : null;
  const scale = open ? measuredFixedPositionScale() : 1;
  const menuWidth = Math.min(246, (window.innerWidth - 16) / scale);
  const menuHeight = Math.min(420, (window.innerHeight * 0.8) / scale);
  const menuWidthOnScreen = menuWidth * scale;
  const menuHeightOnScreen = menuHeight * scale;
  const position: React.CSSProperties | undefined = triggerRect
    ? {
        width: menuWidth,
        maxHeight: menuHeight,
        left:
          Math.max(
            8,
            Math.min(
              triggerRect.right - menuWidthOnScreen,
              window.innerWidth - menuWidthOnScreen - 8,
            ),
          ) / scale,
        top:
          (triggerRect.bottom + menuHeightOnScreen + 8 <= window.innerHeight
            ? triggerRect.bottom + 4
            : Math.max(8, triggerRect.top - menuHeightOnScreen - 4)) / scale,
      }
    : undefined;

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ),
    ];
    const current = items.findIndex((item) => item === document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length;
    items[next]?.focus();
  };

  return (
    <>
      {showWindowSwitcher && control.windows ? (
        <WindowSwitcher entries={control.windows} />
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className={`tabbar-arrangement-trigger ${open ? "is-active" : ""}`}
        aria-label={t("window.arrangeWindows")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("window.arrangeWindows")}
        onClick={() => setOpen((current) => !current)}
      >
        <LayoutGrid size={16} aria-hidden="true" />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={t("window.arrangeWindows")}
              className="window-arrangement-menu"
              style={position}
              onKeyDown={onMenuKeyDown}
            >
              {WINDOW_ARRANGEMENT_CHOICES.filter(
                (choice) => !choice.actionOnly,
              ).map(({ command, shortcutId }) => {
                const reason = control.disabledReasons[command];
                const shortcut = shortcutId
                  ? shortcutLabel(shortcutId)
                  : t("shortcuts.unassigned");
                return (
                  <button
                    key={command}
                    type="button"
                    role="menuitem"
                    aria-disabled={!!reason}
                    className={`window-arrangement-option ${control.activePreset === command ? "is-active" : ""}`}
                    title={reason ?? arrangementDescription(command)}
                    onClick={() => {
                      if (reason) return;
                      setOpen(false);
                      control.onSelect(command);
                      queueMicrotask(() => triggerRef.current?.focus());
                    }}
                  >
                    {command === "restore" || command === "close-all" ? (
                      <RotateCcw size={19} aria-hidden="true" />
                    ) : (
                      <span
                        className={`window-arrangement-preview is-${command}`}
                        aria-hidden="true"
                      >
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                    <span className="window-arrangement-copy">
                      <strong>{arrangementLabel(command)}</strong>
                      <small>{reason ?? arrangementDescription(command)}</small>
                    </span>
                    {shortcut !== t("shortcuts.unassigned") ? (
                      <kbd className="window-arrangement-shortcut">
                        {shortcut}
                      </kbd>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
