import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import {
  defaultShortcutBindings,
  formatShortcut,
  SHORTCUT_PLATFORMS,
  type ShortcutId,
  shortcutConflicts,
  shortcutFromEvent,
  shortcutWarning,
  validateShortcutKeys,
} from "../shortcutBindings";
import { SHORTCUT_CATALOG, shortcutLabel } from "../shortcutCatalog";
import {
  deleteShortcutPreset,
  exportShortcutPreset,
  importShortcutPreset,
  saveShortcutPreset,
  selectShortcutPreset,
  updateShortcut,
  useShortcutPreferences,
} from "../shortcutPreferences";
import { CloseButton } from "./CloseButton";
import { focusDialogElement } from "./dialogFocus";
import { ThemedSelect } from "./ThemedSelect";
import "./ShortcutLookupDialog.css";

// Shares this lazy chunk so the cheat sheet adds no separate web assets.
export { ShortcutCheatSheet } from "./ShortcutCheatSheet";

export function ShortcutLookupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { preferences, platform, preset, storageError, platformMismatch } =
    useShortcutPreferences();
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ShortcutId | null>(null);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const custom = preferences.presets.some((item) => item.id === preset.id);
  const format = (keys: string[]) =>
    keys.map((key) => formatShortcut(key, platform)).join(" / ") ||
    t("shortcuts.unassigned");
  const clearEditor = () => {
    setEditing(null);
    setRecording(false);
    setError("");
    setDeleting(false);
  };
  const attempt = (action: () => void) => {
    try {
      action();
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const cancelFocus = focusDialogElement(dialogRef.current);
    return () => {
      cancelFocus();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLButtonElement>('button[aria-label="Menu"]')
          ?.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;
      if (recording) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") {
          setRecording(false);
          return;
        }
        if (["Control", "Alt", "Meta", "Shift"].includes(event.key)) return;
        const binding = shortcutFromEvent(event);
        if (!binding) {
          setError(t("shortcuts.errNotRecordable"));
          return;
        }
        setDraft(binding);
        setRecording(false);
        setError("");
        saveRef.current?.focus();
      } else if (event.key === "Escape") {
        // An open popover (themed select) consumes Escape to close itself.
        if (document.querySelector(".popover-content")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (editing) setEditing(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, recording, editing, onClose]);
  if (!open) return null;

  const visible = SHORTCUT_CATALOG.filter((item) =>
    `${shortcutLabel(item)} ${t(item.group)} ${format(preset.bindings[item.id])}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const groups = [...new Set(visible.map((item) => item.group))];
  const exportPreset = () => {
    const url = URL.createObjectURL(
      new Blob([exportShortcutPreset(preset)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${preset.name.replace(/[^a-z0-9-]/gi, "-")}-keybindings.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
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
        className="modal shortcut-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("shortcuts.title")}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled):not([type="file"]), select:not(:disabled)',
            ),
          ];
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
            <h2>{t("shortcuts.title")}</h2>
            <p>{t("shortcuts.lookupIntro")}</p>
          </div>
          <CloseButton label={t("shortcuts.lookupClose")} onClick={onClose} />
        </div>
        <div className="keybinding-settings">
          <label className="keybinding-preset">
            <span>{t("shortcuts.activePreset")}</span>
            <ThemedSelect
              aria-label={t("shortcuts.activePreset")}
              value={preferences.active}
              options={[
                {
                  value: "auto",
                  label: t("shortcuts.automaticPreset", {
                    platform: SHORTCUT_PLATFORMS[platform],
                  }),
                },
                ...Object.entries(SHORTCUT_PLATFORMS).map(([id, label]) => ({
                  value: id,
                  label,
                })),
                ...preferences.presets.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
              onChange={(preset) =>
                attempt(() => {
                  selectShortcutPreset(preset);
                  clearEditor();
                })
              }
            />
          </label>
          <div className="keybinding-preset-actions">
            <input
              aria-label={t("shortcuts.presetName")}
              placeholder={t("shortcuts.presetName")}
              value={name}
              maxLength={64}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() =>
                attempt(() => {
                  saveShortcutPreset(name);
                  setName("");
                  clearEditor();
                })
              }
            >
              {t("shortcuts.saveAs")}
            </button>
            <button type="button" className="ghost" onClick={exportPreset}>
              {t("shortcuts.export")}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => fileRef.current?.click()}
            >
              {t("shortcuts.import")}
            </button>
            {custom ? (
              <button
                type="button"
                className="ghost danger"
                onClick={() => setDeleting(!deleting)}
              >
                {t("shortcuts.delete")}
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 100_000)
                    throw new Error(t("shortcuts.errPresetTooLarge"));
                  const imported = importShortcutPreset(await file.text());
                  saveShortcutPreset(imported.name, imported);
                  clearEditor();
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            />
          </div>
          {deleting ? (
            <div className="keybinding-delete">
              <span>{t("shortcuts.deleteConfirm", { name: preset.name })}</span>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  deleteShortcutPreset(preset.id);
                  clearEditor();
                }}
              >
                {t("shortcuts.deletePreset")}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setDeleting(false)}
              >
                {t("shortcuts.cancel")}
              </button>
            </div>
          ) : null}
          <p className="muted">
            {t("shortcuts.detected", {
              platform: SHORTCUT_PLATFORMS[platform],
            })}{" "}
            {custom ? t("shortcuts.customSave") : t("shortcuts.builtinCopy")}
          </p>
          <input
            type="search"
            aria-label={t("shortcuts.searchAria")}
            placeholder={t("shortcuts.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {error || storageError ? (
            <p className="keybinding-error" role="alert">
              {error || storageError}
            </p>
          ) : null}
          {platformMismatch ? (
            <p className="keybinding-note" role="status">
              {t("shortcuts.mismatchNote", {
                name: platformMismatch.name,
                base: SHORTCUT_PLATFORMS[platformMismatch.base],
                platform: SHORTCUT_PLATFORMS[platform],
              })}
            </p>
          ) : null}
        </div>
        <div className="shortcut-list">
          {groups.map((group) => (
            <section className="shortcut-section" key={group}>
              <h3>{t(group)}</h3>
              <dl>
                {visible
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <div
                      className="shortcut-row"
                      key={item.id}
                      data-shortcut-id={item.id}
                    >
                      <dt>{shortcutLabel(item)}</dt>
                      <dd>
                        <button
                          type="button"
                          className="keybinding-edit ghost"
                          aria-label={t("shortcuts.editAria", {
                            label: shortcutLabel(item),
                          })}
                          onClick={() => {
                            setEditing(item.id);
                            setDraft(preset.bindings[item.id].join("; "));
                            setRecording(false);
                            setError("");
                          }}
                        >
                          <kbd>{format(preset.bindings[item.id])}</kbd>
                          <span>{t("shortcuts.edit")}</span>
                        </button>
                      </dd>
                      {editing === item.id ? (
                        <div className="keybinding-editor">
                          <label>
                            <span>{t("shortcuts.keyCombinations")}</span>
                            <input
                              aria-label={t("shortcuts.keysForAria", {
                                label: shortcutLabel(item),
                              })}
                              value={draft}
                              placeholder="Ctrl+Alt+K"
                              onChange={(event) => {
                                setDraft(event.target.value);
                                setError("");
                              }}
                            />
                          </label>
                          <div className="keybinding-editor-actions">
                            <button
                              type="button"
                              className="ghost"
                              disabled={item.id === "terminal.link"}
                              aria-pressed={recording}
                              onClick={() => {
                                setRecording(!recording);
                                setError("");
                              }}
                            >
                              {recording
                                ? t("shortcuts.pressKeys")
                                : t("shortcuts.record")}
                            </button>
                            <button
                              type="button"
                              ref={saveRef}
                              onClick={() =>
                                attempt(() => {
                                  const keys = validateShortcutKeys(
                                    item.id,
                                    draft.trim() ? draft.split(";") : [],
                                  );
                                  const conflicts = shortcutConflicts(
                                    item.id,
                                    keys,
                                    preset.bindings,
                                  );
                                  if (conflicts.length)
                                    throw new Error(
                                      t("shortcuts.conflictUsedBy", {
                                        labels: conflicts
                                          .map((id) => {
                                            const entry = SHORTCUT_CATALOG.find(
                                              (e) => e.id === id,
                                            );
                                            return entry
                                              ? shortcutLabel(entry)
                                              : id;
                                          })
                                          .join(", "),
                                      }),
                                    );
                                  updateShortcut(item.id, keys);
                                  clearEditor();
                                })
                              }
                            >
                              {t("shortcuts.saveBinding")}
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() =>
                                attempt(() => {
                                  updateShortcut(item.id, []);
                                  clearEditor();
                                })
                              }
                            >
                              {t("shortcuts.unassign")}
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() =>
                                setDraft(
                                  defaultShortcutBindings(preset.base)[
                                    item.id
                                  ].join("; "),
                                )
                              }
                            >
                              {t("shortcuts.default")}
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={clearEditor}
                            >
                              {t("shortcuts.cancel")}
                            </button>
                          </div>
                          <p className="muted">
                            {t("shortcuts.separateNote")}{" "}
                            {item.id === "terminal.link"
                              ? t("shortcuts.linkNote")
                              : t("shortcuts.escapeNote")}
                          </p>
                          {shortcutWarning(draft.split(";")) ? (
                            <p className="muted">
                              {shortcutWarning(draft.split(";"))}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
              </dl>
            </section>
          ))}
          {visible.length === 0 ? (
            <p className="muted">{t("shortcuts.noMatching")}</p>
          ) : null}
          {!search ? (
            <section className="shortcut-section keybinding-reference">
              <h3>{t("shortcuts.navControlsTitle")}</h3>
              <p>{t("shortcuts.navControlsP1")}</p>
              <p>{t("shortcuts.navControlsP2")}</p>
              <p>{t("shortcuts.navControlsP3")}</p>
            </section>
          ) : null}
        </div>
        <div className="modal-actions">
          <span className="muted">{t("shortcuts.lookupFoot")}</span>
          <button type="button" onClick={onClose}>
            {t("shortcuts.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
