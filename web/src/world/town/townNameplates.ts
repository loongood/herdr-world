/**
 * Nameplate text that stays readable at full scale (docs/design/town-at-scale.md).
 */
import { t } from "../../i18n";

/**
 * Where a reception chip's agent sits. An agent without a Herdr name is
 * otherwise labelled by its harness ("claude"), which says nothing about
 * where it is when a building has dozens of them: the chip names its room,
 * and the tooltip adds the desk.
 */
export function townReceptionName(
  agent: { displayLabel: string; agentName?: string },
  room: string | undefined,
  desk: string | undefined,
) {
  const where = [room, desk].filter(Boolean).join(" › ");
  if (agent.agentName || !room)
    return {
      name: agent.displayLabel,
      title: where
        ? t("town.receptionTitleIn", { name: agent.displayLabel, where })
        : agent.displayLabel,
    };
  return {
    name: room,
    title: t("town.receptionTitleIn", { name: agent.displayLabel, where }),
  };
}

/**
 * A room card's second line. Busy (the Town board's word) comes first so a narrow card truncates
 * the desk count (the tables show it) rather than the activity.
 */
export function townRoomCardMeta(
  counts: { desks: number; working: number },
  overflow: number,
) {
  const more = overflow ? ` · ${t("town.moreCount", { count: overflow })}` : "";
  return `${t("town.busyCount", { count: counts.working })} · ${t("town.desksCount", { count: counts.desks })}${more}`;
}
