import { ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import { Fragment, memo, useMemo, useRef } from "react";
import { ColorSwatchButton } from "../../components/ColorSwatch";
import { useT } from "../../i18n";
import { agentContextFill, useContextUsage } from "../agentContextFill";
import { ConnectionRecoveryBanner } from "../ConnectionRecoveryBanner";
import { TOWN_DESK_EXPANSION_STEP } from "../herdrOfficeProjection";
import type { OfficeQualifiedTarget } from "../officeProjectionTypes";
import { TERMINAL_COLOR_HEX } from "../terminalColor";
import { AnswerDeliverySign } from "./AnswerDeliverySign";
import { DeskWorkBadge } from "./DeskWorkBadge";
import type { TownHud } from "./scene/townHud";
import { TownTargets } from "./TownAccessibleTargets";
import { TownAddRoom } from "./TownAddRoom";
import { TownBuildingSign } from "./TownBuildingSign";
import type { TownRoomActions } from "./TownCanvas";
import { TownDeskTitle } from "./TownDeskTitle";
import { TownCityBillboard, TownReceptionExpenses } from "./TownExpenseBoards";
import { TownFoldIndicators } from "./TownFoldIndicators";
import { TownFuelMark } from "./TownFuelMark";
import { TownPostOffice } from "./TownPostOffice";
import { portrait, ReceptionEntry } from "./TownReceptionEntry";
import { TownReceptionHeldTag, TownReceptionSign } from "./TownReceptionSign";
import {
  type TownPlaceCardContent,
  TownRoomOverviewSummary,
  TownRoomPlaque,
} from "./TownRoomPlaque";
import { TownStepBubble } from "./TownStepBubble";
import { TownTidyRooms } from "./TownTidyRooms";
import { TownTiredMark } from "./TownTiredMark";
import type { TownDeskBadge } from "./townBadges";
import {
  TOWN_RECEPTION_LIFT,
  type TownBoardPlacement,
} from "./townBoardPlacement";
import type { TownBuildingLayers } from "./townBuildingLayers";
import type { TownBuildingSigns } from "./townBuildingSigns";
import {
  type TownFoldedActivity,
  townFoldedActivityLabel,
} from "./townFoldedActivity";
import { TOWN_TILE as T, type TownLayout, townDeskSlots } from "./townLayout";
import { type TownModel, townAttention, townRoomCounts } from "./townModel";
import { townRoomCardMeta } from "./townNameplates";
import { townCarpetFor, townCarpetOf } from "./townPaint";
import { type TownQuestMark, TownQuestPennant } from "./townQuestPennant";
import { townReceptionBoard } from "./townReception";
import type { TownReceptionTakes } from "./townReceptionFilter";
import type { TownRendererHandle } from "./townRenderer";
import type { TownStepStore } from "./townStepStore";
import {
  type TownPlace,
  type TownSummary,
  townPlaceSummary,
} from "./townSummary";
import type { TownTarget } from "./townTargets";
import { type TownTeams, townWallPath } from "./townTeams";
import type { TownVisible } from "./townVisibleHosts";
import { useTownAges } from "./useTownHud";

const WALL_RADIUS = 10;

/** Team walls and connectors, under the world layer's cards. */
/**
 * Where a room's DOM press landed: its overview card, the name on that card,
 * the name on its plaque or its plaque's Move handle. A press on a name or
 * the handle can carry the room.
 */
export type TownRoomPress =
  | "card"
  | "card-name"
  | "plaque-name"
  | "plaque-move";

/** A room card's or name's press, passed to the town beneath it. */
export type TownRoomCardPress = (
  event: PointerEvent,
  roomKey: string,
  press: TownRoomPress,
) => boolean;

export const TownTeamsLayer = memo(function TownTeamsLayer({
  teams,
}: {
  teams: TownTeams;
}) {
  if (!teams.walls.length && !teams.links.length) return null;
  return (
    <svg className="town-teams" aria-hidden="true" data-testid="town-teams">
      {teams.walls.map((wall) => {
        const shared = {
          className: "town-team-wall",
          "data-team": wall.team,
          "data-current": String(wall.current),
          "data-desks": wall.desks,
          style: { stroke: TERMINAL_COLOR_HEX[wall.color] },
        };
        return wall.outline ? (
          <path
            key={wall.key}
            {...shared}
            data-shape="outline"
            d={townWallPath(wall.outline, WALL_RADIUS)}
          />
        ) : (
          <rect
            key={wall.key}
            {...shared}
            x={wall.x}
            y={wall.y}
            width={wall.w}
            height={wall.h}
            rx={WALL_RADIUS}
          />
        );
      })}
      {teams.links.map((link) => (
        <line
          key={link.key}
          className="town-team-link"
          data-kind={link.kind}
          data-current={String(link.current)}
          x1={link.x1}
          y1={link.y1}
          x2={link.x2}
          y2={link.y2}
        />
      ))}
    </svg>
  );
});
export const TownWorldLayer = memo(function TownWorldLayer({
  hud,
  model,
  foldedActivity,
  askingKeys,
  receptionHeldKeys,
  receptionTakes,
  onFindHeld,
  onActivateAsk,
  layout,
  selectedKey,
  blockedSince,
  roomActions,
  selectedRoomKey,
  onSelect,
  onActivate,
  onActivateRoom,
  onRoomCardPress,
  onFocusTarget,
  visible,
  onHoverEntry,
  targets,
  deskBadges,
  quests,
  steps,
  renderer,
  pennants,
  signs,
  layers,
  boards,
  summary,
  openDeskKey,
  openReceptionKey,
  openRoomKey,
}: {
  /** The HUD store: the ages clock. */
  hud: TownHud;
  /** The Town summary; room and table cards show their part of it. */
  summary: TownSummary;
  /** The table under the mouse, or tapped, on the canvas: its card is open. */
  openDeskKey: string | null;
  /** The building whose hidden (desk level) reception board a tap brought back. */
  openReceptionKey: string | null;
  /** The room under the mouse on the canvas: zoomed out, its card is open. */
  openRoomKey: string | null;
  signs: TownBuildingSigns;
  /** Moves each building's layer with its building (townBuildingLayers.ts). */
  layers: TownBuildingLayers;
  /** Keeps the reception boards and the billboard off what they'd cover. */
  boards: TownBoardPlacement;
  model: TownModel;
  askingKeys: ReadonlySet<string>;
  /** Agents the reception filter keeps at their desks (townReceptionFilter). */
  receptionHeldKeys: ReadonlySet<string>;
  /** The marks each building's reception takes. */
  receptionTakes: TownReceptionTakes;
  /** Find the agents a reception's filter keeps at their desks. */
  onFindHeld?: (
    keys: readonly string[],
    anchor: { x: number; y: number },
  ) => void;
  onActivateAsk?: (nodeId: string) => void;
  foldedActivity: ReadonlyMap<string, TownFoldedActivity>;
  layout: TownLayout;
  visible: TownVisible;
  /** Accessible targets from the scene model (townTargets). */
  targets: readonly TownTarget[];
  /** Pull request or ticket chips for desks (World sources). */
  deskBadges: ReadonlyMap<string, TownDeskBadge>;
  /** Quests by agent key, as pennants at their seats. */
  quests: ReadonlyMap<string, TownQuestMark>;
  /** Working agents' current steps, as thought bubbles at their seats. */
  steps?: TownStepStore;
  /** Tells a pennant whether its agent is seated. */
  renderer: { readonly current: TownRendererHandle | null };
  pennants: Set<HTMLElement>;
  onHoverEntry(key: string | null, rect?: DOMRect): void;
  selectedKey: string | null;
  blockedSince: ReadonlyMap<string, number>;
  roomActions: TownRoomActions;
  selectedRoomKey: string | null;
  onSelect(key: string): void;
  onActivate(key: string): void;
  onActivateRoom(key: string): void;
  /**
   * A press on a room card or a room's name, passed to the town beneath: a
   * hold over a desk lifts it, a drag or hold on a name carries the room, a
   * tap on a card zooms the room. False when the town cannot take it.
   */
  onRoomCardPress?: TownRoomCardPress;
  onFocusTarget(target: TownTarget): void;
}) {
  // A card press the town took ends as the town's tap; only keyboard
  // activation (or an untaken press) zooms through the card's own click.
  const t = useT();
  const cardPressTaken = useRef(false);
  // Context fills, for a tired look at nearly full agents' seats.
  const usage = useContextUsage(true);
  const terminalAsksByHost = useMemo(() => {
    type Device = (typeof model.projection.paneRoster)[number]["device"];
    const byHost = new Map<string, Device[]>();
    if (!askingKeys.size) return byHost;
    for (const { device } of model.projection.paneRoster) {
      if (device.agentKey || !askingKeys.has(device.nodeId)) continue;
      const group = byHost.get(device.hostKey) ?? [];
      group.push(device);
      byHost.set(device.hostKey, group);
    }
    return byHost;
  }, [model.projection.paneRoster, askingKeys]);
  const attention = townAttention(model, blockedSince, askingKeys);
  // Waiting ages move on every 15 s while anyone waits (scene/townHud.ts).
  const now = useTownAges(hud, attention.length > 0);
  const selectedHost = selectedRoomKey
    ? model.rooms.get(selectedRoomKey)?.hostKey
    : undefined;
  /** A room's carpet: its workspace's chosen colour, else its own default. */
  const roomCarpet = (roomKey: string) => {
    const chosen = model.placeColors.rooms.get(roomKey);
    return chosen
      ? townCarpetOf(TERMINAL_COLOR_HEX[chosen])
      : townCarpetFor(roomKey);
  };
  /**
   * A room's or table's card: its part of the summary, made on first open,
   * and the usage of its Herdr workspace or tab.
   */
  const placeCard = (
    place: TownPlace,
    target: OfficeQualifiedTarget,
  ): TownPlaceCardContent => ({
    summary: () => townPlaceSummary(summary, model.projection, place),
    usage: { kind: place.kind, target },
  });
  const folded = layout.formFactor === "narrow";
  /** A host's room by its workspace, for its reception's expenses. */
  const roomLabel =
    (hostKey: string) => (workspaceId: string, generation: number) => {
      for (const room of model.rooms.values())
        if (
          room.hostKey === hostKey &&
          room.workspaceRef.nativeId === workspaceId &&
          room.workspaceRef.generation === generation
        )
          return room.accessibleLabel ?? room.displayLabel;
      return null;
    };
  return (
    <>
      <TownCityBillboard
        center={layout.center}
        folded={folded}
        boardRef={boards.cityRef}
      />
      <TownPostOffice layout={layout} renderer={renderer} />
      {layout.buildings.map((building) => {
        if (!visible.hosts.has(building.hostKey)) return null;
        const host = model.hosts.get(building.hostKey);
        const hostColor = roomActions.placeColor("host", building.hostKey);
        const queue = attention.filter(
          (agent) =>
            agent.hostKey === building.hostKey &&
            agent.semanticStatus === "blocked",
        );
        const questions = attention.filter(
          (agent) =>
            agent.hostKey === building.hostKey &&
            askingKeys.has(agent.key) &&
            agent.semanticStatus !== "blocked",
        );
        const terminalQuestions =
          terminalAsksByHost.get(building.hostKey) ?? [];
        const questionCount = questions.length + terminalQuestions.length;
        // The filter moves bodies, not facts: the counts above stay whole,
        // and only the agents this reception takes wait in it.
        const {
          visitors,
          kept: held,
          keptCounts: heldCounts,
        } = townReceptionBoard(
          building.hostKey,
          attention,
          terminalQuestions,
          askingKeys,
          receptionHeldKeys,
          receptionTakes(building.hostKey),
        );
        const shown = visitors.slice(0, 6);
        const counts = building.rooms.reduce(
          (sum, placed) => {
            const room = model.rooms.get(placed.key);
            if (!room) return sum;
            const c = townRoomCounts(model, room);
            return {
              rooms: sum.rooms + 1,
              desks: sum.desks + c.desks,
              working: sum.working + c.working,
            };
          },
          { rooms: 0, desks: 0, working: 0 },
        );
        return (
          <div
            key={building.hostKey}
            ref={layers.ref(building.hostKey)}
            className="town-building-layer"
            data-stale={host?.stale || undefined}
          >
            <TownBuildingSign
              hostKey={building.hostKey}
              signs={signs}
              left={(building.x + building.w / 2) * T}
              top={(building.y + building.h * 0.38) * T}
            >
              <strong>{host?.displayLabel ?? building.hostKey}</strong>
              {host?.stale ? (
                <ConnectionRecoveryBanner
                  connectionId={host.connectionId}
                  label={host.displayLabel}
                  state={host.runtimeState}
                />
              ) : (
                <span>
                  {t("town.roomCounts", {
                    rooms: counts.rooms,
                    desks: counts.desks,
                    working: counts.working,
                  })}
                </span>
              )}
              <TownTidyRooms
                hostKey={building.hostKey}
                hostLabel={host?.displayLabel}
                roomActions={roomActions}
                named
              />
              <div className="town-reception-tags">
                {queue.length ? (
                  <em
                    aria-label={t("town.needYouAria", { count: queue.length })}
                  >
                    !{queue.length}
                  </em>
                ) : null}
                {questionCount ? (
                  <em
                    className="town-reception-question"
                    aria-label={t("town.ownerQuestionsAria", {
                      count: questionCount,
                    })}
                  >
                    ?{questionCount}
                  </em>
                ) : null}
                {host ? (
                  <AnswerDeliverySign connectionId={host.connectionId} />
                ) : null}
              </div>
            </TownBuildingSign>
            <div
              ref={boards.receptionRef(building.hostKey)}
              className={`town-reception${queue.length ? " town-reception-busy" : ""}`}
              data-stale={host?.stale || undefined}
              data-open={building.hostKey === openReceptionKey || undefined}
              style={{
                // The board stands in the yard above the front door, moved
                // off the town center and other boards (townBoardPlacement).
                left: (building.entryX + 0.5) * T,
                top: building.y * T - TOWN_RECEPTION_LIFT,
              }}
              role="group"
              aria-label={t("town.receptionAria", {
                host: host?.displayLabel ?? t("town.hostFallback"),
                count: queue.length,
              })}
            >
              <div className="town-reception-title">
                {hostColor ? (
                  <ColorSwatchButton
                    className="town-place-color"
                    label={t("town.buildingColourAria", {
                      host: host?.displayLabel ?? t("town.hostFallbackLower"),
                    })}
                    {...hostColor}
                  />
                ) : null}
                <span>
                  {(host?.displayLabel ?? "").toUpperCase()}{" "}
                  {t("town.receptionLabel")}
                </span>
                {queue.length ? <b>{queue.length}</b> : null}
                <TownTidyRooms
                  hostKey={building.hostKey}
                  hostLabel={host?.displayLabel}
                  roomActions={roomActions}
                />
                {host && folded ? (
                  <TownReceptionExpenses
                    connectionId={host.connectionId}
                    hostLabel={host.displayLabel}
                    roomLabel={roomLabel(building.hostKey)}
                    folded
                  />
                ) : null}
                {host ? (
                  <TownReceptionSign
                    connectionId={host.connectionId}
                    hostLabel={host.displayLabel}
                  />
                ) : null}
              </div>
              {host?.stale ? (
                <ConnectionRecoveryBanner
                  connectionId={host.connectionId}
                  label={host.displayLabel}
                  state={host.runtimeState}
                />
              ) : null}
              {visitors.length ? (
                <div className="town-reception-queue">
                  {shown.map((agent) =>
                    "semanticStatus" in agent ? (
                      <ReceptionEntry
                        key={agent.key}
                        agent={agent}
                        room={model.rooms.get(agent.roomKey)?.displayLabel}
                        desk={
                          agent.deskKey
                            ? model.desks.get(agent.deskKey)?.displayLabel
                            : undefined
                        }
                        asking={askingKeys.has(agent.key)}
                        since={blockedSince.get(agent.key) ?? now}
                        now={now}
                        selected={selectedKey === agent.key}
                        onSelect={onSelect}
                        onActivate={onActivate}
                        onHoverEntry={onHoverEntry}
                      />
                    ) : (
                      <button
                        key={agent.key}
                        type="button"
                        className="town-reception-entry"
                        data-owner-question="true"
                        data-owner-question-terminal={agent.nodeId}
                        aria-label={t("town.ownerQuestionAria", {
                          name: agent.displayLabel,
                        })}
                        disabled={agent.stale || !agent.canOpenInSpaces}
                        onClick={() => onActivateAsk?.(agent.nodeId)}
                      >
                        <img
                          src={portrait(agent.key)}
                          alt=""
                          width={28}
                          height={40}
                        />
                        <span>{agent.displayLabel}</span>
                        <small>{t("town.ownerWantedPrefix")}</small>
                      </button>
                    ),
                  )}
                  {visitors.length > shown.length ? (
                    <span className="town-reception-more">
                      +{visitors.length - shown.length}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="town-reception-empty">
                  {t("town.nobodyWaitingShort")}
                </div>
              )}
              <TownReceptionHeldTag
                counts={heldCounts}
                onFind={
                  held.length && onFindHeld
                    ? (anchor) =>
                        onFindHeld(
                          held.map((agent) => agent.key),
                          anchor,
                        )
                    : null
                }
              />
              {host && !folded ? (
                <TownReceptionExpenses
                  connectionId={host.connectionId}
                  hostLabel={host.displayLabel}
                  roomLabel={roomLabel(building.hostKey)}
                  folded={false}
                />
              ) : null}
            </div>
            {building.rooms.map((placed) => {
              const room = model.rooms.get(placed.key);
              if (!room) return null;
              const c = townRoomCounts(model, room);
              const label = room.accessibleLabel ?? room.displayLabel;
              const total = Math.max(1, c.agents);
              const seatCell =
                placed.foldActionCells?.[0] ??
                placed.cells.find((cell) => !cell.deskKey);
              const foldCell = placed.foldActionCells?.[1];
              const overflow =
                room.omittedDeskCount + placed.overflowDeskKeys.length;
              const revealCount = Math.min(TOWN_DESK_EXPANSION_STEP, overflow);
              const activity = foldedActivity.get(room.key);
              const activityLabel = townFoldedActivityLabel(activity);
              const partiallyExpanded =
                room.deskFold === "expanded" && overflow > 0;
              const revealDescription =
                overflow > TOWN_DESK_EXPANSION_STEP
                  ? revealCount === 1
                    ? t("town.showHiddenDesk", { count: revealCount })
                    : t("town.showHiddenDesks", { count: revealCount })
                  : overflow === 1
                    ? t("town.showRemainingDesk", { count: overflow })
                    : t("town.showRemainingDesks", { count: overflow });
              const reason = roomActions.createSeatReason(room.key);
              const roomColor = roomActions.placeColor("room", room.key);
              const add =
                roomActions.showCreateSeat(room.key) && seatCell ? (
                  <button
                    className="world-new-seat-canvas-action town-new-seat"
                    type="button"
                    aria-label={t("town.newAgentOrTerminal", { name: label })}
                    title={
                      reason ?? t("town.newAgentOrTerminal", { name: label })
                    }
                    disabled={!roomActions.canCreateSeat(room.key)}
                    style={
                      partiallyExpanded
                        ? undefined
                        : {
                            left: (seatCell.x - placed.x + 1) * T,
                            top: (seatCell.y - placed.y) * T + 4,
                          }
                    }
                    onClick={() => roomActions.onNewAgent(room.key)}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                ) : null;
              const toggle =
                room.deskFold &&
                foldCell &&
                roomActions.onToggleFold &&
                (room.deskFold === "expanded" || overflow > 0) ? (
                  <button
                    className="town-new-seat town-fold-tile"
                    type="button"
                    aria-expanded={room.deskFold === "expanded"}
                    aria-label={
                      overflow > 0
                        ? t("town.revealInRoom", {
                            description: revealDescription,
                            name: label,
                          }) +
                          (activityLabel
                            ? t("town.revealActivity", {
                                activity: activityLabel,
                              })
                            : "")
                        : t("town.foldRoomNamed", { name: label })
                    }
                    title={
                      overflow > 0
                        ? revealDescription +
                          (activityLabel
                            ? t("town.revealActivity", {
                                activity: activityLabel,
                              })
                            : "")
                        : t("town.foldRoom")
                    }
                    style={{
                      ...(partiallyExpanded && seatCell
                        ? {}
                        : {
                            left: (foldCell.x - placed.x + 1) * T,
                            top: (foldCell.y - placed.y) * T + 4,
                            width: 72,
                          }),
                      display: "flex",
                      justifyContent: "center",
                      gap: 3,
                    }}
                    onClick={() =>
                      roomActions.onToggleFold?.(
                        room.key,
                        overflow > 0
                          ? Math.min(
                              room.observedDeskCount,
                              room.desks.length + TOWN_DESK_EXPANSION_STEP,
                            )
                          : undefined,
                      )
                    }
                  >
                    {overflow > 0 ? (
                      <>
                        <ChevronsRight size={16} aria-hidden="true" />
                        <span>+{overflow}</span>
                      </>
                    ) : (
                      <>
                        <ChevronsLeft size={16} aria-hidden="true" />
                        <span>{t("town.foldLabel")}</span>
                      </>
                    )}
                    <TownFoldIndicators activity={activity} />
                  </button>
                ) : null;
              return (
                <div
                  key={room.key}
                  className="town-room"
                  style={{
                    left: placed.x * T,
                    top: placed.y * T,
                    width: placed.w * T,
                    height: placed.h * T,
                  }}
                >
                  {visible.cards ? (
                    <TownRoomOverviewSummary
                      card={placeCard(
                        { kind: "room", key: room.key },
                        room.workspaceRef,
                      )}
                      open={room.key === openRoomKey}
                    >
                      <button
                        type="button"
                        className={`town-room-card${c.blocked ? " town-room-card-waiting" : ""}${selectedKey === room.key ? " town-selected" : ""}`}
                        style={
                          {
                            "--room-w": `${placed.w * T}px`,
                            "--carpet": roomCarpet(room.key),
                            // Presses pass to the town: a pan, or a hold that
                            // lifts the table beneath.
                            touchAction: "none",
                          } as React.CSSProperties
                        }
                        aria-label={t("town.roomCardAria", {
                          name: label,
                          desks: c.desks,
                          working: c.working,
                          blocked: c.blocked
                            ? t("town.roomCardBlocked", { count: c.blocked })
                            : "",
                          done: c.done
                            ? t("town.roomCardDone", { count: c.done })
                            : "",
                        })}
                        onPointerDown={(event) => {
                          cardPressTaken.current =
                            onRoomCardPress?.(
                              event.nativeEvent,
                              room.key,
                              (event.target as Element).closest?.(
                                ".town-room-card-name",
                              )
                                ? "card-name"
                                : "card",
                            ) ?? false;
                        }}
                        onClick={(event) => {
                          const taken =
                            cardPressTaken.current && event.detail > 0;
                          cardPressTaken.current = false;
                          if (!taken) onActivateRoom(room.key);
                        }}
                        tabIndex={-1}
                      >
                        <span className="town-room-card-name">{label}</span>
                        {c.blocked ? (
                          <span className="town-room-card-badge">
                            !{c.blocked}
                          </span>
                        ) : null}
                        <span className="town-room-card-meta">
                          {townRoomCardMeta(c, overflow)}
                        </span>
                        <span className="town-room-card-bar" aria-hidden="true">
                          {(
                            ["working", "blocked", "done", "idle"] as const
                          ).map((status) =>
                            c[status] ? (
                              <i
                                key={status}
                                data-status={status}
                                style={{ flexGrow: c[status] / total }}
                              />
                            ) : null,
                          )}
                        </span>
                      </button>
                    </TownRoomOverviewSummary>
                  ) : null}
                  {visible.tagRooms.has(room.key)
                    ? placed.cells.map((cell) => {
                        const desk = cell.deskKey
                          ? model.desks.get(cell.deskKey)
                          : undefined;
                        if (!desk) return null;
                        return (
                          <div
                            key={desk.key}
                            className="town-desk-tags"
                            style={
                              {
                                left: (cell.x + 1 - placed.x) * T,
                                top: (cell.y - placed.y) * T,
                                "--desk-color":
                                  TERMINAL_COLOR_HEX[
                                    model.deskColors.get(desk.key) ?? "blue"
                                  ],
                              } as React.CSSProperties
                            }
                          >
                            {desk.appearanceStatus ? (
                              <span
                                className="town-appearance-status"
                                title={desk.appearanceStatus}
                              >
                                {desk.appearanceStatus}
                              </span>
                            ) : null}
                            <TownDeskTitle
                              deskKey={desk.key}
                              label={desk.displayLabel}
                              card={placeCard(
                                { kind: "desk", key: desk.key },
                                desk.tabRef,
                              )}
                              open={desk.key === openDeskKey}
                              onSelect={onSelect}
                              onActivate={onActivate}
                            >
                              <span
                                className="town-desk-name"
                                aria-hidden="true"
                              >
                                {desk.displayLabel}
                              </span>
                              <DeskWorkBadge
                                badge={deskBadges.get(desk.key)}
                                deskLabel={desk.displayLabel}
                              />
                            </TownDeskTitle>
                            {desk.observedPaneCount >
                            desk.paneDevices.length ? (
                              <button
                                type="button"
                                className="town-desk-more"
                                aria-label={t("town.allPanesAria", {
                                  count: desk.observedPaneCount,
                                  name: desk.displayLabel,
                                })}
                                onClick={() =>
                                  roomActions.onChoosePanes(desk.key)
                                }
                              >
                                +
                                {desk.observedPaneCount -
                                  desk.paneDevices.length}
                              </button>
                            ) : null}
                            {townDeskSlots(cell.seats).map((slot, seat) => {
                              const device = desk.paneDevices[seat];
                              const quest = device?.agentKey
                                ? quests.get(device.agentKey)
                                : undefined;
                              const fill =
                                device?.agentKey && !device.stale
                                  ? agentContextFill(usage, {
                                      connectionId: device.paneRef.connectionId,
                                      generation: device.paneRef.generation,
                                      paneId: device.paneRef.nativeId,
                                    })
                                  : null;
                              const usageStop = device?.agentKey
                                ? model.agents.get(device.agentKey)?.usageStop
                                : undefined;
                              return device ? (
                                <Fragment key={device.key}>
                                  <span
                                    aria-hidden="true"
                                    className={`town-seat-tag${slot.top ? " town-seat-tag-top" : ""}${device.agentKey ? "" : " town-seat-tag-shell"}`}
                                    style={{ left: slot.chairX + 7 }}
                                  >
                                    {device.displayLabel}
                                  </span>
                                  {steps &&
                                  device.agentKey &&
                                  !askingKeys.has(device.agentKey) &&
                                  model.agents.get(device.agentKey)
                                    ?.semanticStatus === "working" ? (
                                    <TownStepBubble
                                      steps={steps}
                                      hud={hud}
                                      agentKey={device.agentKey}
                                      top={slot.top}
                                      x={slot.chairX + 7}
                                      selected={
                                        selectedKey === device.agentKey ||
                                        selectedKey === desk.key
                                      }
                                      renderer={renderer}
                                      pennants={pennants}
                                    />
                                  ) : null}
                                  {usageStop ? (
                                    <TownFuelMark
                                      stop={usageStop}
                                      agentKey={device.agentKey!}
                                      top={slot.top}
                                      x={slot.chairX + 7}
                                      renderer={renderer}
                                      pennants={pennants}
                                    />
                                  ) : null}
                                  {quest ? (
                                    <TownQuestPennant
                                      quest={quest}
                                      agentKey={device.agentKey!}
                                      agentLabel={device.displayLabel}
                                      renderer={renderer}
                                      pennants={pennants}
                                      top={slot.top}
                                      x={slot.chairX + 7}
                                    />
                                  ) : null}
                                  {fill?.tired ? (
                                    <TownTiredMark
                                      fill={fill}
                                      agentKey={device.agentKey!}
                                      agentLabel={device.displayLabel}
                                      renderer={renderer}
                                      marks={pennants}
                                      top={slot.top}
                                      x={slot.chairX + 7}
                                    />
                                  ) : null}
                                </Fragment>
                              ) : null;
                            })}
                          </div>
                        );
                      })
                    : null}
                  <TownRoomPlaque
                    room={room}
                    label={label}
                    width={placed.w * T}
                    counts={c}
                    color={
                      roomColor && {
                        defaultHex: townCarpetFor(room.key),
                        ...roomColor,
                      }
                    }
                    actions={roomActions}
                    card={placeCard(
                      { kind: "room", key: room.key },
                      room.workspaceRef,
                    )}
                    onNamePress={(event, press) =>
                      onRoomCardPress?.(event, room.key, press) ?? false
                    }
                  />
                  {partiallyExpanded && seatCell ? (
                    // Add, Expand and Fold in one row whose right end
                    // stays put; zoomed out, it grows left so each tile
                    // keeps a 40px touch target (town.css).
                    <div
                      className="town-room-actions"
                      style={{
                        left: (seatCell.x - placed.x + 1) * T + 152,
                        top: (seatCell.y - placed.y) * T + 4,
                      }}
                    >
                      {add}
                      {toggle}
                      {roomActions.onToggleFold ? (
                        <button
                          className="town-new-seat town-fold-reset"
                          type="button"
                          aria-label={t("town.foldRoomNamed", { name: label })}
                          title={t("town.foldRoom")}
                          onClick={() => roomActions.onToggleFold?.(room.key)}
                        >
                          <ChevronsLeft size={18} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {add}
                      {toggle}
                    </>
                  )}
                  {add && reason && seatCell ? (
                    <span
                      className="world-creation-reason town-creation-reason"
                      role="status"
                      style={{
                        left: (seatCell.x - placed.x + 1) * T,
                        top: (seatCell.y - placed.y) * T + 60,
                      }}
                    >
                      {reason}
                    </span>
                  ) : null}
                </div>
              );
            })}
            <TownAddRoom
              building={building}
              hostLabel={host?.displayLabel ?? t("town.hostFallbackLower")}
              roomActions={roomActions}
              selectedRoomKey={
                selectedHost === building.hostKey ? selectedRoomKey : null
              }
            />
          </div>
        );
      })}
      <TownTargets
        targets={targets}
        selectedKey={selectedKey}
        onSelect={onSelect}
        onActivate={onActivate}
        onActivateRoom={onActivateRoom}
        onFocusTarget={onFocusTarget}
        onMoveTarget={(kind, key) =>
          kind === "desk"
            ? roomActions.onMoveDesk(key)
            : roomActions.onMoveAgent(key)
        }
      />
    </>
  );
});
