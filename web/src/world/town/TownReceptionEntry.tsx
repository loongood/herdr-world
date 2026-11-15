import { useLayoutEffect, useRef } from "react";
import { t as translate, useT } from "../../i18n";
import type { OfficeAgent } from "../herdrOfficeProjection";
import { townReceptionName } from "./townNameplates";
import { townPortrait } from "./townSprites";

export const portrait = townPortrait;

function ago(since: number, now: number) {
  const seconds = Math.max(0, Math.round((now - since) / 1000));
  return seconds < 60
    ? translate("town.secondsShort", { count: seconds })
    : translate("town.minutesShort", { count: Math.floor(seconds / 60) });
}

export function ReceptionEntry({
  agent,
  room,
  desk,
  asking = false,
  since,
  now,
  selected,
  onSelect,
  onActivate,
  onHoverEntry,
}: {
  agent: OfficeAgent;
  /** The agent's room and desk labels: the chip says where it waits from. */
  room?: string;
  desk?: string;
  asking?: boolean;
  since: number;
  now: number;
  selected: boolean;
  onSelect(key: string): void;
  onActivate(key: string): void;
  onHoverEntry(key: string | null, rect?: DOMRect): void;
}) {
  const t = useT();
  const ref = useRef<HTMLButtonElement | null>(null);
  const { name, title } = townReceptionName(agent, room, desk);
  useLayoutEffect(() => {
    if (selected) ref.current?.setAttribute("data-selected", "true");
    else ref.current?.removeAttribute("data-selected");
  }, [selected]);
  return (
    <button
      ref={ref}
      type="button"
      className={`town-reception-entry${!asking && agent.semanticStatus === "done" ? " town-reception-done" : ""}`}
      data-agent-key={agent.key}
      data-owner-question={asking || undefined}
      disabled={agent.stale || !agent.canOpenInSpaces}
      aria-label={
        asking
          ? t("town.ownerQuestionAria", { name: title })
          : agent.semanticStatus === "done"
            ? t("town.finishedAria", { name: title })
            : t("town.needsYouFor", { name: title, age: ago(since, now) })
      }
      title={
        agent.taskSummary
          ? t("town.agentTaskTitle", {
              name: title,
              summary: agent.taskSummary,
            })
          : title
      }
      onClick={() => (asking ? onActivate(agent.key) : onSelect(agent.key))}
      onDoubleClick={() => onActivate(agent.key)}
      onMouseEnter={(event) =>
        onHoverEntry(agent.key, event.currentTarget.getBoundingClientRect())
      }
      onMouseLeave={() => onHoverEntry(null)}
    >
      <img src={portrait(agent.key)} alt="" width={28} height={40} />
      <span>{name}</span>
      <small>
        {asking
          ? t("town.ownerWantedPrefix")
          : agent.semanticStatus === "done"
            ? t("town.doneTick")
            : ago(since, now)}
      </small>
    </button>
  );
}
