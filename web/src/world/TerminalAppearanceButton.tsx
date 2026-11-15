import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  TerminalAppearanceEditor,
  type TerminalAppearanceEditorProps,
} from "./TerminalAppearanceEditor";
import { AppearanceAvatar } from "./AppearanceAvatar";
import { appearanceFor } from "../../../shared/appearance";
import { useAppearanceDocument } from "./appearance";
import type { CSSProperties } from "react";
import { useT } from "../i18n";
export function TerminalAppearanceButton(props: TerminalAppearanceEditorProps) {
  const t = useT();
  const document = useAppearanceDocument();
  const avatar = appearanceFor(document?.appearance, {
    connection_id: props.connectionId,
    kind: "pane",
    native_id: props.paneId,
    witness: [props.terminalId],
  })?.avatar;
  const hex = props.color.palette.find(
    (entry) => entry.id === props.color.current.id,
  )?.hex;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mobile-appearance-button"
          aria-label={t("terminal.appearanceAria")}
          title={t("terminal.appearanceAria")}
          style={{ "--tab-color": hex } as CSSProperties}
        >
          {avatar ? (
            <AppearanceAvatar id={avatar} />
          ) : (
            <span aria-hidden="true">◉</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        collisionPadding={8}
        align="start"
        aria-label={t("terminal.appearanceAria")}
      >
        <TerminalAppearanceEditor {...props} />
      </PopoverContent>
    </Popover>
  );
}
