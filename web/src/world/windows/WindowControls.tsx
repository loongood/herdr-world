import {
  INTEREST_CHOICES,
  type InterestChoice,
  interestHint,
  interestLabel,
} from "../../components/InterestButton";
import {
  ChevronLeft,
  Maximize2,
  Minimize2,
  Minus,
  MoreHorizontal,
  Pin,
  X,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type ColorChoice,
  ColorSwatchButton,
  type ColorValue,
} from "../../components/ColorSwatch";
import { measuredFixedPositionScale } from "../../fixedPositionScale";
import { t, useT } from "../../i18n";
import { useLayer } from "../../layerStack";
import type { FitSide, SnapTarget } from "./windowManager";
import "./windows.css";
import "../../components/WorkspaceInspectorActions.css";

export type ManagedWindowControls = {
  maximized: boolean;
  compact: boolean;
  onMinimize(): void;
  onMaximize(): void;
  onClose(): void;
  onSnap(target: SnapTarget): void;
  /** Against one edge at the normal docked width, not half the screen. */
  onFit(side: FitSide): void;
  onFloat(): void;
  /** A terminal window's colour, chosen in its menu. */
  color?: {
    palette: readonly ColorChoice[];
    current: ColorValue;
    onColor(id: string | null): void;
  } | null;
  /** An agent window's Town desk pin (useDeskPins.ts), toggled in its menu. */
  pin?: { pinned: boolean; onPin(pinned: boolean): void } | null;
  /** An agent window: put the agent in the bin (bin/WorldBin.tsx). */
  bin?: { onBin(): void } | null;
  /** Close is shown as Back at the start of the bar, as Town's window does. */
  back?: { label: string };
  /** A narrow window: maximize joins ⋯ so the bar still fits. */
  narrow?: boolean;
  /** On a phone, the window's views live in ⋯ instead of the bar. */
  views?: readonly {
    id: string;
    label: string;
    checked: boolean;
    onSelect(): void;
  }[];
  /** Mobile Inspector attention settings, independent of the selected view. */
  attention?: InterestChoice | null;
  /** Other agents and terminals this window can switch to. */
  switchTo?: readonly {
    id: string;
    label: string;
    detail?: string;
    onSelect(): void;
  }[];
};

/** Close presented as Back, for the leading edge of a window bar. */
export function WindowBackButton({
  controls,
  label = t("window.defaultName"),
}: {
  controls: ManagedWindowControls;
  label?: string;
}) {
  const t = useT();
  if (!controls.back) return null;
  // It closes the window, so it keeps the window's Close name; the tooltip
  // says where Back leads.
  return (
    <button
      type="button"
      className="world-window-back"
      aria-label={t("window.closeAria", { name: label })}
      title={controls.back.label}
      onClick={controls.onClose}
    >
      <ChevronLeft size={18} aria-hidden="true" />
    </button>
  );
}
const fitChoices = () => [
  { side: "right" as FitSide, label: t("window.arrangeFitRight") },
  { side: "left" as FitSide, label: t("window.arrangeFitLeft") },
];
const snapChoices = () => [
  { target: "left" as SnapTarget, label: t("window.snapLeftHalf") },
  { target: "right" as SnapTarget, label: t("window.snapRightHalf") },
  { target: "top" as SnapTarget, label: t("window.snapTopHalf") },
  { target: "bottom" as SnapTarget, label: t("window.snapBottomHalf") },
  { target: "top-left" as SnapTarget, label: t("window.snapTopLeft") },
  { target: "top-right" as SnapTarget, label: t("window.snapTopRight") },
  { target: "bottom-left" as SnapTarget, label: t("window.snapBottomLeft") },
  { target: "bottom-right" as SnapTarget, label: t("window.snapBottomRight") },
];
type MenuItem = {
  key?: string;
  label: string;
  detail?: string;
  checked?: boolean;
  /** A setting turned on and off (the desk pin), not a choice among views. */
  toggle?: boolean;
  section?: string;
  run(): void;
};

/**
 * The window bar keeps minimise, maximise and close as buttons. Additional
 * actions and the existing menu shortcut for minimise share ⋯.
 */
export function WindowControls({
  controls,
  label = t("window.defaultName"),
}: {
  controls: ManagedWindowControls;
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const pinItems: MenuItem[] = controls.pin
    ? [
        {
          key: "pin",
          label: controls.pin.pinned
            ? t("window.unpinTown")
            : t("window.pinTown"),
          checked: controls.pin.pinned,
          toggle: true,
          run: () => controls.pin?.onPin(!controls.pin.pinned),
        },
      ]
    : [];
  const items: MenuItem[] = [
    ...(controls.compact ? pinItems : []),
    ...(controls.views ?? []).map((view, index) => ({
      key: `view:${view.id}`,
      label: view.label,
      checked: view.checked,
      section: index === 0 ? t("window.sectionView") : undefined,
      run: view.onSelect,
    })),
    ...(controls.attention?.onDefault
      ? [
          {
            key: "attention:default",
            label: t("interest.default"),
            detail: t("interest.defaultHint"),
            checked: controls.attention.override === null,
            section: t("window.sectionAttention"),
            run: () => controls.attention?.onDefault?.(),
          },
        ]
      : []),
    ...(controls.attention
      ? INTEREST_CHOICES.map((choice, index) => ({
          key: `attention:${choice}`,
          label:
            controls.attention?.onDefault && choice === "watching"
              ? t("interest.watch")
              : interestLabel(choice),
          detail:
            controls.attention?.quiet && choice === "watching"
              ? t("interest.quietHint")
              : interestHint(choice),
          checked:
            (controls.attention?.onDefault
              ? controls.attention.override
              : controls.attention?.current) === choice,
          section:
            index === 0 && !controls.attention?.onDefault
              ? t("window.sectionAttention")
              : undefined,
          run: () => controls.attention?.onInterest(choice),
        }))
      : []),
    ...(controls.switchTo ?? []).map((target, index) => ({
      key: `switch:${target.id}`,
      label: target.label,
      detail: target.detail,
      section: index === 0 ? t("window.sectionSwitchTo") : undefined,
      run: target.onSelect,
    })),
    ...(controls.narrow
      ? [
          {
            label: controls.maximized
              ? t("window.restoreItem")
              : t("window.maximizeItem"),
            section:
              controls.views?.length ||
              controls.switchTo?.length ||
              controls.attention
                ? t("window.sectionWindow")
                : undefined,
            run: controls.onMaximize,
          },
        ]
      : []),
    {
      label: t("window.minimizeItem"),
      section: controls.narrow
        ? undefined
        : controls.views?.length ||
            controls.switchTo?.length ||
            controls.attention
          ? t("window.sectionWindow")
          : undefined,
      run: controls.onMinimize,
    },
    ...(controls.compact
      ? []
      : [
          ...fitChoices().map(({ side, label }) => ({
            label,
            run: () => controls.onFit(side),
          })),
          ...snapChoices().map(({ target, label }) => ({
            label,
            run: () => controls.onSnap(target),
          })),
          { label: t("window.floatItem"), run: controls.onFloat },
        ]),
    ...(!controls.compact ? pinItems : []),
    ...(controls.bin
      ? [
          {
            key: "bin",
            label: t("window.binItem"),
            run: controls.bin.onBin,
          },
        ]
      : []),
  ];
  const host = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useLayer(open, () => setOpen(false), {
    element: () => menu.current,
    anchors: () => [trigger.current],
  });
  useEffect(() => {
    if (!open) return;
    // The checked item (the current view) first, else the first item.
    const items = menu.current;
    (
      items?.querySelector<HTMLButtonElement>(
        '[role="menuitemradio"][aria-checked="true"]',
      ) ??
      items?.querySelector<HTMLButtonElement>(
        '[role^="menuitem"]:not(.world-window-pin)',
      )
    )?.focus();
  }, [open]);
  const scale = open ? measuredFixedPositionScale() : 1;
  const anchor = trigger.current?.getBoundingClientRect();
  const position = anchor
    ? {
        left:
          Math.max(
            8,
            Math.min(
              anchor.right - 240 * scale,
              window.innerWidth - 240 * scale - 8,
            ),
          ) / scale,
        top:
          Math.max(
            8,
            Math.min(
              anchor.bottom + 4,
              window.innerHeight - (controls.color ? 290 : 250) * scale - 8,
            ),
          ) / scale,
      }
    : {};
  return (
    <div
      ref={host}
      className="world-window-controls workspace-inspector-actions"
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "Tab") setOpen(false);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          const items = Array.from(
            menu.current?.querySelectorAll<HTMLButtonElement>(
              '[role^="menuitem"], .color-swatch-button',
            ) ?? [],
          );
          const index = items.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          items[
            (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length
          ]?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={t("window.moreAria", { name: label })}
        title={t("window.actionsTitle")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={16} />
      </button>
      <button
        type="button"
        aria-label={t("window.minimizeAria", { name: label })}
        title={t("window.minimizeTitle")}
        onClick={controls.onMinimize}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      {!controls.compact && !controls.narrow && (
        <button
          type="button"
          aria-label={
            controls.maximized
              ? t("window.restoreNamed", { name: label })
              : t("window.maximizeAria", { name: label })
          }
          title={
            controls.maximized
              ? t("window.restoreTitle")
              : t("window.maximizeTitle")
          }
          onClick={controls.onMaximize}
        >
          {controls.maximized ? (
            <Minimize2 size={15} />
          ) : (
            <Maximize2 size={15} />
          )}
        </button>
      )}
      {controls.back ? null : (
        <button
          type="button"
          className="world-window-close"
          aria-label={t("window.closeAria", { name: label })}
          title={t("window.closeTitle")}
          onClick={controls.onClose}
        >
          <X size={16} />
        </button>
      )}
      {open &&
        createPortal(
          <div
            ref={menu}
            style={{
              ...position,
              maxHeight: `calc(100dvh - ${(position.top ?? 8) + 8}px)`,
            }}
            // The menu is portaled out of the window, so it carries the
            // window's dark scope (Town) with it.
            className={`world-window-snap-menu ${
              host.current?.closest(".theme-scope-dark")
                ? "theme-scope-dark"
                : ""
            }`}
            role="menu"
            aria-label={t("window.actionsAria")}
          >
            {items.map((item) => (
              <Fragment key={item.key ?? item.label}>
                {item.section ? (
                  <div
                    className="world-window-menu-section"
                    role="presentation"
                  >
                    {item.section}
                  </div>
                ) : null}
                <button
                  type="button"
                  className={
                    item.toggle
                      ? "is-wide world-window-pin"
                      : item.key
                        ? "is-wide"
                        : undefined
                  }
                  title={item.toggle ? t("window.pinTownTitle") : undefined}
                  role={
                    item.checked === undefined
                      ? "menuitem"
                      : item.toggle
                        ? "menuitemcheckbox"
                        : "menuitemradio"
                  }
                  aria-checked={item.checked}
                  onClick={() => {
                    item.run();
                    setOpen(false);
                  }}
                >
                  {item.toggle ? <Pin size={14} aria-hidden="true" /> : null}
                  <span>{item.label}</span>
                  {item.detail ? <small>{item.detail}</small> : null}
                </button>
              </Fragment>
            ))}
            {controls.color ? (
              <ColorSwatchButton
                className="world-window-color"
                label={t("window.terminalColour")}
                text={t("inspector.colourLabel")}
                palette={controls.color.palette}
                current={controls.color.current}
                onColor={(id) => {
                  setOpen(false);
                  controls.color?.onColor(id);
                }}
              />
            ) : null}
          </div>,
          document.body,
        )}
    </div>
  );
}
