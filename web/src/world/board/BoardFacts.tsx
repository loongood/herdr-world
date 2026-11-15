/**
 * Town's facts on Board (#787), in Board's own way: a summary over the board,
 * a line on each host zone and workspace card, and what each agent is doing
 * on its tab card. Every figure is read from the read model Town reads
 * (useBoardFacts.ts, town/townExpenses.ts, town/townPlaceUsage.ts,
 * town/townLimits.ts, town/townSteps.ts); nothing here keeps its own copy.
 */

import { BarChart3 } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import { t, useT } from "../../i18n";
import type { TranslationKey } from "../../i18n/en";
import { townLocation } from "../town/TownRail";
import {
  type TownCityExpenses,
  townCityExpenses,
  townCoverageNotes,
  townExpenseText,
  townHostExpenses,
  townWindowLabelText,
  useTownExpensesUsage,
} from "../town/townExpenses";
import {
  townFuelGauges,
  townFuelNotes,
  townLimits,
  useTownLimits,
} from "../town/townLimits";
import {
  type TownUsageWindow,
  townPlaceEconomy,
  townUsageCurrent,
  townUsageStore,
  useTownUsage,
} from "../town/townPlaceUsage";
import type { TownStepStore } from "../town/townStepStore";
import {
  type TownSummary,
  type TownSummaryHost,
  townSummaryAge,
} from "../town/townSummary";
import type { WorldAgentStatus, WorldLeafObject } from "../worldObject";
import { useBoardNow } from "./boardClock";
import {
  boardAgentNow,
  boardCountsText,
  boardFuelText,
  boardHostGauges,
  boardPlaceText,
  boardTotalText,
} from "./boardFactsText";
import "./boardFacts.css";

const WINDOWS: readonly TownUsageWindow[] = ["today", "7d"];

/** A window's usage as it may be shown now, on Board's one clock. */
function useBoardUsage(window: TownUsageWindow) {
  const store = townUsageStore(window);
  const state = useTownUsage(store);
  return townUsageCurrent(state, useBoardNow());
}

const WAITING_KEYS: Record<string, TranslationKey> = {
  loading: "board.facts.readingUsage",
  unavailable: "board.facts.usageUnavailable",
  stale: "board.facts.usageOutOfDate",
  "no-data": "board.facts.noUsageData",
};

function cityLine(expenses: TownCityExpenses) {
  return expenses.status === "ready"
    ? townExpenseText(expenses.total)
    : t(WAITING_KEYS[expenses.status]!);
}

/**
 * The Board summary: Town's counts on a chip at the top of the board, which
 * opens the rest: expenses today and over 7 days, each harness's limits with
 * the reading's age, finished work not yet reviewed, and each host.
 */
export const BoardSummary = memo(function BoardSummary({
  summary,
  onSelectAgent,
}: {
  summary: TownSummary;
  /** Show an agent on the board: select it and bring its workspace in. */
  onSelectAgent(nodeId: string): void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Read usage while Board is shown, as Town's board does.
  useTownExpensesUsage(townUsageStore("7d"));
  const usage = useTownLimits();
  const today = townCityExpenses(useBoardUsage("today"));
  const week = townCityExpenses(useBoardUsage("7d"));
  const now = useBoardNow();
  const limits = townLimits(usage);
  const gauges = townFuelGauges(limits, now);
  const notes = townFuelNotes(limits, gauges);
  const { counts } = summary;
  const countsText = t("board.facts.countsText", {
    working: counts.working,
    needsYou: counts.needsYou,
    finished: counts.finished,
    quiet: counts.quiet,
  });
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <div className="board-facts" data-open={open}>
      <button
        type="button"
        className="board-facts-chip"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("board.facts.summaryAria", { counts: countsText })}
        title={
          open ? t("board.facts.hideSummary") : t("board.facts.showSummary")
        }
        onClick={() => setOpen((value) => !value)}
      >
        <BarChart3 size={14} aria-hidden="true" />
        <span data-status="working">{counts.working}</span>
        <span data-status="blocked">!{counts.needsYou}</span>
        <span data-status="done">✓{counts.finished}</span>
        <span data-status="idle">{counts.quiet}</span>
      </button>
      {open ? (
        <div
          id={panelId}
          className="board-facts-panel"
          role="group"
          aria-label={t("board.facts.summaryLabel")}
        >
          <section aria-label={t("board.facts.agentsLabel")}>
            <dl className="board-facts-counts">
              <div data-status="working">
                <dt>{t("board.facts.countBusy")}</dt>
                <dd>{counts.working}</dd>
              </div>
              <div data-status="blocked">
                <dt>{t("board.facts.countWaiting")}</dt>
                <dd>{counts.needsYou}</dd>
              </div>
              <div data-status="done">
                <dt>{t("board.facts.countDone")}</dt>
                <dd>{counts.finished}</dd>
              </div>
              <div data-status="idle">
                <dt>{t("board.facts.countQuiet")}</dt>
                <dd>{counts.quiet}</dd>
              </div>
            </dl>
            <p className="board-facts-note">
              {t("board.facts.summaryCounts", {
                agents: counts.agents,
                agentsWord:
                  counts.agents === 1
                    ? t("board.facts.agentWord")
                    : t("board.facts.agentsWord"),
                hosts: counts.buildings,
                hostsWord:
                  counts.buildings === 1
                    ? t("board.facts.hostWord")
                    : t("board.facts.hostsWord"),
              })}
              {counts.unknown
                ? t("board.facts.unknownCount", { count: counts.unknown })
                : ""}
            </p>
          </section>
          <section aria-labelledby={`${panelId}-expenses`}>
            <h3 id={`${panelId}-expenses`}>{t("board.facts.expenses")}</h3>
            {[today, week].map((expenses, index) => (
              <p key={WINDOWS[index]} className="board-facts-line">
                <span>{townWindowLabelText(WINDOWS[index]!)}</span>
                <b>{cityLine(expenses)}</b>
              </p>
            ))}
            {today.status === "ready" ? (
              <p className="board-facts-note">
                {townCoverageNotes(today.coverage, today.unattributed).join(
                  " · ",
                )}
              </p>
            ) : null}
          </section>
          <section aria-labelledby={`${panelId}-fuel`}>
            <h3 id={`${panelId}-fuel`}>{t("board.facts.limits")}</h3>
            {gauges.length || notes.length ? (
              <ul className="board-facts-list">
                {gauges.map((gauge) => (
                  <li
                    key={gauge.harness}
                    data-stale={gauge.stale || undefined}
                    data-low={(!gauge.stale && gauge.lowest.low) || undefined}
                  >
                    {boardFuelText(gauge, now)}
                  </li>
                ))}
                {notes.map((note) => (
                  <li key={note.harness} data-stale>
                    {t("board.facts.limitsNotAvailable", {
                      name: note.name,
                      reason: note.reason,
                    })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="board-facts-note">
                {usage.status === "failed"
                  ? t("board.facts.limitsUnavailable")
                  : usage.status === "ready"
                    ? t("board.facts.noLimitsYet")
                    : t("board.facts.readingLimits")}
              </p>
            )}
          </section>
          <section aria-labelledby={`${panelId}-finished`}>
            <h3 id={`${panelId}-finished`}>
              {t("board.facts.doneNotReviewed")} <span>{counts.finished}</span>
            </h3>
            {summary.finished.length ? (
              <ul className="board-facts-list">
                {summary.finished.map((item) => (
                  <li key={item.agent.key}>
                    <button
                      type="button"
                      aria-label={t("board.facts.showAgentOnBoard", {
                        name: item.agent.displayLabel,
                      })}
                      onClick={() => {
                        setOpen(false);
                        onSelectAgent(item.agent.nodeId);
                      }}
                    >
                      <b>{item.agent.displayLabel}</b>
                      <small>
                        {townLocation(item)}
                        {item.since === null
                          ? ""
                          : t("board.facts.lastActive", {
                              age: townSummaryAge(item.since, now),
                            })}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="board-facts-note">
                {t("board.facts.nothingNewFinished")}
              </p>
            )}
          </section>
          <section aria-labelledby={`${panelId}-hosts`}>
            <h3 id={`${panelId}-hosts`}>{t("board.facts.hostsLabel")}</h3>
            <ul className="board-facts-list">
              {summary.hosts.map((host) => (
                <li key={host.key}>
                  <b>{host.label}</b>
                  {host.stale ? (
                    <small>{t("board.facts.offlineStale")}</small>
                  ) : null}
                  <BoardHostLines host={host} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
});

/** A host's counts, expenses and limits, one short line each. */
function BoardHostLines({ host }: { host: TownSummaryHost }) {
  const t = useT();
  const today = useBoardUsage("today");
  const week = useBoardUsage("7d");
  const now = useBoardNow();
  const gauges = boardHostGauges(
    townLimits(useTownUsage(townUsageStore())),
    host.connectionId,
    now,
  );
  return (
    <>
      <small className="board-facts-host-line">
        {boardCountsText(host.counts)}
      </small>
      <small className="board-facts-host-line">
        {t("town.windowToday")}{" "}
        {boardTotalText(townHostExpenses(today, host.connectionId), t)} ·{" "}
        {t("town.window7d")}{" "}
        {boardTotalText(townHostExpenses(week, host.connectionId), t)}
      </small>
      {gauges.map((gauge) => (
        <small
          key={gauge.harness}
          className="board-facts-host-line"
          data-stale={gauge.stale || undefined}
        >
          {boardFuelText(gauge, now, t)}
        </small>
      ))}
    </>
  );
}

/** A host zone's agent counts, beside its name in the heading. */
export const BoardZoneCounts = memo(function BoardZoneCounts({
  host,
}: {
  host: TownSummaryHost | undefined;
}) {
  const t = useT();
  if (!host) return null;
  return (
    <span className="board-zone-counts">{boardCountsText(host.counts, t)}</span>
  );
});

/**
 * A host zone's summary under its heading: usage on one line, then each
 * harness's limits on its own short line (#854).
 */
export const BoardZoneFacts = memo(function BoardZoneFacts({
  host,
}: {
  host: TownSummaryHost | undefined;
}) {
  const t = useT();
  const today = useBoardUsage("today");
  const week = useBoardUsage("7d");
  const now = useBoardNow();
  const limits = townLimits(useTownUsage(townUsageStore()));
  if (!host) return null;
  const gauges = boardHostGauges(limits, host.connectionId, now);
  return (
    <span className="board-zone-facts">
      <span>
        {t("town.windowToday")}{" "}
        {boardTotalText(townHostExpenses(today, host.connectionId), t)} ·{" "}
        {t("town.window7d")}{" "}
        {boardTotalText(townHostExpenses(week, host.connectionId), t)}
      </span>
      {gauges.map((gauge) => (
        <span key={gauge.harness} data-stale={gauge.stale || undefined}>
          {boardFuelText(gauge, now, t)}
        </span>
      ))}
    </span>
  );
});

/** A workspace card's usage, today and over 7 days, as Town's room card. */
export const BoardWorkspaceEconomy = memo(function BoardWorkspaceEconomy({
  connectionId,
  generation,
  nativeId,
  worldId,
}: {
  connectionId: string;
  generation: number;
  nativeId: string;
  worldId: string;
}) {
  const t = useT();
  const place = {
    kind: "room" as const,
    target: {
      connectionId,
      generation,
      nativeId,
      worldId,
      kind: "workspace" as const,
    },
  };
  const today = boardPlaceText(
    townPlaceEconomy(useBoardUsage("today"), place),
    t,
  );
  const week = boardPlaceText(townPlaceEconomy(useBoardUsage("7d"), place), t);
  return (
    <div className="board-economy">
      {t("town.windowToday")} {today} · {t("town.window7d")} {week}
    </div>
  );
});

/**
 * What an agent is doing now: its running step (amber once it has run long,
 * as Town's bubbles), its unreviewed or reviewed finish, or its idle time.
 * Short, as it fits a card: a pane row's state, which shows `fallback`
 * when there is nothing to say, or the end of a tab card's line.
 */
export const BoardAgentNowLine = memo(function BoardAgentNowLine({
  leaf,
  status,
  presented = status,
  steps,
  className,
  fallback,
}: {
  leaf: WorldLeafObject;
  status: WorldAgentStatus;
  presented?: WorldAgentStatus;
  steps: TownStepStore;
  /** Where it stands: a pane row's state, or the end of a tab card's line. */
  className: "board-pane-state" | "board-now-inline";
  fallback?: string;
}) {
  const t = useT();
  const key = leaf.id;
  const step = useSyncExternalStore(
    useCallback(
      (listener: () => void) => steps.subscribe(key, listener),
      [steps, key],
    ),
    () => steps.get(key),
  );
  const now = useBoardNow();
  const line = boardAgentNow(
    {
      status,
      presented,
      step,
      lastActivityAt: leaf.lastActivityAt,
      now,
    },
    t,
  );
  if (!line && fallback === undefined) return null;
  return (
    <span
      className={`${className} board-now`}
      data-long={line?.long || undefined}
      data-kind={
        line && step && presented === "working" ? step.kind : undefined
      }
    >
      {line?.text ?? fallback}
    </span>
  );
});
