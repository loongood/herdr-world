import { Suspense, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  ALargeSmall,
  Bell,
  ChevronRight,
  Download,
  GitBranch,
  Keyboard,
  LayoutDashboard,
  Minus,
  MessageSquareText,
  Moon,
  Option,
  Palette,
  Plus,
  SquareTerminal,
  Sun,
  SunMoon,
} from "lucide-react";
import type { Theme } from "../App";
import {
  ACCENT_OPTIONS,
  type AccentColor,
  clampTerminalFontScale,
  clampUiScale,
  TERMINAL_FONT_SCALE_MAX,
  TERMINAL_FONT_SCALE_MIN,
  TERMINAL_FONT_SCALE_STEP,
  UI_SCALE_DEFAULT,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEP,
} from "../appearance";
import { type TranslationKey, useT } from "../i18n";
import { setChatTextScale, useChatTextScale } from "../textScales";
import { lazyWithReload } from "../lazyWithReload";
import {
  mobileTerminalShortcutCount,
  type MobileTerminalShortcutRows,
  type MobileTerminalSideShortcuts,
} from "../mobileTerminalShortcuts";
import { detectShortcutPlatform } from "../shortcutBindings";
import { shallowEqual, store, useStoreSelector } from "../store";
import {
  setTerminalOptionAsMeta,
  useTerminalOptionAsMeta,
} from "../terminalOptionKey";
import type {
  CustomTerminalTheme,
  TerminalThemeSelection,
} from "../terminalThemes";
import {
  connectionClientScopeKey,
  useConnectionClient,
} from "../useConnectionClient";
import { AgentIntegrationsSettings } from "./AgentIntegrationsSettings";
import { AutoSyncRepositoriesDialog } from "./AutoSyncRepositoriesDialog";
import { CloseButton } from "./CloseButton";
import { TerminalTransportSettings } from "./TerminalTransportSettings";
import { ConfigurationLoadingDialog } from "./ConfigurationLoadingDialog";
import { InstanceNameSettings } from "./InstanceNameSettings";
import { LanguageSettings } from "./LanguageSettings";
import { SpeechSettings } from "./SpeechSettings";
import { WorktreeCommandSettings } from "./WorktreeCommandSettings";
import { MobileSheetHandle } from "./MobileSheetHandle";
import "./ConfigMenu.css";
import "./ConfigurationDialog.css";

const ShortcutLookupDialog = lazyWithReload("keyboard-shortcuts", () =>
  import("./ShortcutLookupDialog").then((module) => ({
    default: module.ShortcutLookupDialog,
  })),
);
const TerminalThemeDialog = lazyWithReload("terminal-theme", () =>
  import("./TerminalThemeDialog").then((module) => ({
    default: module.TerminalThemeDialog,
  })),
);
const MobileLayoutDialog = lazyWithReload("mobile-layout", () =>
  import("./MobileLayoutDialog").then((module) => ({
    default: module.MobileLayoutDialog,
  })),
);
const MobileTerminalShortcutsDialog = lazyWithReload("mobile-shortcuts", () =>
  import("./MobileTerminalShortcutsDialog").then((module) => ({
    default: module.MobileTerminalShortcutsDialog,
  })),
);

export type ConfigurationProps = {
  theme: Theme;
  accentColor: AccentColor;
  uiScale: number;
  terminalFontScale: number;
  terminalFontName: string;
  mobileTerminalShortcuts: MobileTerminalShortcutRows;
  mobileTerminalSideShortcuts: MobileTerminalSideShortcuts;
  terminalThemeSelection: TerminalThemeSelection;
  customTerminalThemes: CustomTerminalTheme[];
  onThemeChange: (theme: Theme) => void;
  blackBackground: boolean;
  onBlackBackgroundChange: (blackBackground: boolean) => void;
  onAccentColorChange: (accentColor: AccentColor) => void;
  onUiScaleChange: (scale: number) => void;
  onTerminalFontScaleChange: (scale: number) => void;
  onTerminalFontNameChange: (name: string) => void;
  onMobileTerminalShortcutsChange: (rows: MobileTerminalShortcutRows) => void;
  onMobileTerminalSideShortcutsChange: (
    shortcuts: MobileTerminalSideShortcuts,
  ) => void;
  onTerminalThemeSelectionChange: (selection: TerminalThemeSelection) => void;
  onCustomTerminalThemesChange: (themes: CustomTerminalTheme[]) => void;
};
const tabs = [
  "Appearance",
  "Behavior",
  "Instance",
  "Connection",
  "Integrations",
] as const;
export type ConfigurationTab = (typeof tabs)[number];
// Tab names are data in `tabs` (used for element ids); their labels come from
// the dictionary. TS widens `.toLowerCase()` calls to plain string, so the
// mapping is spelled out and type-checked against the dictionary keys.
const TAB_LABEL_KEYS = {
  Appearance: "config.tabs.appearance",
  Behavior: "config.tabs.behavior",
  Instance: "config.tabs.instance",
  Connection: "config.tabs.connection",
  Integrations: "config.tabs.integrations",
} as const satisfies Record<ConfigurationTab, TranslationKey>;
type Detail = "terminal" | "layout" | "keyboard" | "mobile" | "sync";

export function ConfigurationDialog({
  onClose,
  initialTab = "Appearance",
  ...props
}: ConfigurationProps & {
  onClose: () => void;
  initialTab?: ConfigurationTab;
}) {
  const { theme, accentColor, uiScale } = props;
  const tr = useT();
  const s = useStoreSelector(
    (state) => ({
      taskNotificationPermission: state.taskNotificationPermission,
      taskNotificationsEnabled: state.taskNotificationsEnabled,
      taskNotificationPreferences: state.taskNotificationPreferences,
      taskNotificationTransport: state.taskNotificationTransport,
      taskNotificationBusy: state.taskNotificationBusy,
      automaticUpdateChecksEnabled: state.automaticUpdateChecksEnabled,
      connectionLabel:
        state.connections.find((c) => c.id === state.activeConnectionId)
          ?.label ?? tr("config.currentConnection"),
      sshDestination: state.connections.find(
        (c) => c.id === state.activeConnectionId,
      )?.ssh_destination,
    }),
    shallowEqual,
  );
  const optionAsMeta = useTerminalOptionAsMeta();
  const applePlatform = detectShortcutPlatform() === "mac";
  const connectionClient = useConnectionClient();
  const [tab, setTab] = useState<ConfigurationTab>(initialTab);
  const [detail, setDetail] = useState<Detail | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const openDetail = (event: MouseEvent<HTMLButtonElement>, next: Detail) => {
    detailTrigger.current = event.currentTarget;
    setDetail(next);
  };
  useEffect(() => {
    if (detail) return;
    (detailTrigger.current?.isConnected
      ? detailTrigger.current
      : dialogRef.current
    )?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector(".popover-content"))
        return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [detail, onClose]);
  const notificationStatus = s.taskNotificationBusy
    ? tr("config.notification.saving")
    : s.taskNotificationPermission === "unsupported"
      ? tr("config.notification.unsupported")
      : s.taskNotificationPermission === "denied"
        ? tr("config.notification.blocked")
        : s.taskNotificationsEnabled
          ? s.taskNotificationTransport === "push"
            ? tr("config.notification.onPush")
            : tr("config.notification.onPage")
          : tr("config.notification.off");

  return (
    <>
      <div
        className="modal-backdrop configuration-backdrop"
        hidden={detail !== null}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          className="modal configuration-modal mobile-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={tr("config.title")}
          tabIndex={-1}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key !== "Tab") return;
            const controls = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled):not([tabindex='-1']), input:not(:disabled), select:not(:disabled), a[href]",
              ),
            ).filter((element) => element.getClientRects().length > 0);
            const first = controls[0],
              last = controls[controls.length - 1];
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
          <MobileSheetHandle
            label={tr("config.dismissConfiguration")}
            onClose={onClose}
          />
          <div className="modal-head">
            <div>
              <h2>{tr("config.title")}</h2>
              <p>{tr("config.subtitle")}</p>
            </div>
            <CloseButton
              label={tr("config.closeConfiguration")}
              onClick={onClose}
            />
          </div>
          <div
            className="configuration-tabs"
            role="tablist"
            aria-label={tr("config.configurationCategories")}
          >
            {tabs.map((name, index) => (
              <button
                key={name}
                type="button"
                role="tab"
                id={`configuration-tab-${name}`}
                aria-controls={`configuration-panel-${name}`}
                aria-selected={tab === name}
                tabIndex={tab === name ? 0 : -1}
                onClick={() => setTab(name)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % tabs.length
                      : event.key === "ArrowLeft"
                        ? (index + tabs.length - 1) % tabs.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tabs.length - 1
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  setTab(tabs[next]);
                  document
                    .getElementById(`configuration-tab-${tabs[next]}`)
                    ?.focus();
                }}
              >
                {tr(TAB_LABEL_KEYS[name])}
              </button>
            ))}
          </div>
          <div className="configuration-content">
            <section
              role="tabpanel"
              id="configuration-panel-Appearance"
              aria-labelledby="configuration-tab-Appearance"
              hidden={tab !== "Appearance"}
            >
              <p className="configuration-scope">
                {tr("config.savedInBrowser")}
              </p>
              <div className="config-preference-row">
                <span className="config-item-icon">
                  <SunMoon size={15} />
                </span>
                <div className="config-item-copy">
                  <strong>{tr("config.theme")}</strong>
                  <span>{tr("config.themeHint")}</span>
                </div>
                <div
                  className="config-theme-control"
                  role="group"
                  aria-label={tr("config.theme")}
                >
                  {(
                    [
                      ["light", Sun],
                      ["dark", Moon],
                      ["system", SunMoon],
                    ] as const
                  ).map(([value, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={tr("config.useTheme", {
                        theme: tr(`theme.${value}`),
                      })}
                      aria-pressed={theme === value}
                      className={theme === value ? "is-active" : ""}
                      onClick={() => props.onThemeChange(value)}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="config-preference-row">
                <span className="config-item-icon">
                  <Moon size={15} />
                </span>
                <div className="config-item-copy">
                  <strong>{tr("config.blackBackground")}</strong>
                  <span>{tr("config.blackBackgroundHint")}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={tr("config.blackBackground")}
                  aria-checked={props.blackBackground}
                  className={
                    "settings-switch" + (props.blackBackground ? " is-on" : "")
                  }
                  onClick={() =>
                    props.onBlackBackgroundChange(!props.blackBackground)
                  }
                >
                  <span />
                </button>
              </div>
              <div className="config-preference-row">
                <span className="config-item-icon">
                  <Palette size={15} />
                </span>
                <div className="config-item-copy">
                  <strong>{tr("config.accentColor")}</strong>
                  <span>{tr(`accent.${accentColor}`)}</span>
                </div>
                <div
                  className="config-accent-control"
                  role="radiogroup"
                  aria-label={tr("config.accentColor")}
                >
                  {ACCENT_OPTIONS.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      data-accent={option.value}
                      title={tr(`accent.${option.value}`)}
                      aria-label={tr(`accent.${option.value}`)}
                      aria-checked={accentColor === option.value}
                      tabIndex={accentColor === option.value ? 0 : -1}
                      className={
                        accentColor === option.value ? "is-active" : ""
                      }
                      onClick={() => props.onAccentColorChange(option.value)}
                      onKeyDown={(event) => {
                        const direction = ["ArrowRight", "ArrowDown"].includes(
                          event.key,
                        )
                          ? 1
                          : ["ArrowLeft", "ArrowUp"].includes(event.key)
                            ? -1
                            : 0;
                        if (!direction) return;
                        event.preventDefault();
                        const next =
                          (index + direction + ACCENT_OPTIONS.length) %
                          ACCENT_OPTIONS.length;
                        props.onAccentColorChange(ACCENT_OPTIONS[next].value);
                        const buttons =
                          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                            "button",
                          );
                        buttons?.[next]?.focus();
                      }}
                    />
                  ))}
                </div>
              </div>
              <LanguageSettings />
              <div className="config-preference-row">
                <span className="config-item-icon">
                  <ALargeSmall size={15} />
                </span>
                <div className="config-item-copy">
                  <strong>{tr("config.interfaceScale")}</strong>
                  <span>{tr("config.interfaceScaleHint")}</span>
                </div>
                <div
                  className="config-scale-control"
                  role="group"
                  aria-label={tr("config.interfaceScale")}
                >
                  <button
                    type="button"
                    aria-label={tr("config.decreaseScale")}
                    disabled={uiScale <= UI_SCALE_MIN}
                    onClick={() =>
                      props.onUiScaleChange(
                        clampUiScale(uiScale - UI_SCALE_STEP),
                      )
                    }
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    type="button"
                    className="config-scale-value"
                    aria-label={tr("config.resetScale", { scale: uiScale })}
                    disabled={uiScale === UI_SCALE_DEFAULT}
                    onClick={() => props.onUiScaleChange(UI_SCALE_DEFAULT)}
                  >
                    {uiScale}%
                  </button>
                  <button
                    type="button"
                    aria-label={tr("config.increaseScale")}
                    disabled={uiScale >= UI_SCALE_MAX}
                    onClick={() =>
                      props.onUiScaleChange(
                        clampUiScale(uiScale + UI_SCALE_STEP),
                      )
                    }
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <ChatTextRow terminalFontScale={props.terminalFontScale} />
              <button
                type="button"
                className="config-menu-item"
                onClick={(event) => openDetail(event, "terminal")}
              >
                <span className="config-item-icon">
                  <SquareTerminal size={15} />
                </span>
                <span className="config-item-copy">
                  <strong>{tr("config.terminal")}</strong>
                  <span>{tr("config.terminalHint")}</span>
                </span>
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                className="config-menu-item"
                onClick={(event) => openDetail(event, "layout")}
              >
                <span className="config-item-icon">
                  <LayoutDashboard size={15} />
                </span>
                <span className="config-item-copy">
                  <strong>{tr("config.layout")}</strong>
                  <span>{tr("config.layoutHint")}</span>
                </span>
                <ChevronRight size={15} />
              </button>
            </section>
            <section
              role="tabpanel"
              id="configuration-panel-Behavior"
              aria-labelledby="configuration-tab-Behavior"
              hidden={tab !== "Behavior"}
            >
              <p className="configuration-scope">
                {tr("config.behaviorScope")}
              </p>
              {tab === "Behavior" ? <SpeechSettings /> : null}
              <div className="config-preference-row">
                <span className="config-item-icon">
                  <Download size={15} />
                </span>
                <div className="config-item-copy">
                  <strong>{tr("config.automaticUpdateChecks")}</strong>
                  <span>
                    {s.automaticUpdateChecksEnabled
                      ? tr("config.enabled")
                      : tr("config.disabled")}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={tr("config.automaticUpdateChecks")}
                  aria-checked={s.automaticUpdateChecksEnabled}
                  className={
                    "settings-switch" +
                    (s.automaticUpdateChecksEnabled ? " is-on" : "")
                  }
                  onClick={() =>
                    store.setAutomaticUpdateChecksEnabled(
                      !s.automaticUpdateChecksEnabled,
                    )
                  }
                >
                  <span />
                </button>
              </div>
              <div className="config-preference-row">
                <span className="config-item-icon">
                  <Bell size={15} />
                </span>
                <div className="config-item-copy">
                  <strong>{tr("config.taskNotifications")}</strong>
                  <span className="config-notification-status">
                    {notificationStatus}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={tr("config.taskNotifications")}
                  aria-disabled={s.taskNotificationBusy}
                  aria-checked={s.taskNotificationsEnabled}
                  className={
                    "settings-switch" +
                    (s.taskNotificationsEnabled ? " is-on" : "")
                  }
                  onClick={() => {
                    if (!s.taskNotificationBusy)
                      void store.setTaskNotificationsEnabled(
                        !s.taskNotificationsEnabled,
                      );
                  }}
                >
                  <span />
                </button>
              </div>
              {s.taskNotificationsEnabled &&
                (
                  [
                    ["blocked", tr("config.taskNeedsAttention")],
                    ["completed", tr("config.taskCompleted")],
                  ] as const
                ).map(([kind, label]) => (
                  <div className="config-preference-row" key={kind}>
                    <div className="config-item-copy">
                      <strong>{label}</strong>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label={label}
                      aria-checked={s.taskNotificationPreferences[kind]}
                      aria-disabled={s.taskNotificationBusy}
                      className={
                        "settings-switch" +
                        (s.taskNotificationPreferences[kind] ? " is-on" : "")
                      }
                      onClick={() => {
                        if (!s.taskNotificationBusy)
                          void store.setTaskNotificationPreference(
                            kind,
                            !s.taskNotificationPreferences[kind],
                          );
                      }}
                    >
                      <span />
                    </button>
                  </div>
                ))}
              {applePlatform ? (
                <div className="config-preference-row">
                  <span className="config-item-icon">
                    <Option size={15} />
                  </span>
                  <div className="config-item-copy">
                    <strong>{tr("config.optionKeyAsAlt")}</strong>
                    <span>
                      {optionAsMeta
                        ? tr("config.optionSendsAlt")
                        : tr("config.optionTypesCharacters")}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={tr("config.optionKeyAsAlt")}
                    aria-checked={optionAsMeta}
                    className={
                      "settings-switch" + (optionAsMeta ? " is-on" : "")
                    }
                    onClick={() => setTerminalOptionAsMeta(!optionAsMeta)}
                  >
                    <span />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className="config-menu-item"
                onClick={(event) => openDetail(event, "keyboard")}
              >
                <span className="config-item-icon">
                  <Keyboard size={15} />
                </span>
                <span className="config-item-copy">
                  <strong>{tr("config.keyboardShortcuts")}</strong>
                  <span>{tr("config.keyboardHint")}</span>
                </span>
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                className="config-menu-item"
                onClick={(event) => openDetail(event, "mobile")}
              >
                <span className="config-item-icon">
                  <Keyboard size={15} />
                </span>
                <span className="config-item-copy">
                  <strong>{tr("config.mobileShortcuts")}</strong>
                  <span>
                    {tr("config.mobileShortcutsSummary", {
                      panels: mobileTerminalShortcutCount(
                        props.mobileTerminalShortcuts,
                      ),
                      sides:
                        props.mobileTerminalSideShortcuts.filter(Boolean)
                          .length,
                    })}
                  </span>
                </span>
                <ChevronRight size={15} />
              </button>
            </section>
            <section
              role="tabpanel"
              id="configuration-panel-Instance"
              aria-labelledby="configuration-tab-Instance"
              hidden={tab !== "Instance"}
            >
              {tab === "Instance" ? (
                <>
                  <InstanceNameSettings />
                  <WorktreeCommandSettings />
                </>
              ) : null}
            </section>
            <section
              role="tabpanel"
              id="configuration-panel-Connection"
              aria-labelledby="configuration-tab-Connection"
              hidden={tab !== "Connection"}
            >
              <p className="configuration-scope">
                {tr("config.connectionLabel")}{" "}
                <strong>{s.connectionLabel}</strong>
              </p>
              {tab === "Connection" ? (
                <TerminalTransportSettings
                  key={connectionClientScopeKey(
                    connectionClient,
                    connectionClient.serverRuntimeGeneration,
                  )}
                />
              ) : null}
              <button
                type="button"
                className="config-menu-item"
                onClick={(event) => openDetail(event, "sync")}
              >
                <span className="config-item-icon">
                  <GitBranch size={15} />
                </span>
                <span className="config-item-copy">
                  <strong>{tr("config.automaticBranchUpdates")}</strong>
                  <span>{tr("config.branchUpdatesHint")}</span>
                </span>
                <ChevronRight size={15} />
              </button>
            </section>
            <section
              role="tabpanel"
              id="configuration-panel-Integrations"
              aria-labelledby="configuration-tab-Integrations"
              hidden={tab !== "Integrations"}
            >
              {tab === "Integrations" ? (
                <AgentIntegrationsSettings
                  key={connectionClientScopeKey(
                    connectionClient,
                    connectionClient.serverRuntimeGeneration,
                  )}
                  connectionLabel={s.connectionLabel}
                  sshDestination={s.sshDestination}
                />
              ) : null}
            </section>
          </div>
          <div className="modal-actions">
            <span className="muted">
              {tab === "Integrations"
                ? tr("config.changesRequireConfirmation")
                : tab === "Instance"
                  ? tr("config.useSaveForInstance")
                  : tr("config.changesSavedAutomatically")}
            </span>
            <button type="button" onClick={onClose}>
              {tr("config.done")}
            </button>
          </div>
        </div>
      </div>
      <Suspense
        fallback={
          <ConfigurationLoadingDialog
            onClose={() => setDetail(null)}
            buttonLabel={tr("config.backToConfiguration")}
          />
        }
      >
        {detail === "keyboard" ? (
          <ShortcutLookupDialog open onClose={() => setDetail(null)} />
        ) : null}
        {detail === "terminal" ? (
          <TerminalThemeDialog
            open
            selection={props.terminalThemeSelection}
            customThemes={props.customTerminalThemes}
            fontName={props.terminalFontName}
            fontScale={props.terminalFontScale}
            onSelectionChange={props.onTerminalThemeSelectionChange}
            onCustomThemesChange={props.onCustomTerminalThemesChange}
            onFontNameChange={props.onTerminalFontNameChange}
            onFontScaleChange={props.onTerminalFontScaleChange}
            onClose={() => setDetail(null)}
          />
        ) : null}
        {detail === "layout" ? (
          <MobileLayoutDialog open onClose={() => setDetail(null)} />
        ) : null}
        {detail === "mobile" ? (
          <MobileTerminalShortcutsDialog
            open
            rows={props.mobileTerminalShortcuts}
            sideShortcuts={props.mobileTerminalSideShortcuts}
            onChange={props.onMobileTerminalShortcutsChange}
            onSideChange={props.onMobileTerminalSideShortcutsChange}
            onClose={() => setDetail(null)}
          />
        ) : null}
      </Suspense>
      <AutoSyncRepositoriesDialog
        open={detail === "sync"}
        onClose={() => setDetail(null)}
      />
    </>
  );
}

/**
 * Chat's text size: linked to the terminal font scale until changed here;
 * the value button links it again.
 */
function ChatTextRow({ terminalFontScale }: { terminalFontScale: number }) {
  const tr = useT();
  const scale = useChatTextScale();
  const onChange = setChatTextScale;
  const shown = scale ?? terminalFontScale;
  return (
    <div className="config-preference-row">
      <span className="config-item-icon">
        <MessageSquareText size={15} />
      </span>
      <div className="config-item-copy">
        <strong>{tr("config.chatText")}</strong>
        <span>
          {scale === null
            ? tr("config.chatFollowsTerminal")
            : tr("config.chatOwnSetting")}
        </span>
      </div>
      <div
        className="config-scale-control"
        role="group"
        aria-label={tr("config.chatTextSize")}
      >
        <button
          type="button"
          aria-label={tr("config.decreaseChatText")}
          disabled={shown <= TERMINAL_FONT_SCALE_MIN}
          onClick={() =>
            onChange(clampTerminalFontScale(shown - TERMINAL_FONT_SCALE_STEP))
          }
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="config-scale-value"
          aria-label={tr("config.chatLinkedToTerminal", { scale: shown })}
          aria-pressed={scale === null}
          disabled={scale === null}
          onClick={() => onChange(null)}
        >
          {scale === null
            ? tr("config.chatFollowsValue", { scale: shown })
            : `${shown}%`}
        </button>
        <button
          type="button"
          aria-label={tr("config.increaseChatText")}
          disabled={shown >= TERMINAL_FONT_SCALE_MAX}
          onClick={() =>
            onChange(clampTerminalFontScale(shown + TERMINAL_FONT_SCALE_STEP))
          }
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
