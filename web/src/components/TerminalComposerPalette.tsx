import "./TerminalComposerPalette.css";
import { X } from "lucide-react";
import type { RefObject, KeyboardEvent, MouseEvent } from "react";
import type { ComposerCommand } from "../terminalComposerCommands";
import { useT } from "../i18n";

/** The existing command palette, shared by the terminal and Chat composer. */
export function TerminalComposerPalette({
  commandPickerRef,
  selectedCommand,
  pickerId,
  activeCommand,
  commandKeyDown,
  keepTextareaFocus,
  closeCommandPicker,
  replacement,
  replacementCancelRef,
  setReplacement,
  focusPickerWithoutKeyboard,
  busy,
  composing,
  selectCommand,
  commandListRef,
  matches,
}: {
  commandPickerRef: RefObject<HTMLElement | null>;
  selectedCommand?: ComposerCommand;
  pickerId: string;
  activeCommand: number;
  commandKeyDown: (event: KeyboardEvent) => boolean;
  keepTextareaFocus: (event: MouseEvent<HTMLButtonElement>) => void;
  closeCommandPicker: () => void;
  replacement: { command: ComposerCommand; draft: string } | null;
  replacementCancelRef: RefObject<HTMLButtonElement | null>;
  setReplacement: (value: null) => void;
  focusPickerWithoutKeyboard: () => void;
  busy: boolean;
  composing: boolean;
  selectCommand: (command: ComposerCommand, confirmed?: boolean) => void;
  commandListRef: RefObject<HTMLDivElement | null>;
  matches: readonly ComposerCommand[];
}) {
  const t = useT();
  return (
    <section
      ref={commandPickerRef}
      className="terminal-composer-commands"
      role="group"
      tabIndex={-1}
      aria-label={t("terminal.agentCommandsAria")}
      aria-activedescendant={
        !replacement && selectedCommand
          ? `${pickerId}-${activeCommand}`
          : undefined
      }
      onKeyDown={commandKeyDown}
    >
      <div className="terminal-composer-command-heading">
        <span>{t("terminal.commandsHeading")}</span>
        <button
          type="button"
          aria-label={t("terminal.dismissCommandsAria")}
          onMouseDown={keepTextareaFocus}
          onClick={closeCommandPicker}
        >
          <X size={14} />
        </button>
      </div>
      {replacement ? (
        <div
          className="terminal-composer-command-confirm"
          role="group"
          aria-label={t("terminal.confirmReplacementAria")}
        >
          <p role="status">
            {t("terminal.replaceDraftNotice", {
              name: replacement.command.name,
            })}
          </p>
          <button
            type="button"
            ref={replacementCancelRef}
            tabIndex={0}
            onMouseDown={keepTextareaFocus}
            onClick={() => {
              setReplacement(null);
              focusPickerWithoutKeyboard();
            }}
          >
            {t("history.cancel")}
          </button>
          <button
            type="button"
            className="is-primary"
            disabled={busy || composing}
            tabIndex={0}
            onMouseDown={keepTextareaFocus}
            onClick={() => selectCommand(replacement.command, true)}
          >
            {t("terminal.replaceDraft")}
          </button>
        </div>
      ) : (
        <>
          <div
            id={pickerId}
            ref={commandListRef}
            role="listbox"
            aria-label={t("terminal.agentCommandsAria")}
            className="terminal-composer-command-list"
          >
            {matches.map((command, index) => (
              <button
                type="button"
                role="option"
                id={`${pickerId}-${index}`}
                key={command.name}
                tabIndex={-1}
                aria-selected={index === activeCommand}
                disabled={busy || composing}
                onMouseDown={keepTextareaFocus}
                onClick={() => selectCommand(command)}
              >
                <span className="terminal-composer-command-usage">
                  <strong>{command.name}</strong>
                  {command.arguments ? (
                    <>
                      {" "}
                      <small>{command.arguments}</small>
                    </>
                  ) : null}
                </span>
                <span className="terminal-composer-command-description">
                  {command.description}
                </span>
              </button>
            ))}
          </div>
          {matches.length === 0 ? (
            <span className="terminal-composer-command-note" role="status">
              {t("terminal.noMatchingCommands")}
            </span>
          ) : null}
        </>
      )}
    </section>
  );
}
