import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UsageLimit } from "../../../../shared/usage";
import { useT } from "../../i18n";
import type { TranslationKey } from "../../i18n/en";
import { GroupsSummary } from "../groups/GroupsSummary";
import type { HerdrOfficeProjection } from "../herdrOfficeProjection";
import {
  formatOfficeCost,
  formatOfficeModelName,
  type OfficeObservability,
} from "../officeObservability";
import { WorldPanel } from "../windows/WorldPanel";
import { useAnswerDeliveryCounts } from "../worldAnswerDeliveries";
import { sharedAsksStore, useWorldAsks } from "../worldAsks";
import type { WorldObject } from "../worldObject";
import { ConnectedAnswerDeliveries } from "./AnswerDeliveries";
import { answerRecipientView } from "./answerOutbox";
import {
  TownAsk,
  type TownAskActions,
  type TownCall,
  townLocation,
} from "./TownRail";
import { TownSinceYouLeft } from "./TownSinceYouLeft";
import { townAskers } from "./townAskers";
import {
  townFuelGauge,
  townHarnessName,
  townLimits,
  townReachedText,
  townResetTime,
  townSeenAge,
} from "./townLimits";
import {
  type TownUsageState,
  townUsageStore,
  useTownUsage,
} from "./townPlaceUsage";
import {
  type TownSummaryCounts,
  type TownSummaryItem,
  type TownSummary as TownSummaryModel,
  townSummary,
  townSummaryAge,
  townSummaryAgeShort,
} from "./townSummary";
import "./townSummaryPanel.css";

/**
 * The Town summary's body, in attention order: who needs you, recent
 * finishes, hosts and their rooms, Pods, and spend. It renders the shared read
 * model (townSummary.ts); the window around it is the shared panel frame.
 */
export function TownSummaryPanel({
  summary,
  now,
  onOpenAgent,
  onShowRoom,
  askActions,
  groups,
  deliveries,
  usage,
}: {
  summary: TownSummaryModel;
  now: number;
  /** Harness usage, whose `limits` each host lists; omitted, none show. */
  usage?: TownUsageState;
  /** Open the agent's conversation, as reception does. */
  onOpenAgent(agentKey: string): void;
  /** Move the Town camera to a room. */
  onShowRoom(roomKey: string): void;
  askActions: TownAskActions;
  groups?: ReactNode;
  deliveries?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="town-summary">
      <section aria-labelledby="town-summary-needs">
        <h3 id="town-summary-needs">
          {t("town.needsYouAction")} <span>{summary.counts.needsYou}</span>
        </h3>
        {summary.asks.length > 0 ? (
          <div className="town-asks">
            {summary.asks.map((ask) => (
              <TownAsk key={ask.id} ask={ask} now={now} actions={askActions} />
            ))}
          </div>
        ) : null}
        {summary.needsYou.length ? (
          <ul>
            {summary.needsYou.map((item) => (
              <SummaryItem
                key={item.agent.key}
                item={item}
                detail={
                  townSummaryAge(item.since, now) === t("town.ageJustNow")
                    ? t("town.waitingUnderAMinute")
                    : t("town.waitingFor", {
                        age: townSummaryAgeShort(item.since, now),
                      })
                }
                action={t("town.answerAction")}
                onOpen={onOpenAgent}
              />
            ))}
          </ul>
        ) : summary.asks.length ? null : (
          <p className="town-summary-empty">{t("town.nobodyWaiting")}</p>
        )}
      </section>
      {deliveries}
      <section aria-labelledby="town-summary-finished">
        <h3 id="town-summary-finished">
          {t("town.doneNotReviewed")} <span>{summary.counts.finished}</span>
        </h3>
        {summary.finished.length ? (
          <ul>
            {summary.finished.map((item) => (
              <SummaryItem
                key={item.agent.key}
                item={item}
                // Herdr reports the session's last activity, not the moment
                // it finished, so the age says so.
                detail={
                  item.since === null
                    ? t("town.doneAt")
                    : t("town.lastActive", {
                        age: townSummaryAge(item.since, now),
                      })
                }
                action={t("town.open")}
                onOpen={onOpenAgent}
              />
            ))}
          </ul>
        ) : (
          <p className="town-summary-empty">{t("town.nothingFinished")}</p>
        )}
      </section>
      <section aria-labelledby="town-summary-hosts">
        <h3 id="town-summary-hosts">{t("town.hostsAndRooms")}</h3>
        <div className="town-summary-hosts">
          {summary.hosts.map((host) => (
            <div key={host.key} className="town-summary-host">
              <div className="town-summary-host-name">
                <strong>{host.label}</strong>
                {host.stale ? <small>{t("town.offlineStale")}</small> : null}
                <Counts counts={host.counts} />
              </div>
              {usage ? (
                <HostLimits
                  connectionId={host.connectionId}
                  usage={usage}
                  now={now}
                />
              ) : null}
              {host.rooms.map((room) => (
                <button
                  key={room.key}
                  type="button"
                  className="town-summary-room"
                  aria-label={t("town.showRoomAria", { name: room.label })}
                  onClick={() => onShowRoom(room.key)}
                >
                  <span>{room.label}</span>
                  <Counts counts={room.counts} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
      {groups}
      <section aria-labelledby="town-summary-spend">
        <h3 id="town-summary-spend">{t("town.spend")}</h3>
        {summary.spend.available ? (
          <>
            <p className="town-summary-spend-total">
              {formatOfficeCost(summary.spend.totalUsd)}
            </p>
            <ul className="town-summary-models">
              {summary.spend.models.map((model) => (
                <li key={model.model}>
                  <span>{formatOfficeModelName(model.model)}</span>
                  <b>{formatOfficeCost(model.costUsd)}</b>
                </li>
              ))}
            </ul>
            <p className="town-summary-provenance">
              {t("town.fromProvider", {
                provider: summary.spend.providerId ?? "metrics",
                age: townSummaryAge(summary.spend.observedAt, now),
              })}
            </p>
          </>
        ) : (
          <p className="town-summary-empty">{t("town.noCostData")}</p>
        )}
      </section>
    </div>
  );
}

/**
 * A host's subscription limits: each harness's windows with the percent used,
 * when each resets, where the numbers came from and how old they are. Stale
 * and missing numbers say so; a harness without a source says why.
 */
export function HostLimits({
  connectionId,
  usage,
  now,
}: {
  connectionId: string;
  usage: TownUsageState;
  now: number;
}) {
  const t = useT();
  if (usage.status !== "ready")
    return (
      <p className="town-summary-limits-note">
        {usage.status === "failed"
          ? t("town.limitsUnavailable")
          : t("town.readingLimits")}
      </p>
    );
  const limits = townLimits(usage).filter(
    (limit) => limit.connection_id === connectionId,
  );
  if (!limits.length) return null;
  return (
    <ul
      className="town-summary-limits"
      aria-label={t("town.subscriptionLimits")}
    >
      {limits.map((limit) => (
        <HostLimit key={limit.harness} limit={limit} now={now} />
      ))}
    </ul>
  );
}

function HostLimit({ limit, now }: { limit: UsageLimit; now: number }) {
  const t = useT();
  const name = townHarnessName(limit.harness);
  const gauge = townFuelGauge(limit, now);
  if (!gauge)
    return (
      <li data-state={limit.state}>
        <span>{name}</span>
        <small>
          {limit.state === "unsupported"
            ? t("town.limitsNotAvailable", {
                reason: limit.reason ?? t("town.noSource"),
              })
            : t("town.limitsMissing")}
        </small>
      </li>
    );
  return (
    <li data-state={gauge.stale ? "stale" : "available"}>
      <span>
        {name}
        {gauge.stale ? <em>{t("town.staleSuffix")}</em> : null}
      </span>
      {gauge.windows.map((w) => (
        <small key={w.label} data-low={!gauge.stale && w.low}>
          {w.reached
            ? townReachedText(w)
            : `${t("town.windowUsage", { label: w.label, used: w.used })}${
                !gauge.stale && w.low ? t("town.windowUsageLow") : ""
              }`}{" "}
          ·{" "}
          {w.resetsAt === null
            ? t("town.resetUnknown")
            : t("town.resetsAt", { time: townResetTime(w.resetsAt) })}
        </small>
      ))}
      <small>
        {gauge.source}{" "}
        {t("town.seenAt", { age: townSeenAge(gauge.observedAt, now) })}
      </small>
    </li>
  );
}

function SummaryItem({
  item,
  detail,
  action,
  onOpen,
}: {
  item: TownSummaryItem;
  detail: string;
  action: string;
  onOpen(agentKey: string): void;
}) {
  const t = useT();
  return (
    <li className="town-summary-item">
      <div>
        <strong>
          {item.agent.displayLabel}
          {item.agent.semanticStatus === "blocked"
            ? ` ${t("town.blockedLabel", {
                label:
                  item.agent.stateLabels.blocked?.trim() ||
                  t("town.needsYouFallback"),
              })}`
            : ""}
        </strong>
        <small>
          {townLocation(item)} · {detail}
        </small>
      </div>
      <button
        type="button"
        aria-label={t("town.summaryItemAria", {
          action,
          name: item.agent.displayLabel,
        })}
        onClick={() => onOpen(item.agent.key)}
      >
        {action}
      </button>
    </li>
  );
}

const COUNT_LABELS: [keyof TownSummaryCounts, TranslationKey][] = [
  ["needsYou", "town.counts.needYou"],
  ["working", "town.counts.working"],
  ["finished", "town.counts.done"],
  ["quiet", "town.counts.quiet"],
  ["outOfFuel", "town.counts.outOfFuel"],
  ["unknown", "town.counts.unknown"],
];

function Counts({ counts }: { counts: TownSummaryCounts }) {
  const t = useT();
  const shown = COUNT_LABELS.filter(([key]) => counts[key] > 0);
  return (
    <span className="town-summary-counts">
      {shown.length
        ? shown.map(([key, label]) => (
            <span key={key} data-count={key}>
              {counts[key]} {t(label)}
            </span>
          ))
        : t("town.emptyLabel")}
    </span>
  );
}

/**
 * Town's summary: the shared read model for the board sign and phone chip,
 * and its window while open. A room chosen in the window becomes `roomFocus`
 * for the canvas; on a phone the window closes first, since it covers Town.
 */
export function useTownSummary({
  world,
  office,
  calls,
  observability,
  now,
  openAgent,
  openTerminal,
  showRoom,
}: {
  world: WorldObject;
  office: HerdrOfficeProjection;
  calls: readonly TownCall[];
  observability: OfficeObservability;
  now: number;
  openAgent(agentKey: string): void;
  /** Open a terminal by its World node, as a reception question entry does. */
  openTerminal(nodeId: string): void;
  showRoom(roomKey: string): void;
}): {
  summary: TownSummaryModel;
  deliveries: ReactNode;
  deliveryCount: number;
  deliveryWaiting: number;
  openOutbox(): void;
  askActions: TownAskActions;
  openTerminal(nodeId: string): void;
  open(): void;
  window: ReactNode;
  /** "Since you left" after a return, for the board sign and phone chip. */
  sinceYouLeft: { board: ReactNode; chip: ReactNode };
} {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const { checks: deliveryCount, waiting: deliveryWaiting } =
    useAnswerDeliveryCounts();
  const [deliveryFocus, setDeliveryFocus] = useState(0);
  const deliveries = (
    <ConnectedAnswerDeliveries
      focusKey={deliveryFocus}
      recipient={(notice) => answerRecipientView(notice.ask, world, office)}
      open={(target) => {
        if (target.key === null) return;
        if (target.terminal) openTerminal(target.key);
        else openAgent(target.key);
      }}
    />
  );
  const asksStore = sharedAsksStore();
  const asks = useWorldAsks(asksStore);
  const askers = useMemo(
    () => townAskers(asks, world, office),
    [asks, world, office],
  );
  const askActions = useMemo<TownAskActions>(
    () => ({
      askers,
      answer: (id, text) => asksStore.answer(id, text),
      dismiss: (id) => asksStore.dismiss(id),
      open: (asker) => {
        if (asker.key === null) return;
        if (asker.terminal) openTerminal(asker.key);
        else openAgent(asker.key);
      },
    }),
    [askers, asksStore, openAgent, openTerminal],
  );
  const summary = useMemo(
    () =>
      townSummary(
        office,
        calls,
        observability,
        (agent) => {
          const leaf = world.nodeById.get(agent.nodeId);
          return leaf && "lastActivityAt" in leaf
            ? leaf.lastActivityAt
            : undefined;
        },
        asks,
      ),
    [world, office, calls, observability, asks],
  );
  const [isOpen, setOpen] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const usage = useTownUsage();
  const openOutbox = useCallback(() => {
    setOpen(true);
    setFocusKey((key) => key + 1);
    setDeliveryFocus((key) => key + 1);
  }, []);
  const sinceYouLeft = useMemo(
    () => ({
      board: <TownSinceYouLeft world={world} variant="board" />,
      chip: <TownSinceYouLeft world={world} variant="chip" />,
    }),
    [world],
  );
  const t = useT();
  const open = useCallback(() => {
    townUsageStore().request();
    setOpen(true);
    setFocusKey((key) => key + 1);
  }, []);
  return {
    sinceYouLeft,
    summary,
    deliveries,
    deliveryCount,
    deliveryWaiting,
    openOutbox,
    askActions,
    openTerminal,
    open,
    window: isOpen ? (
      <WorldPanel
        name="town-summary"
        label={t("town.summary")}
        focusKey={focusKey}
        onClose={() => setOpen(false)}
      >
        <TownSummaryPanel
          summary={summary}
          deliveries={deliveries}
          groups={<GroupsSummary />}
          now={now}
          usage={usage}
          onOpenAgent={openAgent}
          askActions={askActions}
          onShowRoom={(roomKey) => {
            if (viewportWidth <= 640) setOpen(false);
            showRoom(roomKey);
          }}
        />
      </WorldPanel>
    ) : null,
  };
}
