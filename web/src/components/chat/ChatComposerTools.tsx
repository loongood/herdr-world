import { EllipsisVertical } from "lucide-react";
import { useState, type Ref } from "react";
import {
  mobileTerminalShortcutOption,
  type MobileTerminalShortcut,
} from "../../mobileTerminalShortcuts";
import { useT } from "../../i18n";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { chatKeyName } from "./chatKeys";

export function ChatComposerTools({
  buttonRef,
  disabled,
  commandsAvailable,
  onCommands,
  shortcutRows = [],
  onRunShortcut,
}: {
  buttonRef: Ref<HTMLButtonElement>;
  disabled: boolean;
  commandsAvailable: boolean;
  onCommands: () => void;
  /** The Terminal's key controls; each press goes to the agent's pane. */
  shortcutRows?: (MobileTerminalShortcut | null)[][];
  onRunShortcut?: (shortcut: MobileTerminalShortcut) => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  // The popover renders outside the window, so it takes the Town skin of
  // the window its button is in.
  const [town, setTown] = useState(false);
  const keys = onRunShortcut
    ? shortcutRows.filter((row) => row.some(Boolean))
    : [];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={buttonRef}
          onClick={(event) =>
            setTown(!!event.currentTarget.closest(".is-town-skin"))
          }
          type="button"
          className="terminal-composer-more"
          aria-label={t("chat.moreTools")}
          title={t("chat.moreTools")}
          disabled={disabled}
        >
          <EllipsisVertical size={18} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`chat-composer-tools-popover${
          town ? " is-town-skin town-skin-portal theme-scope-dark" : ""
        }`}
        aria-label={t("chat.composerControlsAria")}
        side="top"
        align="end"
        sideOffset={6}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onCommands();
          }}
          disabled={!commandsAvailable}
        >
          {t("chat.browseCommands")} <kbd>/</kbd>
        </button>
        {keys.length ? (
          // The popover stays open so a menu can be walked key by key.
          <div
            className="chat-composer-keys"
            role="group"
            aria-label={t("chat.keysAria")}
          >
            {keys.map((row, rowIndex) => (
              <div className="chat-composer-key-row" key={rowIndex}>
                {row.map((shortcut, slot) => {
                  if (!shortcut) return <span key={slot} aria-hidden="true" />;
                  const label =
                    mobileTerminalShortcutOption(shortcut.action)?.label ??
                    shortcut.label;
                  const pressable = chatKeyName(shortcut.action) !== null;
                  return (
                    <button
                      key={shortcut.id}
                      type="button"
                      aria-label={t("chat.pressKey", { key: label })}
                      title={
                        pressable
                          ? t("chat.pressKeyInTerminal", { label })
                          : t("chat.cannotPress", { label })
                      }
                      disabled={!pressable}
                      onClick={() => onRunShortcut!(shortcut)}
                    >
                      {shortcut.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
