import { useState } from "react";
import { BellOff, Crosshair, Eye } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import type { GroupView } from "../../../../shared/groupViews";
import type { GroupInterest } from "../../../../shared/interest";
import { useT } from "../../i18n";
import { groupKindLabel } from "./groupLabels";
import { useAgentInterest } from "../useAgentInterest";
import { sharedBoardStore, useBoardDocument } from "../board/boardDocument";
import "../../components/InterestButton.css";

/** Viewer preference for stored Teams/Pods. Room/Desk controls stay hidden in v1. */
export function GroupInterestButton({
  group,
  onError,
}: {
  group: GroupView;
  onError(message: string): void;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const store = sharedBoardStore();
  const { document } = useBoardDocument(store);
  const effective = useAgentInterest(store);
  if (!group.stored || (group.kind !== "team" && group.kind !== "pod"))
    return null;
  const intent = document?.layout.group_interest;
  const current =
    intent && Object.prototype.hasOwnProperty.call(intent, group.id)
      ? intent[group.id]
      : null;
  const empty =
    current === "focused" &&
    !group.terminals.some(
      (terminal) =>
        effective.interestOf(terminal.connectionId, terminal.terminalId) ===
        "focused",
    );
  const label = `${current === "focused" ? t("groups.interest.focused") : current === "muted" ? t("groups.interest.muted") : t("groups.interest.default")}${empty ? t("groups.interest.noOneOnline") : ""}`;
  const Icon =
    current === "focused" ? Crosshair : current === "muted" ? BellOff : Eye;
  const choose = async (interest: GroupInterest | null) => {
    setOpen(false);
    if (!document) return;
    const error = await store.patch(
      [{ op: "group.interest", id: group.id, interest }],
      document.revision,
    );
    if (error) onError(error);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="interest-button group-interest-button"
          type="button"
          aria-label={t("groups.interest.buttonAria", { label })}
          title={t("groups.interest.title", {
            label,
            kind: groupKindLabel(group.kind === "pod" ? "pod" : "team"),
            group: group.name,
          })}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="interest-popover" align="start">
        <div
          className="interest-choices"
          role="group"
          aria-label={t("groups.interest.aria")}
        >
          {(
            [
              {
                value: null,
                label: "groups.interest.default",
                hint: "groups.interest.defaultHint",
                Icon: Eye,
              },
              {
                value: "muted",
                label: "groups.interest.muted",
                hint: "groups.interest.mutedHint",
                Icon: BellOff,
              },
              {
                value: "focused",
                label: "groups.interest.focused",
                hint: "groups.interest.focusedHint",
                Icon: Crosshair,
              },
            ] as const
          ).map((choice) => (
            <button
              key={choice.label}
              type="button"
              className="interest-choice"
              aria-pressed={current === choice.value}
              onClick={() => void choose(choice.value)}
            >
              <choice.Icon size={15} />
              <span>
                <b>{t(choice.label)}</b>
                <small>{t(choice.hint)}</small>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
