import {
  Activity,
  Bug,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Focus,
  GitPullRequest,
  Hand,
  Inbox,
  Keyboard,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Palette,
  Plug,
  RefreshCw,
  Server,
  Settings,
  Shirt,
  SlidersHorizontal,
  Volume2,
  Wifi,
  Wind,
} from "lucide-react";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type ConnectionStatus, logoutBrowserSession } from "../api";
import { worldLocalStorage } from "../browserStorage";
import { isStaleBuild, useBuildFreshness } from "../buildFreshness";
import { openSounds } from "../chimes/chimeHost";
import { connectionHttpPath } from "../connectionHttp";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/en";
import { useLayoutPreferences } from "../layoutPreferences";
import { lazyWithReload } from "../lazyWithReload";
import { shortcutLabel, useShortcutPreferences } from "../shortcutPreferences";
import {
  herdrUpgradeMenuEntry,
  herdrUpgradeOffered,
  OperationalContext,
  shallowEqual,
  store,
  useStoreSelector,
} from "../store";
import { useConnectionClient } from "../useConnectionClient";
import { APP_VERSION } from "../version";
import {
  type OfficePreferences,
  readOfficePreferences,
  WORLD_OFFICE_PREFERENCES_CHANGED_EVENT,
  writeOfficePreferences,
} from "../world/officePreferences";
import type {
  ConfigurationProps,
  ConfigurationTab,
} from "./ConfigurationDialog";
import { ConfigurationLoadingDialog } from "./ConfigurationLoadingDialog";
import { HerdrSetupCard } from "./HerdrSetupCard";
import { MobileSheetHandle } from "./MobileSheetHandle";
import { useCloseGlobalMenuForDialog } from "./useCloseGlobalMenuForDialog";
import "./ConfigMenu.css";
import { useLayer } from "../layerStack";
import { DEVTOOLS } from "../world/devtools/flag";
import { requestTrace, traceRemembered } from "../world/devtools/trace";
import { WORLD_OPEN_UPDATE_MENU_EVENT } from "../world/townMasterGreeting";

const ConfigurationDialog = lazyWithReload("configuration", () =>
  import("./ConfigurationDialog").then((module) => ({
    default: module.ConfigurationDialog,
  })),
);
const RELEASES_URL = "https://github.com/IvoryHeart/herdr-world/releases";
export const CONFIG_MENU_ID = "herdr-world-config-menu";

/** Connection status values shown verbatim in the menu summary. */
const STATUS_LABEL_KEYS = {
  connecting: "menu.statusConnecting",
  connected: "menu.statusConnected",
  disconnected: "menu.statusDisconnected",
} as const satisfies Record<ConnectionStatus, TranslationKey>;

/** Quick settings open the matching Configuration tab; labels reuse its keys. */
const QUICK_SETTING_LABEL_KEYS = {
  Appearance: "config.tabs.appearance",
  Behavior: "config.tabs.behavior",
  Connection: "config.tabs.connection",
  Integrations: "config.tabs.integrations",
} as const satisfies Record<
  "Appearance" | "Behavior" | "Connection" | "Integrations",
  TranslationKey
>;

export function reloadApplicationPage(
  target: Pick<Location, "reload"> = window.location,
) {
  target.reload();
}

type ConfigMenuProps = ConfigurationProps & {
  zenMode: boolean;
  /** False where Zen would change nothing, such as a phone's terminal. */
  zenAvailable?: boolean;
  onZenModeChange: (zenMode: boolean) => void;
  onOpenOfficeMetrics?: () => void;
  onOpenAgentProfiles?: () => void;
  onOpenSources?: () => void;
  onShowShortcuts: () => void;
};

export function ConfigMenu({
  zenMode,
  zenAvailable = true,
  onZenModeChange,
  onOpenOfficeMetrics,
  onOpenAgentProfiles,
  onOpenSources,
  onShowShortcuts,
  ...configuration
}: ConfigMenuProps) {
  const build = useBuildFreshness();
  const t = useT();
  const s = useStoreSelector(
    (state) => ({
      bridgeStatus: state.bridgeStatus,
      activeConnectionId: state.activeConnectionId,
      defaultConnectionId: state.defaultConnectionId,
      connectionPaused: state.connectionPaused,
      status: state.status,
      updateInfo: state.updateInfo,
      updateInstalling: state.updateInstalling,
      herdrUpgrading: state.herdrUpgrading,
    }),
    shallowEqual,
  );
  const connectionClient = useConnectionClient();
  const layout = useLayoutPreferences();
  useShortcutPreferences();
  const updateAvailable = !!s.updateInfo?.update_available;
  const canInstallUpdate = updateAvailable && s.updateInfo?.can_auto_update;
  const updateVersion = s.updateInfo?.latest_version;
  const clientCount =
    !s.connectionPaused && s.status === "connected"
      ? s.bridgeStatus?.clients
      : null;
  const [open, setOpen] = useState(false);
  useCloseGlobalMenuForDialog(open, setOpen);
  // Town's event trace (development builds only; see world/devtools).
  const [townTrace, setTownTrace] = useState(() =>
    DEVTOOLS ? traceRemembered("town") : false,
  );
  const [expanded, setExpanded] = useState(false);
  const [configurationTab, setConfigurationTab] =
    useState<ConfigurationTab | null>(null);
  const [connectionDetailsOpen, setConnectionDetailsOpen] = useState(false);
  const [officePreferences, setOfficePreferences] = useState(() =>
    readOfficePreferences(worldLocalStorage),
  );
  const [health, setHealth] = useState<{
    socket?: string;
    auth_required?: boolean;
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [herdrInfo, setHerdrInfo] = useState<{
    version: string;
    protocol: number;
  } | null>(null);
  const [herdrUnavailable, setHerdrUnavailable] = useState(false);
  // Offered only on the default connection: the upgrade concerns this
  // machine's Herdr.
  const [herdrUpgrade, setHerdrUpgrade] = useState<{
    label: string;
    description: string;
  } | null>(null);
  const onDefaultConnection =
    !s.connectionPaused && s.activeConnectionId === s.defaultConnectionId;
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const closeConfiguration = useCallback(() => {
    setConfigurationTab(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setHealth(null);
    setHerdrInfo(null);
    setHerdrUnavailable(false);
    setHerdrUpgrade(null);
    setOfficePreferences(readOfficePreferences(worldLocalStorage));
    if (onDefaultConnection)
      fetch("/api/herdr/status", {
        credentials: "same-origin",
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((status) => {
          if (cancelled || !herdrUpgradeOffered(status)) return;
          setHerdrUpgrade(herdrUpgradeMenuEntry(status));
        });
    fetch("/api/health", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((info) => {
        if (!cancelled) setHealth(info);
      });
    if (connectionClient.isCurrent()) {
      const url = new URL(
        connectionHttpPath(
          connectionClient.connectionId,
          "/herdr-info",
          connectionClient.serverRuntimeGeneration,
        ),
        window.location.origin,
      );
      if (url.origin === window.location.origin)
        fetch(url, { credentials: "same-origin", cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((info) => {
            if (cancelled || !connectionClient.isCurrent()) return;
            if (info) setHerdrInfo(info);
            else setHerdrUnavailable(true);
          });
    }
    return () => {
      cancelled = true;
    };
  }, [connectionClient, onDefaultConnection, open]);
  // A layer on the shared stack: Escape, a press outside (the terminal
  // included) and Back close it, and focus returns to what had it.
  useLayer(open, () => setOpen(false), { element: () => ref.current });
  // The Town Master's update line opens the menu at its update control.
  useEffect(() => {
    const onOpenUpdate = () => {
      setExpanded(true);
      setOpen(true);
      window.requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(".config-update-item")
          ?.scrollIntoView({ block: "nearest" }),
      );
    };
    window.addEventListener(WORLD_OPEN_UPDATE_MENU_EVENT, onOpenUpdate);
    return () =>
      window.removeEventListener(WORLD_OPEN_UPDATE_MENU_EVENT, onOpenUpdate);
  }, []);

  const updateOfficePreferences = (patch: Partial<OfficePreferences>) => {
    const next = writeOfficePreferences(worldLocalStorage, {
      ...readOfficePreferences(worldLocalStorage),
      ...patch,
    });
    setOfficePreferences(next);
    window.dispatchEvent(
      new CustomEvent<OfficePreferences>(
        WORLD_OFFICE_PREFERENCES_CHANGED_EVENT,
        { detail: next },
      ),
    );
  };

  return (
    <>
      <div className="config-menu" ref={ref}>
        <button
          ref={triggerRef}
          className={`topbar-button menu-button ${open ? "is-active" : ""}`}
          onClick={() => {
            setExpanded(false);
            setLogoutError("");
            setOpen((value) => !value);
          }}
          aria-label={
            updateAvailable
              ? t("menu.triggerUpdateAvailable")
              : t("menu.trigger")
          }
          aria-controls={open ? CONFIG_MENU_ID : undefined}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <MenuIcon className="menu-button-icon" size={18} aria-hidden="true" />
          <span className="menu-button-label">{t("menu.trigger")}</span>
          {updateAvailable ? (
            <span className="menu-update-dot" aria-hidden="true" />
          ) : null}
        </button>
        {open ? (
          <div
            id={CONFIG_MENU_ID}
            className={`config-dropdown mobile-sheet${expanded ? " is-expanded" : ""}`}
            role="dialog"
            aria-label={t("menu.applicationMenu")}
          >
            <MobileSheetHandle
              label={expanded ? t("menu.showFewer") : t("menu.showMore")}
              expanded={expanded}
              onExpand={() => setExpanded(true)}
              onCollapse={() => setExpanded(false)}
              onClose={closeMenu}
              onClick={() => setExpanded((value) => !value)}
            />
            <div className="config-dropdown-content">
              <div className="config-summary">
                <div>
                  <strong>Herdr World</strong>
                  <span>{t("menu.version", { version: APP_VERSION })}</span>
                  {build.loaded ? (
                    <span
                      className="config-build"
                      title={t("menu.loadedBuild")}
                    >
                      {t("menu.build", { build: build.loaded })}
                      {isStaleBuild(build)
                        ? ` · ${t("menu.servedBy", { served: build.served ?? "" })}`
                        : ""}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`config-connection-summary status-${s.connectionPaused ? "paused" : s.status}`}
                >
                  <span className="status-dot" />
                  {s.connectionPaused
                    ? t("menu.statusPaused")
                    : t(STATUS_LABEL_KEYS[s.status])}
                  {typeof clientCount === "number"
                    ? ` · ${
                        clientCount === 1
                          ? t("menu.clientsOne")
                          : t("menu.clients", { count: clientCount })
                      }`
                    : ""}
                </span>
              </div>
              <div className="config-section">
                <ConfigMenuItem
                  icon={<Settings size={15} />}
                  label={t("menu.configuration")}
                  description={t("menu.configurationDescription")}
                  className="config-menu-item-row"
                  onClick={() => {
                    setOpen(false);
                    setConfigurationTab("Appearance");
                  }}
                />
                {layout.mobile ? null : (
                  <ConfigMenuItem
                    icon={<Keyboard size={15} />}
                    label={t("menu.shortcuts")}
                    description={t("menu.shortcutsDescription", {
                      keys: shortcutLabel("shortcuts.show"),
                    })}
                    className="config-menu-item-row"
                    onClick={() => {
                      setOpen(false);
                      onShowShortcuts();
                    }}
                  />
                )}
                {zenAvailable ? (
                  <div className="config-preference-row">
                    <span className="config-item-icon">
                      <Focus size={15} />
                    </span>
                    <div className="config-item-copy">
                      <strong>{t("menu.zenMode")}</strong>
                      <span>
                        {zenMode ? t("menu.zenEnabled") : t("menu.zenDisabled")}
                        {layout.mobile
                          ? ""
                          : ` · ${shortcutLabel("zen.toggle")}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label={t("menu.zenMode")}
                      aria-checked={zenMode}
                      className={"settings-switch" + (zenMode ? " is-on" : "")}
                      onClick={() => {
                        onZenModeChange(!zenMode);
                        setOpen(false);
                      }}
                    >
                      <span />
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="config-section config-section-tiles-3">
                <div className="config-title">{t("menu.viewsTitle")}</div>
                <label className="config-preference-row">
                  <span className="config-item-icon">
                    <Focus size={15} />
                  </span>
                  <span className="config-item-copy">
                    <strong>{t("menu.inspectorOpening")}</strong>
                    <span>{t("menu.inspectorOpeningDescription")}</span>
                  </span>
                  <select
                    className="config-preference-select"
                    aria-label={t("menu.inspectorOpening")}
                    value={officePreferences.inspectorPresentation}
                    onChange={(event) =>
                      updateOfficePreferences({
                        inspectorPresentation: event.target
                          .value as OfficePreferences["inspectorPresentation"],
                      })
                    }
                  >
                    <option value="floating">
                      {t("menu.inspectorFloating")}
                    </option>
                    <option value="docked">{t("menu.inspectorDocked")}</option>
                  </select>
                </label>
                <label className="config-preference-row">
                  <span className="config-item-icon">
                    <MessageSquare size={15} />
                  </span>
                  <span className="config-item-copy">
                    <strong>{t("menu.agentsOpen")}</strong>
                    <span>{t("menu.agentsOpenDescription")}</span>
                  </span>
                  <select
                    className="config-preference-select"
                    aria-label={t("menu.agentsOpen")}
                    value={officePreferences.townOpens}
                    onChange={(event) =>
                      updateOfficePreferences({
                        townOpens: event.target
                          .value as OfficePreferences["townOpens"],
                      })
                    }
                  >
                    <option value="chat">{t("menu.agentsOpenChat")}</option>
                    <option value="terminal">
                      {t("menu.agentsOpenTerminal")}
                    </option>
                  </select>
                </label>
                <label className="config-preference-row">
                  <span className="config-item-icon">
                    <MessageSquare size={15} />
                  </span>
                  <span className="config-item-copy">
                    <strong>{t("menu.townMaster")}</strong>
                    <span>{t("menu.townMasterDescription")}</span>
                  </span>
                  <input
                    className="config-preference-select"
                    aria-label={t("menu.townMaster")}
                    defaultValue={officePreferences.townMaster}
                    maxLength={64}
                    spellCheck={false}
                    autoComplete="off"
                    onBlur={(event) =>
                      updateOfficePreferences({
                        townMaster: event.currentTarget.value,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </label>
                <div className="config-preference-row">
                  <span className="config-item-icon">
                    <Wind size={15} />
                  </span>
                  <div className="config-item-copy">
                    <strong>{t("menu.townCalm")}</strong>
                    <span>{t("menu.townCalmDescription")}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={t("menu.townCalm")}
                    aria-checked={officePreferences.townCalm}
                    className={
                      "settings-switch" +
                      (officePreferences.townCalm ? " is-on" : "")
                    }
                    onClick={() =>
                      updateOfficePreferences({
                        townCalm: !officePreferences.townCalm,
                      })
                    }
                  >
                    <span />
                  </button>
                </div>
                <div className="config-preference-row">
                  <span className="config-item-icon">
                    <Hand size={15} />
                  </span>
                  <div className="config-item-copy">
                    <strong>{t("menu.greeting")}</strong>
                    <span>{t("menu.greetingDescription")}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={t("menu.greeting")}
                    aria-checked={officePreferences.townGreeting}
                    className={
                      "settings-switch" +
                      (officePreferences.townGreeting ? " is-on" : "")
                    }
                    onClick={() =>
                      updateOfficePreferences({
                        townGreeting: !officePreferences.townGreeting,
                      })
                    }
                  >
                    <span />
                  </button>
                </div>
                <div className="config-preference-row">
                  <span className="config-item-icon">
                    <Inbox size={15} />
                  </span>
                  <div className="config-item-copy">
                    <strong>{t("menu.tabBadge")}</strong>
                    <span>{t("menu.tabBadgeDescription")}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={t("menu.tabBadge")}
                    aria-checked={officePreferences.tabBadge}
                    className={
                      "settings-switch" +
                      (officePreferences.tabBadge ? " is-on" : "")
                    }
                    onClick={() =>
                      updateOfficePreferences({
                        tabBadge: !officePreferences.tabBadge,
                      })
                    }
                  >
                    <span />
                  </button>
                </div>
                {DEVTOOLS ? (
                  <div className="config-preference-row">
                    <span className="config-item-icon">
                      <Bug size={15} />
                    </span>
                    <div className="config-item-copy">
                      <strong>{t("menu.eventTrace")}</strong>
                      <span>{t("menu.eventTraceDescription")}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label={t("menu.eventTrace")}
                      aria-checked={townTrace}
                      className={
                        "settings-switch" + (townTrace ? " is-on" : "")
                      }
                      onClick={() => {
                        requestTrace("town", !townTrace);
                        setTownTrace(!townTrace);
                      }}
                    >
                      <span />
                    </button>
                  </div>
                ) : null}
                {onOpenAgentProfiles ? (
                  <ConfigMenuItem
                    icon={<Shirt size={15} />}
                    label={t("menu.agentProfiles")}
                    className="config-menu-item-row"
                    description={t("menu.agentProfilesDescription")}
                    onClick={() => {
                      setOpen(false);
                      onOpenAgentProfiles();
                    }}
                  />
                ) : null}
                {/* Sounds sits with the agents' other settings. */}
                {onOpenAgentProfiles ? (
                  <ConfigMenuItem
                    icon={<Volume2 size={15} />}
                    label={t("menu.sounds")}
                    className="config-menu-item-row"
                    description={t("menu.soundsDescription")}
                    onClick={() => {
                      setOpen(false);
                      openSounds();
                    }}
                  />
                ) : null}
                {onOpenSources ? (
                  <ConfigMenuItem
                    icon={<GitPullRequest size={15} />}
                    label={t("menu.sources")}
                    className="config-menu-item-row"
                    description={t("menu.sourcesDescription")}
                    onClick={() => {
                      setOpen(false);
                      onOpenSources();
                    }}
                  />
                ) : null}
                {onOpenOfficeMetrics ? (
                  <ConfigMenuItem
                    icon={<Activity size={15} />}
                    label={t("menu.otelMetrics")}
                    className="config-menu-item-row"
                    description={t("menu.otelMetricsDescription")}
                    onClick={() => {
                      setOpen(false);
                      onOpenOfficeMetrics();
                    }}
                  />
                ) : null}
              </div>
              <div className="config-section">
                <div className="config-title">{t("menu.helpTitle")}</div>
                {(
                  [
                    {
                      labelKey: "menu.tutorial",
                      descriptionKey: "menu.tutorialDescription",
                      url: "https://herdr.world/tutorial/",
                    },
                    {
                      labelKey: "menu.features",
                      descriptionKey: "menu.featuresDescription",
                      url: "https://github.com/IvoryHeart/herdr-world/blob/main/FEATURES.md",
                    },
                    {
                      labelKey: "menu.troubleshooting",
                      descriptionKey: "menu.troubleshootingDescription",
                      url: "https://github.com/IvoryHeart/herdr-world/blob/main/docs/DEPLOYMENT.md#troubleshooting",
                    },
                    {
                      labelKey: "menu.reportIssue",
                      descriptionKey: "menu.reportIssueDescription",
                      url: "https://github.com/IvoryHeart/herdr-world/issues",
                    },
                  ] as const satisfies readonly {
                    labelKey: TranslationKey;
                    descriptionKey: TranslationKey;
                    url: string;
                  }[]
                ).map(({ labelKey, descriptionKey, url }) => (
                  <ConfigMenuItem
                    key={labelKey}
                    icon={<ExternalLink size={15} />}
                    label={t(labelKey)}
                    description={t(descriptionKey)}
                    onClick={() => {
                      setOpen(false);
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  />
                ))}
                <ConfigMenuItem
                  icon={<ExternalLink size={15} />}
                  label={t("menu.changelog")}
                  description={t("menu.changelogDescription")}
                  onClick={() => {
                    setOpen(false);
                    window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
                  }}
                />
                <ConfigMenuItem
                  icon={<RefreshCw size={15} />}
                  label={t("menu.reloadPage")}
                  description={t("menu.reloadPageDescription")}
                  onClick={() => {
                    setOpen(false);
                    reloadApplicationPage();
                  }}
                />
                <ConfigMenuItem
                  icon={<Download size={15} />}
                  className="config-update-item"
                  label={
                    updateAvailable
                      ? s.updateInstalling
                        ? t("menu.updating")
                        : t("menu.upgradeTo", { version: updateVersion ?? "" })
                      : t("menu.checkForUpdates")
                  }
                  description={
                    canInstallUpdate
                      ? t("menu.installAndRestart")
                      : updateAvailable
                        ? undefined
                        : t("menu.checkReleaseServer")
                  }
                  primary={canInstallUpdate}
                  disabled={
                    s.updateInstalling || (updateAvailable && !canInstallUpdate)
                  }
                  onClick={() => {
                    setOpen(false);
                    void store.updateOrCheck();
                  }}
                />
                {updateAvailable ? (
                  <ConfigMenuItem
                    icon={<RefreshCw size={15} />}
                    label={t("menu.checkForUpdates")}
                    description={t("menu.checkForUpdatesDescription")}
                    disabled={s.updateInstalling}
                    onClick={() => {
                      setOpen(false);
                      void store.checkForUpdate();
                    }}
                  />
                ) : null}
                {updateAvailable && !canInstallUpdate ? (
                  <p className="config-update-reason" role="note">
                    {s.updateInfo?.reason ?? t("menu.updateUnavailable")}
                  </p>
                ) : null}
              </div>
              <div className="config-section">
                <div className="config-title">{t("menu.runtimeTitle")}</div>
                <div className="config-runtime-row">
                  <span className="config-item-icon">
                    <Server size={15} />
                  </span>
                  <div className="config-item-copy">
                    <strong>{t("menu.herdrServer")}</strong>
                    <span>
                      {herdrInfo?.version
                        ? t("menu.serverVersion", {
                            version: herdrInfo.version,
                          })
                        : herdrUnavailable
                          ? t("menu.serverUnavailable")
                          : t("menu.serverLoading")}
                    </span>
                  </div>
                  <code>
                    {typeof herdrInfo?.protocol === "number"
                      ? t("menu.protocol", { protocol: herdrInfo.protocol })
                      : "-"}
                  </code>
                </div>
                {herdrUpgrade ? (
                  <ConfigMenuItem
                    icon={<Download size={15} />}
                    label={
                      s.herdrUpgrading
                        ? t("menu.herdrUpdating")
                        : herdrUpgrade.label
                    }
                    description={herdrUpgrade.description}
                    primary
                    disabled={s.herdrUpgrading}
                    onClick={() => {
                      setOpen(false);
                      void store.upgradeHerdr();
                    }}
                  />
                ) : null}
                {herdrUnavailable ? (
                  <HerdrSetupCard
                    key={connectionClient.connectionId}
                    enabled={
                      !s.connectionPaused &&
                      s.activeConnectionId === s.defaultConnectionId
                    }
                    compact
                  />
                ) : null}
                <button
                  type="button"
                  className="config-details-toggle"
                  aria-expanded={connectionDetailsOpen}
                  onClick={() => setConnectionDetailsOpen((value) => !value)}
                >
                  <span className="config-item-icon">
                    <Wifi size={15} />
                  </span>
                  <span>{t("menu.connectionDetails")}</span>
                  {connectionDetailsOpen ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </button>
                {connectionDetailsOpen ? (
                  <div className="config-details">
                    <ConfigRow label={t("menu.url")} value={location.origin} />
                    <ConfigRow
                      label={t("menu.socket")}
                      value={health?.socket ?? "-"}
                    />
                  </div>
                ) : null}
              </div>
              {health?.auth_required ? (
                <div className="config-section">
                  <ConfigMenuItem
                    icon={<LogOut size={15} />}
                    label={loggingOut ? t("menu.loggingOut") : t("menu.logOut")}
                    description={t("menu.logOutDescription")}
                    className="config-menu-item-row"
                    disabled={loggingOut}
                    onClick={async () => {
                      setLoggingOut(true);
                      setLogoutError("");
                      try {
                        await logoutBrowserSession();
                      } catch {
                        setLogoutError(t("menu.logoutError"));
                        setLoggingOut(false);
                      }
                    }}
                  />
                  {logoutError ? (
                    <p className="config-logout-error" role="alert">
                      {logoutError}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {layout.mobile ? (
                <div className="mobile-sheet-more" aria-hidden={!expanded}>
                  <div className="mobile-sheet-more-content">
                    <div className="config-section">
                      <div className="config-title">
                        {t("menu.quickSettings")}
                      </div>
                      {(
                        [
                          ["Appearance", Palette],
                          ["Behavior", SlidersHorizontal],
                          ["Connection", Server],
                          ["Integrations", Plug],
                        ] as const
                      ).map(([name, Icon]) => (
                        <ConfigMenuItem
                          key={name}
                          icon={<Icon size={15} />}
                          label={t(QUICK_SETTING_LABEL_KEYS[name])}
                          onClick={() => {
                            setOpen(false);
                            setConfigurationTab(name);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {/* Escape both topbar120 and the transformed phone app context. This
          includes loading and all Configuration detail dialogs. */}
      {configurationTab
        ? createPortal(
            // Configuration names the active connection, so it uses that
            // connection's current lease. A World view's context is its
            // selection's host, or none at all, which left Integrations and
            // Connection settings on a client that was never current.
            <OperationalContext.Provider value={null}>
              <Suspense
                fallback={
                  <ConfigurationLoadingDialog onClose={closeConfiguration} />
                }
              >
                <ConfigurationDialog
                  {...configuration}
                  initialTab={configurationTab}
                  onClose={closeConfiguration}
                />
              </Suspense>
            </OperationalContext.Provider>,
            document.body,
          )
        : null}
    </>
  );
}

function ConfigMenuItem({
  icon,
  label,
  description,
  onClick,
  disabled = false,
  primary = false,
  className,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`config-menu-item${primary ? " is-primary" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="config-item-icon">{icon}</span>
      <span className="config-item-copy">
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      <ChevronRight size={15} />
    </button>
  );
}
function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="config-row">
      <span>{label}</span>
      <code title={value}>{value}</code>
    </div>
  );
}
