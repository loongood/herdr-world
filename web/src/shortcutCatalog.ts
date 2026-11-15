import { type TranslationKey, t } from "./i18n";
import { SHORTCUT_NUMBERS, type ShortcutId } from "./shortcutBindings";

export type ShortcutLabelKey = Extract<
  TranslationKey,
  `shortcuts.label${string}`
>;
export type ShortcutGroupKey = Extract<
  TranslationKey,
  `shortcuts.group${string}`
>;
export type ShortcutDescription = {
  id: ShortcutId;
  label: ShortcutLabelKey;
  group: ShortcutGroupKey;
  count?: number;
};

const descriptions: (
  | [ShortcutId, ShortcutLabelKey, ShortcutGroupKey]
  | [ShortcutId, ShortcutLabelKey, ShortcutGroupKey, number]
)[] = [
  ["command.menu", "shortcuts.labelCommandMenu", "shortcuts.groupGlobal"],
  ["shortcuts.show", "shortcuts.labelShortcutsShow", "shortcuts.groupGlobal"],
  ["sidebar.toggle", "shortcuts.labelSidebarToggle", "shortcuts.groupGlobal"],
  [
    "inspector.toggle",
    "shortcuts.labelInspectorToggle",
    "shortcuts.groupGlobal",
  ],
  [
    "inspector.expand",
    "shortcuts.labelInspectorExpand",
    "shortcuts.groupGlobal",
  ],
  [
    "annotations.toggle",
    "shortcuts.labelAnnotationsToggle",
    "shortcuts.groupGlobal",
  ],
  [
    "assistant.toggle",
    "shortcuts.labelAssistantToggle",
    "shortcuts.groupGlobal",
  ],
  ["zen.toggle", "shortcuts.labelZenToggle", "shortcuts.groupGlobal"],
  ["panes.recent", "shortcuts.labelPanesRecent", "shortcuts.groupGlobal"],
  [
    "plugin.herdrFloat.toggle",
    "shortcuts.labelPluginHerdrFloatToggle",
    "shortcuts.groupGlobal",
  ],
  ["panes.search", "shortcuts.labelPanesSearch", "shortcuts.groupGlobal"],
  ["view.search", "shortcuts.labelViewSearch", "shortcuts.groupGlobal"],
  ["workspaces.open", "shortcuts.labelWorkspacesOpen", "shortcuts.groupGlobal"],
  ["files.toggle", "shortcuts.labelFilesToggle", "shortcuts.groupGlobal"],
  ["diff.toggle", "shortcuts.labelDiffToggle", "shortcuts.groupGlobal"],
  ["tab.create", "shortcuts.labelTabCreate", "shortcuts.groupTabsPanes"],
  ["tab.close", "shortcuts.labelTabClose", "shortcuts.groupTabsPanes"],
  ["tab.previous", "shortcuts.labelTabPrevious", "shortcuts.groupTabsPanes"],
  ["tab.next", "shortcuts.labelTabNext", "shortcuts.groupTabsPanes"],
  ["pane.left", "shortcuts.labelPaneLeft", "shortcuts.groupTabsPanes"],
  ["pane.right", "shortcuts.labelPaneRight", "shortcuts.groupTabsPanes"],
  ["pane.up", "shortcuts.labelPaneUp", "shortcuts.groupTabsPanes"],
  ["pane.down", "shortcuts.labelPaneDown", "shortcuts.groupTabsPanes"],
  ["pane.moveLeft", "shortcuts.labelPaneMoveLeft", "shortcuts.groupTabsPanes"],
  [
    "pane.moveRight",
    "shortcuts.labelPaneMoveRight",
    "shortcuts.groupTabsPanes",
  ],
  ["pane.moveUp", "shortcuts.labelPaneMoveUp", "shortcuts.groupTabsPanes"],
  ["pane.moveDown", "shortcuts.labelPaneMoveDown", "shortcuts.groupTabsPanes"],
  [
    "pane.splitRight",
    "shortcuts.labelPaneSplitRight",
    "shortcuts.groupTabsPanes",
  ],
  [
    "pane.splitDown",
    "shortcuts.labelPaneSplitDown",
    "shortcuts.groupTabsPanes",
  ],
  ["pane.zoom", "shortcuts.labelPaneZoom", "shortcuts.groupTabsPanes"],
  [
    "arrangement.single",
    "shortcuts.labelArrangementSingle",
    "shortcuts.groupWindows",
  ],
  [
    "arrangement.cascade",
    "shortcuts.labelArrangementCascade",
    "shortcuts.groupWindows",
  ],
  [
    "arrangement.columns",
    "shortcuts.labelArrangementColumns",
    "shortcuts.groupWindows",
  ],
  [
    "arrangement.rows",
    "shortcuts.labelArrangementRows",
    "shortcuts.groupWindows",
  ],
  [
    "arrangement.grid",
    "shortcuts.labelArrangementGrid",
    "shortcuts.groupWindows",
  ],
  [
    "arrangement.restore",
    "shortcuts.labelArrangementRestore",
    "shortcuts.groupWindows",
  ],
  [
    "window.fitRight",
    "shortcuts.labelWindowFitRight",
    "shortcuts.groupWindows",
  ],
  ["window.fitLeft", "shortcuts.labelWindowFitLeft", "shortcuts.groupWindows"],
  ...SHORTCUT_NUMBERS.map(
    (n): [ShortcutId, ShortcutLabelKey, ShortcutGroupKey, number] => [
      `tab.${n}`,
      "shortcuts.labelTabNumber",
      "shortcuts.groupTabsPanes",
      n,
    ],
  ),
  ...SHORTCUT_NUMBERS.map(
    (n): [ShortcutId, ShortcutLabelKey, ShortcutGroupKey, number] => [
      `command.${n}`,
      "shortcuts.labelCommandNumber",
      "shortcuts.groupCommand",
      n,
    ],
  ),
  ["terminal.focus", "shortcuts.labelTerminalFocus", "shortcuts.groupTerminal"],
  [
    "terminal.history",
    "shortcuts.labelTerminalHistory",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.pageUp",
    "shortcuts.labelTerminalPageUp",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.pageDown",
    "shortcuts.labelTerminalPageDown",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.halfPageUp",
    "shortcuts.labelTerminalHalfPageUp",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.halfPageDown",
    "shortcuts.labelTerminalHalfPageDown",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.multiline",
    "shortcuts.labelTerminalMultiline",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.altEnter",
    "shortcuts.labelTerminalAltEnter",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.ctrlEnter",
    "shortcuts.labelTerminalCtrlEnter",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.lineStart",
    "shortcuts.labelTerminalLineStart",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.lineEnd",
    "shortcuts.labelTerminalLineEnd",
    "shortcuts.groupTerminal",
  ],
  [
    "terminal.deleteToStart",
    "shortcuts.labelTerminalDeleteToStart",
    "shortcuts.groupTerminal",
  ],
  ["terminal.copy", "shortcuts.labelTerminalCopy", "shortcuts.groupTerminal"],
  ["terminal.paste", "shortcuts.labelTerminalPaste", "shortcuts.groupTerminal"],
  ["terminal.link", "shortcuts.labelTerminalLink", "shortcuts.groupTerminal"],
  ["composer.send", "shortcuts.labelComposerSend", "shortcuts.groupComposer"],
  ["preview.search", "shortcuts.labelPreviewSearch", "shortcuts.groupReview"],
  [
    "preview.selectAll",
    "shortcuts.labelPreviewSelectAll",
    "shortcuts.groupReview",
  ],
  [
    "annotation.submit",
    "shortcuts.labelAnnotationSubmit",
    "shortcuts.groupReview",
  ],
  [
    "annotations.copy",
    "shortcuts.labelAnnotationsCopy",
    "shortcuts.groupReview",
  ],
  [
    "annotations.prefill",
    "shortcuts.labelAnnotationsPrefill",
    "shortcuts.groupReview",
  ],
  ["town.next", "shortcuts.labelTownNext", "shortcuts.groupTown"],
  ["town.previous", "shortcuts.labelTownPrevious", "shortcuts.groupTown"],
];

export const SHORTCUT_CATALOG: ShortcutDescription[] = descriptions.map(
  ([id, label, group, count]) =>
    count === undefined ? { id, label, group } : { id, label, group, count },
);

/** Resolved label text; numbered entries interpolate their count. */
export function shortcutLabel(
  item: Pick<ShortcutDescription, "label" | "count">,
): string {
  return item.count === undefined
    ? t(item.label)
    : t(item.label, { count: item.count });
}
