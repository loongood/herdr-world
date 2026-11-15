import { t } from "../../i18n/core";
import type { TownLevel } from "./townCamera";
import type { TownHit } from "./townHitTest";
import { TOWN_TILE, type TownLayout } from "./townLayout";
import type { TownModel } from "./townModel";
import {
  type TownRoomPlacement,
  townRoomPlacement,
  townRoomSpotAt,
} from "./townRoomPlace";

/** A desk, agent or room being dragged, and where it would land. */
export type TownDrag = {
  kind: "desk" | "agent" | "room";
  key: string;
  hostKey: string;
  /**
   * The desk's room, the agent's desk, or the room itself: dropping there
   * does nothing.
   */
  from: string;
  label: string;
  target?: TownDropTarget;
};

/**
 * Where a drag lands. A desk dropped on another room moves there. In its own
 * room it is reordered: onto another desk it takes that desk's slot (`key` is
 * that desk), onto the free spot it goes last (`key` is the room). Rested on
 * any desk it joins that desk's team (moving rooms first when needed), and a
 * grouped desk dropped on its own room's floor leaves its team.
 */
export type TownDropTarget = {
  key: string | null;
  label: string;
  /** bin: over the bin or a bus stop, where a drop puts it in the bin. */
  action?: "move" | "reorder" | "group" | "ungroup" | "bin";
};

/**
 * A room picked up by its name, its edge or its Move handle: it moves
 * anywhere in its own building. A stale room, one Spaces cannot open, or one
 * alone in its building stays where it is.
 */
export function townRoomDrag(
  roomKey: string,
  model: TownModel,
): TownDrag | null {
  const room = model.rooms.get(roomKey);
  if (!room || !room.canOpenInSpaces || room.stale) return null;
  if (
    ![...model.rooms.values()].some(
      (other) => other.key !== room.key && other.hostKey === room.hostKey,
    )
  )
    return null;
  return {
    kind: "room",
    key: room.key,
    hostKey: room.hostKey,
    from: room.key,
    label: t("town.dragMoveLabel", { name: room.displayLabel }),
  };
}

/**
 * What a held press picks up: a seated agent zoomed in, a desk from the
 * room-card zoom (overview) in, where desks are already finger-sized, or a
 * room by its edge.
 */
export function townDragFor(
  hit: TownHit | null,
  model: TownModel,
  level: TownLevel,
): TownDrag | null {
  if (!hit || level === "town") return null;
  if (hit.kind === "room")
    return hit.edge ? townRoomDrag(hit.key, model) : null;
  const zoomedIn = level === "room" || level === "desk";
  if (hit.kind === "agent") {
    if (!zoomedIn) return null;
    const agent = model.agents.get(hit.key);
    const seat = model.agentSeats.get(hit.key);
    if (!agent || !seat || !agent.canOpenInSpaces || agent.stale) return null;
    return {
      kind: "agent",
      key: agent.key,
      hostKey: agent.hostKey,
      from: seat.deskKey,
      label: t("town.dragMoveLabel", { name: agent.displayLabel }),
    };
  }
  const deskKey =
    hit.kind === "desk" ? hit.key : hit.kind === "pane" ? hit.deskKey : null;
  const desk = deskKey ? model.desks.get(deskKey) : undefined;
  // A pinned desk stays where it is until it is unpinned.
  if (!desk || !desk.canOpenInSpaces || model.deskPins.has(desk.key))
    return null;
  return {
    kind: "desk",
    key: desk.key,
    hostKey: desk.hostKey,
    from: desk.roomKey,
    label: t("town.dragMoveLabel", { name: desk.displayLabel }),
  };
}

/** How long a dragged desk rests on another desk before it snaps to it. */
export const TOWN_MAGNET_MS = 450;

/** The desk under a dragged desk, if it is one it could group with. */
export function townMagnetDesk(
  drag: TownDrag,
  hit: TownHit | null,
  model: TownModel,
): string | null {
  if (drag.kind !== "desk") return null;
  const key =
    hit?.kind === "desk"
      ? hit.key
      : hit?.kind === "pane"
        ? hit.deskKey
        : hit?.kind === "agent"
          ? model.agentSeats.get(hit.key)?.deskKey
          : undefined;
  return key && key !== drag.key && model.desks.has(key) ? key : null;
}

/**
 * Where a drag would land under the pointer, or why it can't. A desk dropped
 * at once on another desk reorders (same room) or moves (another room); held
 * still on it for TOWN_MAGNET_MS (`magnet`), it snaps to that desk and groups
 * with it, so moving, reordering and grouping stay separate gestures. A
 * carried room is aimed by townRoomDropTarget.
 */
export function townDropTarget(
  drag: TownDrag,
  hit: TownHit | null,
  model: TownModel,
  /** Each related desk's team (townTeams.ts). */
  deskTeams: ReadonlyMap<string, string> = new Map(),
  /** The desk the dragged desk has rested on long enough to snap to. */
  magnet: string | null = null,
  /** Desks in a manual group: only these can leave one. */
  groupedDesks: ReadonlySet<string> = new Set(),
): TownDropTarget {
  // A carried room is aimed by where it is, not what it is over.
  if (drag.kind === "room") return { key: null, label: drag.label };
  if (drag.kind === "desk") {
    const mate = magnet ? model.desks.get(magnet) : undefined;
    if (mate && magnet === townMagnetDesk(drag, hit, model)) {
      if (mate.hostKey !== drag.hostKey)
        return { key: null, label: t("town.dragGroupSameHost") };
      const team = deskTeams.get(mate.key);
      if (team && team === deskTeams.get(drag.key))
        return {
          key: null,
          label: t("town.dragAlreadyInTeam", { desk: drag.label }),
        };
      return {
        key: mate.key,
        label: t("town.dragGroupWith", { desk: mate.displayLabel }),
        action: "group",
      };
    }
    const roomKey =
      hit?.kind === "room"
        ? hit.key
        : hit?.kind === "cell"
          ? hit.roomKey
          : hit?.kind === "desk"
            ? model.desks.get(hit.key)?.roomKey
            : hit?.kind === "pane"
              ? model.desks.get(hit.deskKey)?.roomKey
              : hit?.kind === "agent"
                ? model.agents.get(hit.key)?.roomKey
                : undefined;
    const room = roomKey ? model.rooms.get(roomKey) : undefined;
    if (!room)
      return {
        key: null,
        label: t("town.dragDropOnRoom", { desk: drag.label }),
      };
    if (room.hostKey !== drag.hostKey)
      return { key: null, label: t("town.dragMoveSameHost") };
    if (room.key === drag.from) {
      const name =
        model.desks.get(drag.key)?.displayLabel ?? t("town.move.deskFallback");
      const ontoKey =
        hit?.kind === "desk"
          ? hit.key
          : hit?.kind === "pane"
            ? hit.deskKey
            : // Only a seated agent marks its desk's slot; one in the lounge,
              // the queue or walking is not where its desk is drawn.
              hit?.kind === "agent" && !hit.standing
              ? model.agentSeats.get(hit.key)?.deskKey
              : undefined;
      const onto = ontoKey ? model.desks.get(ontoKey) : undefined;
      if (onto && onto.key !== drag.key && model.deskPins.has(onto.key))
        return {
          key: null,
          label: t("town.dragDeskPinned", { desk: onto.displayLabel }),
        };
      if (onto && onto.key !== drag.key)
        return {
          key: onto.key,
          label: t("town.dragPutInPlace", {
            desk: name,
            onto: onto.displayLabel,
          }),
          action: "reorder",
        };
      // The free spot is the room's last drawn slot. In a room with more
      // tabs than it draws, that is the last drawn desk's place, so the desk
      // stays in view instead of joining the hidden ones.
      const lastDrawn = room.desks[room.desks.length - 1]?.key;
      if (hit?.kind === "cell" && lastDrawn && lastDrawn !== drag.key)
        return room.omittedDeskCount > 0
          ? {
              key: lastDrawn,
              label: t("town.dragPutLastOfShown", {
                desk: name,
                room: room.displayLabel,
              }),
              action: "reorder",
            }
          : {
              key: room.key,
              label: t("town.dragPutLast", {
                desk: name,
                room: room.displayLabel,
              }),
              action: "reorder",
            };
      if (hit?.kind === "room" && groupedDesks.has(drag.key))
        return {
          key: room.key,
          label: t("town.dragLeaveTeam"),
          action: "ungroup",
        };
      return {
        key: null,
        label: t("town.dragDropOnDeskToReorder", { desk: drag.label }),
      };
    }
    return {
      key: room.key,
      label: t("town.dragMoveTo", {
        desk: drag.label,
        room: room.displayLabel,
      }),
      action: "move",
    };
  }
  const deskKey =
    hit?.kind === "desk"
      ? hit.key
      : hit?.kind === "pane"
        ? hit.deskKey
        : hit?.kind === "agent"
          ? model.agentSeats.get(hit.key)?.deskKey
          : undefined;
  const desk = deskKey ? model.desks.get(deskKey) : undefined;
  if (!desk)
    return {
      key: null,
      label: t("town.dragDropOnDesk", { desk: drag.label }),
    };
  if (desk.hostKey !== drag.hostKey)
    return { key: null, label: t("town.dragAgentsMoveSameHost") };
  if (desk.key === drag.from)
    return {
      key: null,
      label: t("town.dragAlreadyAtDesk", { desk: drag.label }),
    };
  return {
    key: desk.key,
    label: t("town.dragMoveToDesk", {
      desk: drag.label,
      target: desk.displayLabel,
    }),
  };
}

/**
 * Where a carried room would land with its top-left at world point (x, y)
 * and the pointer at (px, py): anywhere in its own building, whole tiles,
 * kept inside the walls, with the other rooms moving out of its way
 * (townRoomPlacement). Over another host's building, or back on its own
 * spot, it goes back.
 */
export function townRoomDropTarget(
  drag: TownDrag,
  layout: TownLayout,
  model: TownModel,
  x: number,
  y: number,
  px: number,
  py: number,
): { target: TownDropTarget; placement: TownRoomPlacement | null } {
  const name =
    model.rooms.get(drag.key)?.displayLabel ?? t("town.roomFallback");
  const over = layout.buildings.find(
    (b) =>
      px >= b.x * TOWN_TILE &&
      px < (b.x + b.w) * TOWN_TILE &&
      py >= b.y * TOWN_TILE &&
      py < (b.y + b.h) * TOWN_TILE,
  );
  if (over && over.hostKey !== drag.hostKey)
    return {
      target: { key: null, label: t("town.dragRoomStayHost") },
      placement: null,
    };
  const spot = townRoomSpotAt(layout, drag.key, x / TOWN_TILE, y / TOWN_TILE);
  const placement = spot
    ? townRoomPlacement(layout, drag.hostKey, new Map([[drag.key, spot]]))
    : null;
  if (!placement?.changed)
    return {
      target: { key: null, label: t("town.dragMoveRoomHint", { room: name }) },
      placement: null,
    };
  return {
    target: {
      key: drag.key,
      label: t("town.dragMoveRoomHere", { room: name }),
      action: "move",
    },
    placement,
  };
}
