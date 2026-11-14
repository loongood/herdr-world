// The baseline dictionary: the source of truth for key structure. zh-Hans
// and zh-Hant must satisfy `Dictionary`, so a missing or extra key fails
// the typecheck instead of shipping blank interface text.
export const en = {
  views: {
    town: "Town",
    board: "Board",
    desk: "Desk",
    spaces: "Spaces",
    goTo: "Go to {view}",
  },
  accent: {
    neutral: "Default",
    blue: "Blue",
    teal: "Teal",
    green: "Green",
    amber: "Amber",
    rose: "Rose",
    violet: "Violet",
  },
  theme: {
    dark: "Dark",
    light: "Light",
    system: "System",
  },
  config: {
    title: "Configuration",
    subtitle: "Appearance, behavior, instance, connections, and integrations",
    tabs: {
      appearance: "Appearance",
      behavior: "Behavior",
      instance: "Instance",
      connection: "Connection",
      integrations: "Integrations",
    },
    savedInBrowser: "Saved in this browser.",
    theme: "Theme",
    themeHint: "Application appearance",
    useTheme: "Use {theme} theme",
    blackBackground: "Black background",
    blackBackgroundHint: "Pure black instead of blue-grey in the dark theme",
    accentColor: "Accent color",
    interfaceScale: "Interface scale",
    interfaceScaleHint: "Scale menus, panels, and dialogs",
    decreaseScale: "Decrease interface scale",
    increaseScale: "Increase interface scale",
    resetScale: "Reset interface scale, currently {scale}%",
    chatText: "Chat text",
    chatTextSize: "Chat text size",
    chatFollowsTerminal: "Follows the terminal font size",
    chatOwnSetting: "Set on its own; the value links it to the terminal again",
    decreaseChatText: "Decrease Chat text size",
    increaseChatText: "Increase Chat text size",
    chatLinkedToTerminal:
      "Link Chat text size to the terminal, currently {scale}%",
    chatFollowsValue: "Terminal · {scale}%",
    terminal: "Terminal",
    terminalHint: "Customize how terminals look",
    layout: "Layout",
    layoutHint: "Display mode, mobile breakpoint, and sidebar order",
    language: "Language",
    languageAuto: "Automatic (browser)",
    languageHint: "Interface language",
    behaviorScope:
      "Preferences apply to this browser. Push delivery preferences apply to this device.",
    automaticUpdateChecks: "Automatic update checks",
    enabled: "Enabled",
    disabled: "Disabled",
    taskNotifications: "Task notifications",
    taskNeedsAttention: "Task needs attention",
    taskCompleted: "Task completed",
    optionKeyAsAlt: "Option key as Alt in terminals",
    optionSendsAlt: "Option sends Alt-modified keys",
    optionTypesCharacters: "Option types characters such as @, [ and ~",
    keyboardShortcuts: "Keyboard shortcuts",
    keyboardHint: "Presets, bindings, and help",
    mobileShortcuts: "Mobile terminal shortcuts",
    mobileShortcutsSummary: "{panels} panel · {sides} side",
    connectionLabel: "Connection:",
    automaticBranchUpdates: "Automatic branch updates",
    branchUpdatesHint:
      "Manage saved repository sync settings on this connection",
    changesRequireConfirmation: "Changes require confirmation.",
    useSaveForInstance: "Use Save to apply instance settings.",
    changesSavedAutomatically: "Changes are saved automatically.",
    done: "Done",
    closeConfiguration: "Close Configuration",
    dismissConfiguration: "Dismiss Configuration",
    configurationCategories: "Configuration categories",
    notification: {
      saving: "Saving...",
      unsupported: "Unsupported",
      blocked: "Blocked by browser permissions",
      onPush: "On · Background push",
      onPage: "On · Active page only",
      off: "Off",
    },
  },
  status: {
    syncFailed: "Failed to update automatic sync settings",
    autoSyncEnabled: "Automatic branch updates enabled",
    autoSyncDisabled: "Automatic branch updates disabled",
    taskNotificationsEnabled: "Task notifications enabled",
    taskNotificationsDetail:
      "Herdr World will notify you when an agent task completes.",
    notificationDenied: "Notification permission was not granted",
    notificationDeniedDetail:
      "Enable notifications for this site in the browser settings, then try again.",
  },
} as const;

// The translation contract: the English key structure with every leaf
// widened from its literal to `string`, so translations hold other text.
type WidenLeaves<T> = {
  [K in keyof T]: T[K] extends string ? string : WidenLeaves<T[K]>;
};

export type Dictionary = WidenLeaves<typeof en>;

type Join<K extends string, P extends string> = `${K}.${P}`;

/** Every leaf key path of a dictionary, dotted ("config.title"). */
export type PathsOf<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, PathsOf<T[K]>>;
}[keyof T & string];

export type TranslationKey = PathsOf<Dictionary>;

export function isTranslationKey(value: string): value is TranslationKey {
  let node: unknown = en;
  for (const part of value.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node))
      return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string";
}
