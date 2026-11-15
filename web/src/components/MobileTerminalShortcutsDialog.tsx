import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  MOBILE_TERMINAL_CUSTOM_SPECIAL_KEYS,
  mobileTerminalKeyCombinationBytes,
  type MobileTerminalKeyCombination,
} from "../mobileTerminalKeyCombination";
import {
  MAX_MOBILE_TERMINAL_SHORTCUTS_PER_ROW,
  MAX_MOBILE_TERMINAL_SIDE_SHORTCUTS,
  MOBILE_TERMINAL_SHORTCUT_OPTIONS,
  defaultMobileTerminalShortcutRows,
  defaultMobileTerminalSideShortcuts,
  mobileTerminalShortcutOption,
  normalizeMobileTerminalShortcutRows,
  normalizeMobileTerminalSideShortcuts,
  type MobileTerminalShortcut,
  type MobileTerminalShortcutAction,
  type MobileTerminalShortcutRows,
  type MobileTerminalSideShortcuts,
} from "../mobileTerminalShortcuts";
import { CloseButton } from "./CloseButton";
import { focusDialogElement } from "./dialogFocus";
import { type TranslationKey, useT } from "../i18n";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import "./MobileTerminalShortcutsDialog.css";

const OPTION_GROUP_KEYS: Record<
  (typeof OPTION_GROUPS)[number],
  TranslationKey
> = {
  Control: "terminal.groupControl",
  Basic: "terminal.groupBasic",
  Navigation: "terminal.groupNavigation",
  Modified: "terminal.groupModified",
};
const OPTION_GROUPS = ["Control", "Basic", "Navigation", "Modified"] as const;
const US_KEY_ROWS = [
  "1234567890",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "`-=[]\\",
  ";',./",
];
const BASIC_KEYS = ["Escape", "Tab", "Backspace", "Enter", "Space"];
const EXTRA_KEY_GROUP_KEYS: Record<string, TranslationKey> = {
  "Navigation keys": "terminal.groupNavigationKeys",
  "Function keys": "terminal.groupFunctionKeys",
};
const EXTRA_KEY_GROUPS = {
  "Navigation keys": MOBILE_TERMINAL_CUSTOM_SPECIAL_KEYS.filter(
    (key) => !BASIC_KEYS.includes(key) && !/^F\d+$/.test(key),
  ),
  "Function keys": MOBILE_TERMINAL_CUSTOM_SPECIAL_KEYS.filter((key) =>
    /^F\d+$/.test(key),
  ),
};
let nextShortcutId = 1;

type SelectedSlot =
  | {
      area: "panel";
      rowIndex: number;
      slotIndex: number;
    }
  | {
      area: "side";
      slotIndex: number;
    };

function cloneRows(
  rows: MobileTerminalShortcutRows,
): MobileTerminalShortcutRows {
  return rows.map((row) =>
    Array.from(
      { length: MAX_MOBILE_TERMINAL_SHORTCUTS_PER_ROW },
      (_, slotIndex) => {
        const shortcut = row[slotIndex];
        return shortcut ? { ...shortcut } : null;
      },
    ),
  ) as MobileTerminalShortcutRows;
}

function cloneSideShortcuts(
  shortcuts: MobileTerminalSideShortcuts,
): MobileTerminalSideShortcuts {
  return Array.from(
    { length: MAX_MOBILE_TERMINAL_SIDE_SHORTCUTS },
    (_, slotIndex) => {
      const shortcut = shortcuts[slotIndex];
      return shortcut ? { ...shortcut } : null;
    },
  );
}

function newShortcut(): MobileTerminalShortcut {
  return {
    id: `custom-${Date.now()}-${nextShortcutId++}`,
    label: "Esc",
    action: "escape",
  };
}

function ShortcutKeySelect({
  value,
  ariaLabel,
  onChange,
}: {
  value: Extract<MobileTerminalShortcutAction, string>;
  ariaLabel: string;
  onChange: (action: MobileTerminalShortcutAction) => void;
}) {
  const currentItemRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeValue, setActiveValue] = useState<string>(value);
  const currentOption = mobileTerminalShortcutOption(value);
  const t = useT();

  const setSelectorOpen = (next: boolean) => {
    setOpen(next);
    setSearch("");
    if (next) setActiveValue(value);
  };

  return (
    <Popover open={open} onOpenChange={setSelectorOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`mobile-shortcut-key-trigger ${open ? "is-open" : ""}`}
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
        >
          <span>{currentOption?.label}</span>
          <ChevronsUpDown size={13} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="mobile-shortcut-key-popover"
        align="start"
        sideOffset={4}
        collisionPadding={12}
        data-mobile-shortcut-key-picker
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => currentItemRef.current?.focus());
        }}
      >
        <Command
          className="mobile-shortcut-key-command"
          loop
          value={activeValue}
          onValueChange={setActiveValue}
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={t("terminal.keysSearchPlaceholder")}
            aria-label={t("terminal.keysSearchAria")}
          />
          <CommandList>
            <CommandEmpty>{t("terminal.noMatchingKeys")}</CommandEmpty>
            {OPTION_GROUPS.map((group) => (
              <CommandGroup heading={t(OPTION_GROUP_KEYS[group])} key={group}>
                {MOBILE_TERMINAL_SHORTCUT_OPTIONS.filter(
                  (option) => option.group === group,
                ).map((option) => {
                  const current = option.id === value;
                  return (
                    <CommandItem
                      ref={current ? currentItemRef : undefined}
                      tabIndex={current ? 0 : -1}
                      className="mobile-shortcut-key-option"
                      value={option.id}
                      keywords={[
                        option.label,
                        option.defaultButtonLabel,
                        t(OPTION_GROUP_KEYS[group]),
                      ]}
                      data-current={current ? "true" : "false"}
                      aria-label={
                        current
                          ? t("terminal.keyOptionSelectedAria", {
                              label: option.label,
                            })
                          : option.label
                      }
                      key={option.id}
                      onSelect={() => {
                        onChange(option.id);
                        setSelectorOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      <kbd>{option.defaultButtonLabel}</kbd>
                      <Check size={13} aria-hidden="true" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CustomKeyPicker({
  value,
  onChange,
}: {
  value: MobileTerminalKeyCombination;
  onChange: (action: MobileTerminalKeyCombination) => void;
}) {
  const t = useT();
  const keyButton = (key: string) => {
    const shiftedKey =
      key.length === 1
        ? String.fromCharCode(
            ...mobileTerminalKeyCombinationBytes({
              key,
              ctrl: false,
              alt: false,
              shift: true,
            }),
          )
        : key;
    return (
      <button
        type="button"
        className="mobile-shortcut-keycap"
        key={key}
        aria-label={t("terminal.keyCapAria", {
          key: key.length === 1 ? key.toUpperCase() : key,
        })}
        aria-pressed={value.key === key || value.key === shiftedKey}
        onClick={() => onChange({ ...value, key })}
      >
        {key.length === 1
          ? value.shift
            ? shiftedKey
            : key.toUpperCase()
          : key
              .replace("Arrow", "")
              .replace("Escape", "Esc")
              .replace("Backspace", "Bksp")
              .replace("Page", "Pg")}
      </button>
    );
  };

  return (
    <div className="mobile-shortcut-custom-fields">
      <div className="mobile-shortcut-keyboard-head">
        <span>{t("terminal.usKeyboard")}</span>
        <output
          aria-label={t("terminal.selectedCombinationAria")}
          aria-live="polite"
        >
          {mobileTerminalShortcutOption(value)?.label}
        </output>
      </div>
      <div
        className="mobile-shortcut-modifiers"
        role="group"
        aria-label={t("terminal.customModifiersAria")}
      >
        {(["ctrl", "alt", "shift"] as const).map((modifier) => (
          <button
            type="button"
            className="mobile-shortcut-keycap"
            key={modifier}
            aria-pressed={value[modifier]}
            onClick={() => onChange({ ...value, [modifier]: !value[modifier] })}
          >
            {modifier === "ctrl"
              ? "Ctrl"
              : modifier === "alt"
                ? "Alt"
                : "Shift"}
          </button>
        ))}
      </div>
      <div
        className="mobile-shortcut-keyboard"
        role="group"
        aria-label={t("terminal.usKeyboardKeysAria")}
      >
        {US_KEY_ROWS.map((row) => (
          <div className="mobile-shortcut-keyboard-row" key={row}>
            {Array.from(row, keyButton)}
          </div>
        ))}
        <div className="mobile-shortcut-keyboard-row mobile-shortcut-basic-keys">
          {BASIC_KEYS.map(keyButton)}
        </div>
      </div>
      <details className="mobile-shortcut-more-keys">
        <summary>{t("terminal.moreKeys")}</summary>
        {Object.entries(EXTRA_KEY_GROUPS).map(([group, keys]) => (
          <div className="mobile-shortcut-key-group" key={group}>
            <div className="mobile-shortcut-keyboard-head">
              {t(EXTRA_KEY_GROUP_KEYS[group] ?? group)}
            </div>
            <div
              className="mobile-shortcut-extra-keys"
              role="group"
              aria-label={t(EXTRA_KEY_GROUP_KEYS[group] ?? group)}
            >
              {keys.map(keyButton)}
            </div>
          </div>
        ))}
      </details>
    </div>
  );
}

export function MobileTerminalShortcutsDialog({
  open,
  rows,
  sideShortcuts,
  onChange,
  onSideChange,
  onClose,
}: {
  open: boolean;
  rows: MobileTerminalShortcutRows;
  sideShortcuts: MobileTerminalSideShortcuts;
  onChange: (rows: MobileTerminalShortcutRows) => void;
  onSideChange: (shortcuts: MobileTerminalSideShortcuts) => void;
  onClose: () => void;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  const sideShortcutsRef = useRef(sideShortcuts);
  const onCloseRef = useRef(onClose);
  rowsRef.current = rows;
  sideShortcutsRef.current = sideShortcuts;
  onCloseRef.current = onClose;
  const [draft, setDraft] = useState<MobileTerminalShortcutRows>(() =>
    cloneRows(rows),
  );
  const [sideDraft, setSideDraft] = useState<MobileTerminalSideShortcuts>(() =>
    cloneSideShortcuts(sideShortcuts),
  );
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(cloneRows(rowsRef.current));
    setSideDraft(cloneSideShortcuts(sideShortcutsRef.current));
    setSelectedSlot(null);
    const cancelFocus = focusDialogElement(dialogRef.current);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        document.querySelector(
          '[data-mobile-shortcut-key-picker][data-state="open"]',
        )
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      cancelFocus();
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [open]);

  if (!open) return null;

  const selectPanelSlot = (rowIndex: number, slotIndex: number) => {
    setDraft((current) => {
      if (current[rowIndex][slotIndex]) return current;
      const next = cloneRows(current);
      next[rowIndex][slotIndex] = newShortcut();
      return next;
    });
    setSelectedSlot({ area: "panel", rowIndex, slotIndex });
  };

  const selectSideSlot = (slotIndex: number) => {
    setSideDraft((current) => {
      if (current[slotIndex]) return current;
      const next = cloneSideShortcuts(current);
      next[slotIndex] = newShortcut();
      return next;
    });
    setSelectedSlot({ area: "side", slotIndex });
  };

  const updateSelectedShortcut = (
    update: (shortcut: MobileTerminalShortcut) => MobileTerminalShortcut,
  ) => {
    if (!selectedSlot) return;
    if (selectedSlot.area === "side") {
      setSideDraft((current) => {
        const shortcut = current[selectedSlot.slotIndex];
        if (!shortcut) return current;
        const next = cloneSideShortcuts(current);
        next[selectedSlot.slotIndex] = update(shortcut);
        return next;
      });
      return;
    }
    setDraft((current) => {
      const shortcut = current[selectedSlot.rowIndex][selectedSlot.slotIndex];
      if (!shortcut) return current;
      const next = cloneRows(current);
      next[selectedSlot.rowIndex][selectedSlot.slotIndex] = update(shortcut);
      return next;
    });
  };

  const clearSelectedSlot = () => {
    if (!selectedSlot) return;
    if (selectedSlot.area === "side") {
      setSideDraft((current) => {
        const next = cloneSideShortcuts(current);
        next[selectedSlot.slotIndex] = null;
        return next;
      });
    } else {
      setDraft((current) => {
        const next = cloneRows(current);
        next[selectedSlot.rowIndex][selectedSlot.slotIndex] = null;
        return next;
      });
    }
    setSelectedSlot(null);
  };

  const updateSelectedAction = (action: MobileTerminalShortcutAction) => {
    const nextOption = mobileTerminalShortcutOption(action);
    updateSelectedShortcut((current) => ({
      ...current,
      action,
      label:
        !current.label.trim() ||
        current.label ===
          mobileTerminalShortcutOption(current.action)?.defaultButtonLabel
          ? (nextOption?.defaultButtonLabel ?? current.label)
          : current.label,
    }));
  };

  const selectedShortcut = selectedSlot
    ? selectedSlot.area === "side"
      ? sideDraft[selectedSlot.slotIndex]
      : draft[selectedSlot.rowIndex][selectedSlot.slotIndex]
    : null;
  const customAction =
    selectedShortcut && typeof selectedShortcut.action === "object"
      ? selectedShortcut.action
      : null;
  const invalidCombinations = [
    ...draft.flatMap((row, rowIndex) =>
      row.map(
        (shortcut, slotIndex) =>
          [
            shortcut,
            t("terminal.rowSlot", {
              row: rowIndex + 1,
              slot: slotIndex + 1,
            }),
          ] as const,
      ),
    ),
    ...sideDraft.map(
      (shortcut, slotIndex) =>
        [shortcut, t("terminal.sideSlot", { slot: slotIndex + 1 })] as const,
    ),
  ].flatMap(([shortcut, location]) =>
    shortcut &&
    typeof shortcut.action === "object" &&
    !mobileTerminalKeyCombinationBytes(shortcut.action).length
      ? [`${location}: ${mobileTerminalShortcutOption(shortcut.action)?.label}`]
      : [],
  );

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal mobile-shortcuts-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("terminal.shortcutsDialogAria")}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{t("terminal.shortcutsTitle")}</h2>
            <p>{t("terminal.shortcutsSubtitle")}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div
          className="mobile-shortcut-slot-board"
          aria-label={t("terminal.slotsAria")}
        >
          {draft.map((row, rowIndex) => (
            <section
              className="mobile-shortcut-slot-row"
              key={`row-${rowIndex}`}
            >
              <div className="mobile-shortcut-slot-row-label">
                <strong>{t("terminal.rowN", { row: rowIndex + 1 })}</strong>
                <span>
                  {row.filter(Boolean).length} /{" "}
                  {MAX_MOBILE_TERMINAL_SHORTCUTS_PER_ROW}
                </span>
              </div>
              <div className="mobile-shortcut-slot-grid">
                {row.map((shortcut, slotIndex) => {
                  const selected =
                    selectedSlot?.area === "panel" &&
                    selectedSlot.rowIndex === rowIndex &&
                    selectedSlot.slotIndex === slotIndex;
                  const option = shortcut
                    ? mobileTerminalShortcutOption(shortcut.action)
                    : null;
                  return (
                    <button
                      type="button"
                      className={`mobile-shortcut-slot ${
                        shortcut ? "is-filled" : "is-empty"
                      } ${selected ? "is-selected" : ""}`}
                      aria-label={
                        shortcut
                          ? t("terminal.editRowSlotAria", {
                              row: rowIndex + 1,
                              slot: slotIndex + 1,
                              label: shortcut.label,
                              key: option?.label ?? t("terminal.unknownKey"),
                            })
                          : t("terminal.addRowSlotAria", {
                              row: rowIndex + 1,
                              slot: slotIndex + 1,
                            })
                      }
                      aria-pressed={selected}
                      title={
                        shortcut
                          ? `${shortcut.label} · ${option?.label ?? t("terminal.unknownKey")}`
                          : t("terminal.addSlotTitle", { slot: slotIndex + 1 })
                      }
                      onClick={() => selectPanelSlot(rowIndex, slotIndex)}
                      key={`slot-${rowIndex}-${slotIndex}`}
                    >
                      {shortcut ? (
                        <>
                          <strong>{shortcut.label}</strong>
                          <span>
                            {option?.label ?? t("terminal.unknownKey")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Plus size={15} aria-hidden="true" />
                          <span>{slotIndex + 1}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <section
          className="mobile-shortcut-side-board"
          aria-label={t("terminal.sideSlotsAria")}
        >
          <div className="mobile-shortcut-side-head">
            <div>
              <strong>{t("terminal.sideButtons")}</strong>
              <span>{t("terminal.sideButtonsHint")}</span>
            </div>
            <span>{sideDraft.filter(Boolean).length} / 4</span>
          </div>
          <div className="mobile-shortcut-side-grid">
            {sideDraft.map((shortcut, slotIndex) => {
              const selected =
                selectedSlot?.area === "side" &&
                selectedSlot.slotIndex === slotIndex;
              const option = shortcut
                ? mobileTerminalShortcutOption(shortcut.action)
                : null;
              return (
                <button
                  type="button"
                  className={`mobile-shortcut-slot mobile-shortcut-side-slot ${
                    shortcut ? "is-filled" : "is-empty"
                  } ${selected ? "is-selected" : ""}`}
                  aria-label={
                    shortcut
                      ? t("terminal.editSideSlotAria", {
                          slot: slotIndex + 1,
                          label: shortcut.label,
                          key: option?.label ?? t("terminal.unknownKey"),
                        })
                      : t("terminal.addSideSlotAria", {
                          slot: slotIndex + 1,
                        })
                  }
                  aria-pressed={selected}
                  title={
                    shortcut
                      ? `${shortcut.label} · ${option?.label ?? t("terminal.unknownKey")}`
                      : t("terminal.addSideButtonTitle", {
                          slot: slotIndex + 1,
                        })
                  }
                  onClick={() => selectSideSlot(slotIndex)}
                  key={`side-slot-${slotIndex}`}
                >
                  {shortcut ? (
                    <>
                      <strong>{shortcut.label}</strong>
                      <span>{option?.label ?? t("terminal.unknownKey")}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} aria-hidden="true" />
                      <span>{slotIndex + 1}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section
          className={`mobile-shortcut-slot-editor ${
            selectedShortcut ? "is-active" : ""
          }`}
        >
          {selectedShortcut && selectedSlot ? (
            <>
              <div className="mobile-shortcut-slot-editor-head">
                <div>
                  <strong>
                    {selectedSlot.area === "side"
                      ? t("terminal.sideSlot", {
                          slot: selectedSlot.slotIndex + 1,
                        })
                      : t("terminal.rowSlot", {
                          row: selectedSlot.rowIndex + 1,
                          slot: selectedSlot.slotIndex + 1,
                        })}
                  </strong>
                  <span>{t("terminal.editInPlaceHint")}</span>
                </div>
                <button
                  type="button"
                  className="ghost is-danger"
                  onClick={clearSelectedSlot}
                >
                  <Trash2 size={14} />
                  {t("terminal.clearSlot")}
                </button>
              </div>
              <div
                className="mobile-shortcut-mode"
                role="group"
                aria-label={t("terminal.shortcutTypeAria")}
              >
                <button
                  type="button"
                  aria-pressed={!customAction}
                  onClick={() => {
                    if (customAction) updateSelectedAction("escape");
                  }}
                >
                  {t("terminal.presetMode")}
                </button>
                <button
                  type="button"
                  aria-pressed={!!customAction}
                  onClick={() => {
                    if (!customAction)
                      updateSelectedAction({
                        key: "x",
                        ctrl: true,
                        alt: false,
                        shift: false,
                      });
                  }}
                >
                  {t("terminal.customKeyboardMode")}
                </button>
              </div>
              <div className="mobile-shortcut-slot-editor-fields">
                <label>
                  <span>{t("terminal.labelField")}</span>
                  <input
                    value={selectedShortcut.label}
                    maxLength={10}
                    aria-label={
                      selectedSlot.area === "side"
                        ? t("terminal.sideSlotLabelAria", {
                            slot: selectedSlot.slotIndex + 1,
                          })
                        : t("terminal.rowSlotLabelAria", {
                            row: selectedSlot.rowIndex + 1,
                            slot: selectedSlot.slotIndex + 1,
                          })
                    }
                    onChange={(event) =>
                      updateSelectedShortcut((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                  />
                </label>
                {typeof selectedShortcut.action === "string" ? (
                  <div className="mobile-shortcut-field">
                    <span>{t("terminal.keyField")}</span>
                    <ShortcutKeySelect
                      value={selectedShortcut.action}
                      ariaLabel={
                        selectedSlot.area === "side"
                          ? t("terminal.sideSlotKeyAria", {
                              slot: selectedSlot.slotIndex + 1,
                            })
                          : t("terminal.rowSlotKeyAria", {
                              row: selectedSlot.rowIndex + 1,
                              slot: selectedSlot.slotIndex + 1,
                            })
                      }
                      onChange={updateSelectedAction}
                    />
                  </div>
                ) : null}
                {customAction ? (
                  <CustomKeyPicker
                    value={customAction}
                    onChange={updateSelectedAction}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className="mobile-shortcut-slot-editor-empty">
              {t("terminal.editorEmptyHint")}
            </div>
          )}
        </section>

        {invalidCombinations.length > 0 ? (
          <div className="mobile-shortcut-error" role="alert">
            {invalidCombinations.map((combination) => (
              <p key={combination}>
                {t("terminal.combinationUnsupported", { combination })}
              </p>
            ))}
            <p>{t("terminal.changeKeyBeforeSave")}</p>
          </div>
        ) : null}
        <details className="mobile-shortcut-help">
          <summary>{t("terminal.howShortcutsWork")}</summary>
          <p>{t("terminal.shortcutsHelpText")}</p>
        </details>

        <div className="modal-actions mobile-shortcuts-actions">
          <button
            type="button"
            className="ghost mobile-shortcuts-restore"
            onClick={() => {
              setDraft(defaultMobileTerminalShortcutRows());
              setSideDraft(defaultMobileTerminalSideShortcuts());
              setSelectedSlot(null);
            }}
          >
            <RotateCcw size={14} />
            {t("terminal.restoreDefaults")}
          </button>
          <span />
          <button type="button" className="ghost" onClick={onClose}>
            {t("history.cancel")}
          </button>
          <button
            type="button"
            disabled={invalidCombinations.length > 0}
            onClick={() => {
              onChange(normalizeMobileTerminalShortcutRows(draft));
              onSideChange(normalizeMobileTerminalSideShortcuts(sideDraft));
              onClose();
            }}
          >
            {t("terminal.saveShortcuts")}
          </button>
        </div>
      </div>
    </div>
  );
}
