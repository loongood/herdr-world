import { t } from "../../i18n/core";
import { agentStateWord } from "../agentMarks";
import type {
  OfficeAgent,
  OfficeDesk,
  OfficeRoom,
} from "../herdrOfficeProjection";
import { TOWN_TILE as T, type TownLayout, townSeat } from "./townLayout";
import type { TownModel } from "./townModel";

export type TownTarget = {
  key: string;
  kind: "room" | "desk" | "agent" | "pane";
  label: string;
  /** World-pixel rectangle. */
  rect: { x: number; y: number; width: number; height: number };
  canActivate: boolean;
  /** A desk's colour, its own or the one it inherits, for tests and tools. */
  color?: string;
};

export function townAgentLabel(
  model: TownModel,
  agent: OfficeAgent,
  desk?: OfficeDesk,
) {
  const entry = model.projection.roster.find(
    ({ agent: candidate }) => candidate.key === agent.key,
  );
  const state = agent.stale
    ? t("town.staleWord")
    : (agent.stateLabels[agent.semanticStatus] ??
      agentStateWord(agent.semanticStatus).toLowerCase());
  const location = desk
    ? t("town.deskTargetIn", {
        desk: desk.displayLabel,
        room: entry?.roomLabel ?? t("town.officeFallback"),
      })
    : (entry?.roomLabel ?? t("town.officeFallback"));
  const host =
    entry?.hostLabel ??
    model.hosts.get(agent.hostKey)?.displayLabel ??
    t("town.hostFallbackLower");
  const summary = agent.taskSummary
    ? t("town.agentSummaryTail", { summary: agent.taskSummary })
    : "";
  return t("town.agentTargetAria", {
    name: agent.displayLabel,
    state,
    location,
    host,
    summary,
  });
}

export function townRoomLabel(model: TownModel, room: OfficeRoom) {
  const host =
    model.hosts.get(room.hostKey)?.displayLabel ?? t("town.hostFallbackLower");
  return t("town.roomTargetAria", {
    room: room.accessibleLabel ?? room.displayLabel,
    host,
  });
}

function deskLabel(
  model: TownModel,
  desk: OfficeDesk,
  teammates: readonly string[] = [],
) {
  const room = model.rooms.get(desk.roomKey);
  const host =
    model.hosts.get(desk.hostKey)?.displayLabel ?? t("town.hostFallbackLower");
  const team = teammates.length
    ? t("town.inTeam", { names: teammates.join(", ") })
    : "";
  return `${desk.occupantAgentKey ? t("town.deskTarget") : t("town.emptyDeskTarget")} ${desk.displayLabel}, ${room?.displayLabel ?? t("town.officeFallback")}, ${host}, ${t("town.panesCount", { count: desk.observedPaneCount })}${team}`;
}

/**
 * Accessible targets for every presented room, desk, pane and seated agent.
 * A desk in a team (townTeams.ts) names its teammates, since the walls and
 * connectors are drawn only.
 */
export function townTargets(
  model: TownModel,
  layout: TownLayout,
  deskTeams: ReadonlyMap<string, string> = new Map(),
): TownTarget[] {
  const teams = new Map<string, string[]>();
  for (const [deskKey, team] of deskTeams)
    teams.set(team, [...(teams.get(team) ?? []), deskKey]);
  const teammates = (desk: OfficeDesk) =>
    (teams.get(deskTeams.get(desk.key) ?? "") ?? []).flatMap((key) => {
      const label =
        key === desk.key ? null : model.desks.get(key)?.displayLabel;
      return label ? [label] : [];
    });
  const targets: TownTarget[] = [];
  for (const building of layout.buildings)
    for (const placed of building.rooms) {
      const room = model.rooms.get(placed.key);
      if (!room) continue;
      targets.push({
        key: room.key,
        kind: "room",
        label: townRoomLabel(model, room),
        rect: {
          x: placed.x * T,
          y: placed.y * T,
          width: placed.w * T,
          height: T,
        },
        canActivate: true,
      });
      for (const cell of placed.cells) {
        if (!cell.deskKey) continue;
        const desk = model.desks.get(cell.deskKey);
        if (!desk) continue;
        targets.push({
          key: desk.key,
          kind: "desk",
          label: deskLabel(model, desk, teammates(desk)),
          color: model.deskColors.get(desk.key),
          rect: {
            x: (cell.x + 1) * T,
            y: cell.y * T + 17,
            width: 64,
            height: 24,
          },
          canActivate: desk.canOpenInSpaces,
        });
        desk.paneDevices.forEach((device, seat) => {
          const geometry = townSeat(cell, seat);
          const rect = {
            x: geometry.cx - 12,
            y: geometry.top ? geometry.tableY : geometry.tableY + 34,
            width: 24,
            height: 24,
          };
          const agent = device.agentKey
            ? model.agents.get(device.agentKey)
            : undefined;
          if (agent)
            targets.push({
              key: agent.key,
              kind: "agent",
              label: townAgentLabel(model, agent, desk),
              rect,
              canActivate: agent.canOpenInSpaces,
            });
          else
            targets.push({
              key: device.key,
              kind: "pane",
              label: t("town.paneTargetAria", {
                pane: device.displayLabel,
                desk: desk.displayLabel,
                count: desk.observedPaneCount,
                stale: device.stale ? t("town.staleTail") : "",
              }),
              rect,
              canActivate: device.canOpenInSpaces,
            });
        });
      }
    }
  return targets;
}
