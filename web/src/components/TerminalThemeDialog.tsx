import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ITheme } from "@xterm/xterm";
import {
  Check,
  ChevronsUpDown,
  Copy,
  Minus,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  Type,
} from "lucide-react";
import {
  clampTerminalFontScale,
  MAX_TERMINAL_FONT_NAME_LENGTH,
  normalizeTerminalFontFamily,
  type ResolvedTheme,
  TERMINAL_FONT_SCALE_DEFAULT,
  TERMINAL_FONT_SCALE_MAX,
  TERMINAL_FONT_SCALE_MIN,
  TERMINAL_FONT_SCALE_STEP,
  terminalFontFamilyStack,
} from "../appearance";
import {
  type CustomTerminalTheme,
  customTerminalThemeToITheme,
  defaultTerminalThemeId,
  MAX_CUSTOM_TERMINAL_THEMES,
  MAX_TERMINAL_THEME_NAME_LENGTH,
  resolveTerminalThemeDefinition,
  TERMINAL_ANSI_COLOR_KEYS,
  TERMINAL_BASE_COLOR_KEYS,
  type TerminalThemeColorKey,
  type TerminalThemeDefinition,
  TERMINAL_THEME_PRESETS,
  type TerminalThemeSelection,
  terminalColorToHex,
} from "../terminalThemes";
import { CloseButton } from "./CloseButton";
import { focusDialogElement } from "./dialogFocus";
import { ConfirmDialog } from "./ModalDialogs";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { type TranslationKey, useT } from "../i18n";
import "./TerminalThemeDialog.css";

// Editor fallback palette for colors a source theme leaves unset (xterm
// defaults, e.g. Herdr Dark's ANSI colors).
const EDITOR_FALLBACK_COLORS: Record<TerminalThemeColorKey, string> = {
  background: "#0b0d12",
  foreground: "#c9cdd6",
  cursor: "#c9cdd6",
  cursorAccent: "#0b0d12",
  selectionBackground: "#6ea8ff",
  black: "#2e3436",
  red: "#cc0000",
  green: "#4e9a06",
  yellow: "#c4a000",
  blue: "#3465a4",
  magenta: "#75507b",
  cyan: "#06989a",
  white: "#d3d7cf",
  brightBlack: "#555753",
  brightRed: "#ef2929",
  brightGreen: "#8ae234",
  brightYellow: "#fce94f",
  brightBlue: "#729fcf",
  brightMagenta: "#ad7fa8",
  brightCyan: "#34e2e2",
  brightWhite: "#eeeeec",
};

const COLOR_KEY_LABEL_KEYS: Record<TerminalThemeColorKey, TranslationKey> = {
  background: "terminal.colorBackground",
  foreground: "terminal.colorForeground",
  cursor: "terminal.colorCursor",
  cursorAccent: "terminal.colorCursorText",
  selectionBackground: "terminal.colorSelection",
  black: "terminal.colorBlack",
  red: "terminal.colorRed",
  green: "terminal.colorGreen",
  yellow: "terminal.colorYellow",
  blue: "terminal.colorBlue",
  magenta: "terminal.colorMagenta",
  cyan: "terminal.colorCyan",
  white: "terminal.colorWhite",
  brightBlack: "terminal.colorBrightBlack",
  brightRed: "terminal.colorBrightRed",
  brightGreen: "terminal.colorBrightGreen",
  brightYellow: "terminal.colorBrightYellow",
  brightBlue: "terminal.colorBrightBlue",
  brightMagenta: "terminal.colorBrightMagenta",
  brightCyan: "terminal.colorBrightCyan",
  brightWhite: "terminal.colorBrightWhite",
};

const ALL_COLOR_KEYS: readonly TerminalThemeColorKey[] = [
  ...TERMINAL_BASE_COLOR_KEYS,
  ...TERMINAL_ANSI_COLOR_KEYS,
];

const THEME_VARIANTS: readonly {
  value: ResolvedTheme;
  labelKey: TranslationKey;
}[] = [
  { value: "dark", labelKey: "terminal.variantDark" },
  { value: "light", labelKey: "terminal.variantLight" },
];

let nextCustomThemeId = 1;

function newCustomThemeId(): string {
  return `custom-${Date.now()}-${nextCustomThemeId++}`;
}

type TerminalThemeDraft = {
  id: string | null;
  name: string;
  variant: ResolvedTheme;
  colors: Record<TerminalThemeColorKey, string>;
};

function draftColorsFromITheme(
  theme: ITheme,
): Record<TerminalThemeColorKey, string> {
  const colors = {} as Record<TerminalThemeColorKey, string>;
  for (const key of ALL_COLOR_KEYS) {
    colors[key] = terminalColorToHex(theme[key]) || EDITOR_FALLBACK_COLORS[key];
  }
  return colors;
}

function draftFromDefinition(
  definition: TerminalThemeDefinition,
  name: string,
): TerminalThemeDraft {
  return {
    id: null,
    name,
    variant: definition.variant,
    colors: draftColorsFromITheme(definition.theme),
  };
}

function draftFromCustom(custom: CustomTerminalTheme): TerminalThemeDraft {
  const colors = {} as Record<TerminalThemeColorKey, string>;
  for (const key of ALL_COLOR_KEYS) {
    colors[key] = custom.colors[key]
      ? terminalColorToHex(custom.colors[key])
      : EDITOR_FALLBACK_COLORS[key];
  }
  return { id: custom.id, name: custom.name, variant: custom.variant, colors };
}

// Chromium's Local Font Access API; other browsers only offer typed names.
type LocalFontData = { family: string };
type LocalFontWindow = Window & {
  queryLocalFonts?: () => Promise<LocalFontData[]>;
};

function localFontQuery() {
  if (typeof window === "undefined") return null;
  const query = (window as LocalFontWindow).queryLocalFonts;
  return typeof query === "function" ? query.bind(window) : null;
}

function TerminalThemePreview({
  colors,
  fontFamily,
}: {
  colors: Record<TerminalThemeColorKey, string>;
  fontFamily: string;
}) {
  return (
    <div
      className="terminal-theme-preview"
      style={{ background: colors.background, fontFamily }}
      aria-hidden="true"
    >
      <div className="terminal-theme-preview-lines">
        <span style={{ color: colors.foreground }}>$ herdr test</span>
        <span>
          <i style={{ color: colors.green }}>pass</i>
          <i style={{ color: colors.red }}>fail</i>
          <i style={{ color: colors.blue }}>src/main.ts</i>
        </span>
      </div>
      <div className="terminal-theme-dots">
        {TERMINAL_ANSI_COLOR_KEYS.map((key) => (
          <span
            key={key}
            className="terminal-theme-dot"
            style={{ background: colors[key] }}
          />
        ))}
      </div>
    </div>
  );
}

type ThemeCardData = {
  definition: TerminalThemeDefinition;
  custom: CustomTerminalTheme | null;
};

function TerminalFontPicker({
  fontName,
  onFontNameChange,
}: {
  fontName: string;
  onFontNameChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [installedFonts, setInstalledFonts] = useState<string[] | null>(null);
  const [fontListError, setFontListError] = useState<string | null>(null);
  const [loadingFonts, setLoadingFonts] = useState(false);
  const t = useT();
  const queryFonts = localFontQuery();
  const typedName = normalizeTerminalFontFamily(search);
  const typedNameListed = installedFonts?.some(
    (family) => family.toLowerCase() === typedName.toLowerCase(),
  );

  const setPickerOpen = (next: boolean) => {
    setOpen(next);
    if (next) setSearch("");
  };

  const choose = (name: string) => {
    if (name !== fontName) onFontNameChange(name);
    setPickerOpen(false);
  };

  // Chromium asks for font access on the first call, so only list installed
  // fonts once the user asks for them.
  const loadInstalledFonts = async () => {
    if (!queryFonts || loadingFonts) return;
    setLoadingFonts(true);
    setFontListError(null);
    try {
      const fonts = await queryFonts();
      const families = [...new Set(fonts.map((font) => font.family))].sort(
        (a, b) => a.localeCompare(b),
      );
      setInstalledFonts(families);
      if (families.length === 0) setFontListError(t("terminal.fontListEmpty"));
    } catch {
      setFontListError(t("terminal.fontAccessDenied"));
    } finally {
      setLoadingFonts(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`terminal-font-trigger ${open ? "is-open" : ""}`}
          role="combobox"
          aria-expanded={open}
          aria-label={t("terminal.fontTriggerAria")}
        >
          <span style={{ fontFamily: terminalFontFamilyStack(fontName) }}>
            {fontName || t("terminal.fontDefault")}
          </span>
          <ChevronsUpDown size={13} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="terminal-font-popover"
        align="end"
        sideOffset={4}
        collisionPadding={12}
      >
        <Command className="terminal-font-command" loop>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={t("terminal.fontSearchPlaceholder")}
            aria-label={t("terminal.fontSearchAria")}
            maxLength={MAX_TERMINAL_FONT_NAME_LENGTH}
          />
          <CommandList>
            {typedName && !typedNameListed ? (
              <CommandItem
                forceMount
                className="terminal-font-option"
                value={`custom:${typedName}`}
                onSelect={() => choose(typedName)}
              >
                <span className="command-item-text">
                  <span
                    className="command-item-title"
                    style={{ fontFamily: terminalFontFamilyStack(typedName) }}
                  >
                    {t("terminal.useFontName", { name: typedName })}
                  </span>
                  <span className="command-item-detail">
                    {t("terminal.fontMustBeInstalled")}
                  </span>
                </span>
              </CommandItem>
            ) : null}
            <CommandItem
              className="terminal-font-option"
              value="default"
              keywords={["default", "built-in"]}
              data-current={fontName ? "false" : "true"}
              onSelect={() => choose("")}
            >
              <span className="command-item-text">
                <span className="command-item-title">
                  {t("terminal.fontDefault")}
                </span>
                <span className="command-item-detail">
                  {t("terminal.fontBuiltIn")}
                </span>
              </span>
              <Check size={13} aria-hidden="true" />
            </CommandItem>
            {queryFonts && !installedFonts ? (
              <CommandItem
                className="terminal-font-option"
                value="list-installed-fonts"
                keywords={["installed", "browse", "list"]}
                disabled={loadingFonts}
                onSelect={() => void loadInstalledFonts()}
              >
                <span className="command-item-text">
                  <span className="command-item-title">
                    {loadingFonts
                      ? t("terminal.fontsLoading")
                      : t("terminal.showInstalledFonts")}
                  </span>
                  <span className="command-item-detail">
                    {fontListError ?? t("terminal.fontAccessOnce")}
                  </span>
                </span>
              </CommandItem>
            ) : null}
            {installedFonts && installedFonts.length > 0 ? (
              <CommandGroup heading={t("terminal.installedHeading")}>
                {installedFonts.map((family) => (
                  <CommandItem
                    key={family}
                    className="terminal-font-option"
                    value={`font:${family}`}
                    keywords={[family]}
                    data-current={family === fontName ? "true" : "false"}
                    onSelect={() => choose(family)}
                  >
                    <span
                      className="command-item-title"
                      style={{ fontFamily: `"${family}"` }}
                    >
                      {family}
                    </span>
                    <Check size={13} aria-hidden="true" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {installedFonts && fontListError ? (
              <p className="terminal-font-message">{fontListError}</p>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TerminalFontSection({
  fontName,
  fontScale,
  onFontNameChange,
  onFontScaleChange,
}: {
  fontName: string;
  fontScale: number;
  onFontNameChange: (name: string) => void;
  onFontScaleChange: (scale: number) => void;
}) {
  const t = useT();
  return (
    <section className="terminal-theme-section">
      <div className="terminal-theme-section-head">
        <div>
          <strong>
            <Type size={14} aria-hidden="true" />
            {t("terminal.fontSection")}
          </strong>
          <span>{t("terminal.fontSectionHint")}</span>
        </div>
      </div>
      <div className="terminal-font-group">
        <div className="terminal-font-row">
          <div className="config-item-copy">
            <strong>{t("terminal.fontFamily")}</strong>
            <span>{t("terminal.fontFamilyHint")}</span>
          </div>
          <TerminalFontPicker
            fontName={fontName}
            onFontNameChange={onFontNameChange}
          />
        </div>
        <div className="terminal-font-row">
          <div className="config-item-copy">
            <strong>{t("terminal.fontSize")}</strong>
            <span>{t("terminal.fontSizeHint")}</span>
          </div>
          <div
            className="config-scale-control"
            role="group"
            aria-label={t("terminal.fontSizeGroupAria")}
          >
            <button
              type="button"
              aria-label={t("terminal.fontSizeDecrease")}
              disabled={fontScale <= TERMINAL_FONT_SCALE_MIN}
              onClick={() =>
                onFontScaleChange(
                  clampTerminalFontScale(fontScale - TERMINAL_FONT_SCALE_STEP),
                )
              }
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              className="config-scale-value"
              aria-label={t("terminal.fontSizeReset", { scale: fontScale })}
              disabled={fontScale === TERMINAL_FONT_SCALE_DEFAULT}
              onClick={() => onFontScaleChange(TERMINAL_FONT_SCALE_DEFAULT)}
            >
              {fontScale}%
            </button>
            <button
              type="button"
              aria-label={t("terminal.fontSizeIncrease")}
              disabled={fontScale >= TERMINAL_FONT_SCALE_MAX}
              onClick={() =>
                onFontScaleChange(
                  clampTerminalFontScale(fontScale + TERMINAL_FONT_SCALE_STEP),
                )
              }
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TerminalThemeDialog({
  open,
  selection,
  customThemes,
  fontName,
  fontScale,
  onSelectionChange,
  onCustomThemesChange,
  onFontNameChange,
  onFontScaleChange,
  onClose,
}: {
  open: boolean;
  selection: TerminalThemeSelection;
  customThemes: CustomTerminalTheme[];
  fontName: string;
  fontScale: number;
  onSelectionChange: (selection: TerminalThemeSelection) => void;
  onCustomThemesChange: (themes: CustomTerminalTheme[]) => void;
  onFontNameChange: (name: string) => void;
  onFontScaleChange: (scale: number) => void;
  onClose: () => void;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<TerminalThemeDraft | null>(null);
  const previewFontFamily = terminalFontFamilyStack(fontName);
  const [pendingDelete, setPendingDelete] =
    useState<CustomTerminalTheme | null>(null);

  const editing = draft !== null;
  const confirmingDelete = pendingDelete !== null;
  const canCreate = customThemes.length < MAX_CUSTOM_TERMINAL_THEMES;
  const missingDraft =
    draft?.id != null && !customThemes.some((theme) => theme.id === draft.id);

  useEffect(() => {
    if (open && !confirmingDelete) {
      return focusDialogElement(dialogRef.current);
    }
  }, [open, editing, confirmingDelete]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The delete confirmation and the font picker handle their own Escape.
      if (pendingDelete || document.querySelector(".popover-content")) return;
      event.preventDefault();
      event.stopPropagation();
      if (draft) setDraft(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [open, draft, pendingDelete, onClose]);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      setPendingDelete(null);
    }
  }, [open]);

  if (!open) return null;

  const cardsFor = (variant: ResolvedTheme): ThemeCardData[] => [
    ...TERMINAL_THEME_PRESETS.filter(
      (preset) => preset.variant === variant,
    ).map((definition) => ({ definition, custom: null })),
    ...customThemes
      .filter((theme) => theme.variant === variant)
      .map((custom) => ({
        custom,
        definition: {
          id: custom.id,
          name: custom.name,
          variant: custom.variant,
          builtin: false,
          theme: customTerminalThemeToITheme(custom),
        },
      })),
  ];

  const selectTheme = (variant: ResolvedTheme, id: string) => {
    onSelectionChange({ ...selection, [variant]: id });
  };

  const startNewTheme = (variant: ResolvedTheme) => {
    const current = resolveTerminalThemeDefinition(
      variant,
      selection,
      customThemes,
    );
    setDraft(
      draftFromDefinition(current, t("terminal.defaultCustomThemeName")),
    );
  };

  const duplicateTheme = (card: ThemeCardData) => {
    setDraft(
      draftFromDefinition(
        card.definition,
        t("terminal.copyThemeName", { name: card.definition.name }),
      ),
    );
  };

  const saveDraft = () => {
    if (!draft || missingDraft || (!draft.id && !canCreate)) return;
    const theme: CustomTerminalTheme = {
      id: draft.id ?? newCustomThemeId(),
      name: draft.name.trim() || t("terminal.defaultCustomThemeName"),
      variant: draft.variant,
      colors: { ...draft.colors },
    };
    onCustomThemesChange(
      draft.id
        ? customThemes.map((custom) =>
            custom.id === draft.id ? theme : custom,
          )
        : [...customThemes, theme],
    );
    onSelectionChange({ ...selection, [theme.variant]: theme.id });
    setDraft(null);
  };

  const deleteCustomTheme = (theme: CustomTerminalTheme) => {
    onCustomThemesChange(
      customThemes.filter((custom) => custom.id !== theme.id),
    );
    if (selection.dark === theme.id || selection.light === theme.id) {
      onSelectionChange({
        dark:
          selection.dark === theme.id
            ? defaultTerminalThemeId("dark")
            : selection.dark,
        light:
          selection.light === theme.id
            ? defaultTerminalThemeId("light")
            : selection.light,
      });
    }
  };

  const onCardKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    cards: ThemeCardData[],
    index: number,
    variant: ResolvedTheme,
  ) => {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (direction === 0) return;
    event.preventDefault();
    const nextIndex = (index + direction + cards.length) % cards.length;
    selectTheme(variant, cards[nextIndex].definition.id);
    const buttons = event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[nextIndex]?.focus();
  };

  const renderSection = (variant: ResolvedTheme, label: string) => {
    const cards = cardsFor(variant);
    // A stale selection id (e.g. edited storage) marks no card active; keep
    // the first card tabbable so the group stays keyboard-reachable.
    const hasActive = cards.some(
      (card) => selection[variant] === card.definition.id,
    );
    return (
      <section className="terminal-theme-section" key={variant}>
        <div className="terminal-theme-section-head">
          <div>
            <strong>
              {variant === "dark" ? (
                <Moon size={14} aria-hidden="true" />
              ) : (
                <Sun size={14} aria-hidden="true" />
              )}
              {label}
            </strong>
            <span>
              {t("terminal.usedInVariant", { mode: label.toLowerCase() })}
            </span>
          </div>
          <button
            type="button"
            className="terminal-theme-new-button"
            disabled={!canCreate}
            title={
              canCreate
                ? t("terminal.createThemeFor", { mode: label.toLowerCase() })
                : t("terminal.themeLimitReached", {
                    max: MAX_CUSTOM_TERMINAL_THEMES,
                  })
            }
            onClick={() => startNewTheme(variant)}
          >
            <Plus size={14} aria-hidden="true" />
            {t("terminal.newTheme")}
          </button>
        </div>
        <div
          className="terminal-theme-grid"
          role="radiogroup"
          aria-label={t("terminal.variantThemeAria", { mode: label })}
        >
          {cards.map((card, index) => {
            const active = selection[variant] === card.definition.id;
            const custom = card.custom;
            return (
              <div
                key={card.definition.id}
                className={`terminal-theme-card ${active ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active || (!hasActive && index === 0) ? 0 : -1}
                  className="terminal-theme-card-select"
                  onClick={() => selectTheme(variant, card.definition.id)}
                  onKeyDown={(event) =>
                    onCardKeyDown(event, cards, index, variant)
                  }
                >
                  <TerminalThemePreview
                    colors={draftColorsFromITheme(card.definition.theme)}
                    fontFamily={previewFontFamily}
                  />
                  <span className="terminal-theme-card-name">
                    {active ? <Check size={13} aria-hidden="true" /> : null}
                    {card.definition.name}
                    {custom ? (
                      <span className="badge">{t("terminal.customBadge")}</span>
                    ) : null}
                  </span>
                </button>
                <span className="terminal-theme-card-actions">
                  <button
                    type="button"
                    aria-label={t("terminal.duplicateThemeAria", {
                      name: card.definition.name,
                    })}
                    title={
                      canCreate
                        ? t("terminal.duplicateAsCustom")
                        : t("terminal.themeLimitReached", {
                            max: MAX_CUSTOM_TERMINAL_THEMES,
                          })
                    }
                    disabled={!canCreate}
                    onClick={() => duplicateTheme(card)}
                  >
                    <Copy size={13} aria-hidden="true" />
                  </button>
                  {custom ? (
                    <>
                      <button
                        type="button"
                        aria-label={t("terminal.editThemeAria", {
                          name: card.definition.name,
                        })}
                        title={t("terminal.editTheme")}
                        onClick={() => setDraft(draftFromCustom(custom))}
                      >
                        <Pencil size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("terminal.deleteThemeAria", {
                          name: card.definition.name,
                        })}
                        title={t("terminal.deleteTheme")}
                        onClick={() => setPendingDelete(custom)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderEditor = (current: TerminalThemeDraft) => {
    const setColor = (key: TerminalThemeColorKey, value: string) => {
      setDraft({ ...current, colors: { ...current.colors, [key]: value } });
    };
    const colorField = (key: TerminalThemeColorKey) => (
      <label className="terminal-theme-color-field" key={key}>
        <input
          type="color"
          value={current.colors[key]}
          onChange={(event) => setColor(key, event.target.value)}
        />
        <span>{t(COLOR_KEY_LABEL_KEYS[key])}</span>
        <code>{current.colors[key]}</code>
      </label>
    );
    return (
      <>
        <div className="modal-head">
          <div>
            <h2>
              {current.id ? t("terminal.editTheme") : t("terminal.newTheme")}
            </h2>
            <p>{t("terminal.editorHint")}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="terminal-theme-editor">
          <div className="terminal-theme-editor-top">
            <label className="form-field terminal-theme-name-field">
              <span>{t("terminal.themeName")}</span>
              <input
                value={current.name}
                maxLength={MAX_TERMINAL_THEME_NAME_LENGTH}
                onChange={(event) =>
                  setDraft({ ...current, name: event.target.value })
                }
              />
            </label>
            <div className="terminal-theme-variant-field">
              <span>{t("terminal.suggestedFor")}</span>
              <div
                className="config-theme-control"
                aria-label={t("terminal.suggestedAppearanceAria")}
              >
                {THEME_VARIANTS.map((variant) => (
                  <button
                    key={variant.value}
                    type="button"
                    aria-label={t(variant.labelKey)}
                    aria-pressed={current.variant === variant.value}
                    className={
                      current.variant === variant.value ? "is-active" : ""
                    }
                    onClick={() =>
                      setDraft({ ...current, variant: variant.value })
                    }
                  >
                    {variant.value === "dark" ? (
                      <Moon size={14} />
                    ) : (
                      <Sun size={14} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <TerminalThemePreview
            colors={current.colors}
            fontFamily={previewFontFamily}
          />

          <div className="terminal-theme-color-group">
            <strong>{t("terminal.baseColors")}</strong>
            <div className="terminal-theme-color-grid">
              {TERMINAL_BASE_COLOR_KEYS.map(colorField)}
            </div>
          </div>
          <div className="terminal-theme-color-group">
            <strong>{t("terminal.ansiColors")}</strong>
            <div className="terminal-theme-color-grid">
              {TERMINAL_ANSI_COLOR_KEYS.map(colorField)}
            </div>
          </div>
        </div>

        {missingDraft ? (
          <p role="alert">{t("terminal.missingThemeAlert")}</p>
        ) : null}
        {!current.id && !canCreate ? (
          <p role="alert">
            {t("terminal.themeLimitReachedDetail", {
              max: MAX_CUSTOM_TERMINAL_THEMES,
            })}
          </p>
        ) : null}
        <div className="modal-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => setDraft(null)}
          >
            {t("history.cancel")}
          </button>
          <button
            type="button"
            disabled={
              !current.name.trim() ||
              missingDraft ||
              (!current.id && !canCreate)
            }
            onClick={saveDraft}
          >
            {current.id ? t("terminal.saveTheme") : t("terminal.createTheme")}
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      <div
        className="modal-backdrop"
        onMouseDown={() => (draft ? setDraft(null) : onClose())}
      >
        <div
          ref={dialogRef}
          className="modal terminal-themes-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("terminal.appearanceAria")}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {draft ? (
            renderEditor(draft)
          ) : (
            <>
              <div className="modal-head">
                <div>
                  <h2>{t("terminal.appearanceTitle")}</h2>
                  <p>{t("terminal.appearanceSubtitle")}</p>
                </div>
                <CloseButton onClick={onClose} />
              </div>
              <TerminalFontSection
                fontName={fontName}
                fontScale={fontScale}
                onFontNameChange={onFontNameChange}
                onFontScaleChange={onFontScaleChange}
              />
              {THEME_VARIANTS.map((variant) =>
                renderSection(variant.value, t(variant.labelKey)),
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={t("terminal.deleteTheme")}
        message={t("terminal.deleteConfirm", {
          name: pendingDelete?.name ?? "",
        })}
        confirmLabel={t("terminal.deleteAction")}
        danger
        onConfirm={() => {
          if (pendingDelete) deleteCustomTheme(pendingDelete);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
