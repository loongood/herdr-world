import { type ReactNode, useState } from "react";
import { usageStopText } from "../../../../shared/usageStop";
import { useT } from "../../i18n";
import type { TranslationKey } from "../../i18n/en";
import {
  formatOfficeCost,
  formatOfficeModelNames,
  formatOfficeUsage,
} from "../officeObservability";
import { TownExpenseCaveats } from "./TownExpenseCaveats";
import {
  TownFuel,
  TownFuelChip,
  townFuelLowest,
  townFuelLowestText,
} from "./TownFuelGauge";
import {
  type TownExpenseCaveat,
  townCityExpenses,
  townCostText,
  townCoverageCaveats,
  townExpenseText,
  townPartialCaveat,
  townPriceNote,
  useTownExpensesUsage,
} from "./townExpenses";
import {
  townFuelGauges,
  townFuelNotes,
  townLimits,
  useTownLimits,
} from "./townLimits";
import type { TownPlaceEconomy, TownUsageStore } from "./townPlaceUsage";
import type {
  TownPlaceSummary,
  TownSummary,
  TownSummaryCounts,
} from "./townSummary";

/**
 * The Town board counts the whole town from the Town summary (townSummary.ts):
 * every building's agents, whichever rooms and desks the scene has admitted.
 */
export function TownBoard({
  counts,
  usageStore,
  onOpenSummary,
  sinceYouLeft,
}: {
  counts: TownSummary["counts"];
  usageStore?: TownUsageStore;
  onOpenSummary?: () => void;
  /** "Since you left" after a return: on the sign, and under the phone chip. */
  sinceYouLeft?: { board: ReactNode; chip: ReactNode };
}) {
  const t = useT();
  const expenses = townCityExpenses(useTownExpensesUsage(usageStore));
  // Phones show a compact chip; it opens the full board in place.
  const [open, setOpen] = useState(false);
  const closeOnEscape = (event: React.KeyboardEvent) => {
    if (open && event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
    }
  };
  const population =
    counts.agents === 1
      ? counts.buildings === 1
        ? t("town.populationOneOne")
        : t("town.populationOneMany", { buildings: counts.buildings })
      : counts.buildings === 1
        ? t("town.populationManyOne", { agents: counts.agents })
        : t("town.populationManyMany", {
            agents: counts.agents,
            buildings: counts.buildings,
          });
  // Subscription fuel: each harness's limit windows, from harness usage.
  const usage = useTownLimits();
  const now = Date.now();
  const limits = townLimits(usage);
  const gauges = townFuelGauges(limits, now);
  const notes = townFuelNotes(limits, gauges);
  const lowest = townFuelLowest(gauges);
  const summary = `${t("town.summaryCounts", {
    working: counts.working,
    needsYou: counts.needsYou,
    finished: counts.finished,
    quiet: counts.quiet,
  })}${
    counts.outOfFuel ? t("town.outOfFuelTail", { count: counts.outOfFuel }) : ""
  }; ${population}${lowest ? `; ${townFuelLowestText(lowest, now)}` : ""}`;
  return (
    <>
      <button
        type="button"
        className="town-board-chip"
        // With a summary to open, the chip opens it; otherwise the board.
        {...(onOpenSummary
          ? { "aria-haspopup": "dialog" as const }
          : { "aria-expanded": open, "aria-controls": "town-board" })}
        aria-label={`${onOpenSummary ? t("town.summary") : t("town.board")}: ${summary}`}
        title={
          onOpenSummary
            ? t("town.openSummaryTitle")
            : open
              ? t("town.hideBoardTitle")
              : t("town.showBoardTitle")
        }
        onClick={() =>
          onOpenSummary ? onOpenSummary() : setOpen((value) => !value)
        }
        onKeyDown={closeOnEscape}
      >
        <span data-status="working">{counts.working}</span>
        <span data-status="blocked">!{counts.needsYou}</span>
        <span data-status="done">✓{counts.finished}</span>
        {lowest ? <TownFuelChip lowest={lowest} now={now} /> : null}
      </button>
      {sinceYouLeft?.chip}
      <div
        id="town-board"
        className="town-board"
        data-open={open}
        role="group"
        aria-label={t("town.board")}
        onKeyDown={closeOnEscape}
      >
        <div className="town-board-title">
          {t("town.boardTitle")}
          {onOpenSummary ? (
            <button
              type="button"
              className="town-board-open"
              onClick={onOpenSummary}
            >
              {t("town.summaryButton")}
            </button>
          ) : null}
        </div>
        {sinceYouLeft?.board}
        <TownBoardCounts counts={counts} />
        <p className="town-board-population">
          {population}
          {counts.unknown
            ? ` · ${t("town.unknownShort", { count: counts.unknown })}`
            : ""}
          {counts.outOfFuel
            ? ` · ${t("town.outOfFuelShort", { count: counts.outOfFuel })}`
            : ""}
        </p>
        <TownBoardEconomy
          label={
            expenses.status === "ready" && expenses.coverage.testData
              ? t("town.economyTodayUtcTest")
              : t("town.economyTodayUtcHarness")
          }
          cost={
            expenses.status === "ready" && expenses.total.price === "priced"
              ? (townCostText(expenses.total) ?? undefined)
              : undefined
          }
          caveats={
            expenses.status === "ready"
              ? townCoverageCaveats(
                  expenses.coverage,
                  expenses.unattributed,
                  "pane",
                )
              : undefined
          }
          detail={
            expenses.status === "ready"
              ? expenses.total.price === "priced"
                ? t("town.tokensCount", {
                    tokens: formatOfficeUsage(expenses.total.tokens),
                  })
                : townExpenseText(expenses.total)
              : expenses.status === "loading"
                ? t("town.readingUsage")
                : expenses.status === "stale"
                  ? t("town.usageStale")
                  : expenses.status === "no-data"
                    ? t("town.noHostUsage")
                    : t("town.usageUnavailable")
          }
        />
        <TownFuel gauges={gauges} notes={notes} now={now} />
      </div>
    </>
  );
}

/** The board's agent numbers, one short word per column: busy, waiting, done and quiet. */
function TownBoardCounts({ counts }: { counts: TownSummaryCounts }) {
  const t = useT();
  return (
    <dl className="town-board-counts">
      <div>
        <dt>{t("town.countBusy")}</dt>
        <dd>{counts.working}</dd>
      </div>
      <div>
        <dt>{t("town.countWaiting")}</dt>
        <dd>{counts.needsYou}</dd>
      </div>
      <div>
        <dt>{t("town.countDone")}</dt>
        <dd>{counts.finished}</dd>
      </div>
      <div>
        <dt>{t("town.countQuiet")}</dt>
        <dd>{counts.quiet}</dd>
      </div>
    </dl>
  );
}

/**
 * The board's economy numbers: a cost, then tokens and models, or why not,
 * and one short caveat line explained on hover or tap.
 */
function TownBoardEconomy({
  label,
  cost,
  detail,
  caveats = [],
}: {
  label?: string;
  cost?: string;
  detail: string;
  caveats?: readonly TownExpenseCaveat[];
}) {
  const t = useT();
  return (
    <div className="town-board-economy">
      <span>{label ?? t("town.economyLabel")}</span>
      {cost === undefined ? null : <b>{cost}</b>}
      <small>{detail}</small>
      <TownExpenseCaveats
        caveats={caveats}
        className="town-board-economy-caveats"
      />
    </div>
  );
}

const PLACE_ECONOMY_KEYS = {
  loading: "town.placeLoading",
  unavailable: "town.placeUnavailable",
  stale: "town.placeStale",
  none: "town.placeNone",
  "no-data": "town.placeNoData",
  limited: "town.placeLimited",
} as const satisfies Record<
  Exclude<TownPlaceEconomy["status"], "ready">,
  TranslationKey
>;

/**
 * A room's or table's card: the Town board without its agents list, for
 * that place. The agent numbers are its part of the Town summary; the
 * economy numbers are today's harness usage there (townPlaceUsage.ts).
 */
export function TownPlaceSummaryCard({
  place,
  economy,
}: {
  place: TownPlaceSummary;
  economy: TownPlaceEconomy;
}) {
  const t = useT();
  const { counts } = place;
  return (
    <div className="town-place-summary">
      <TownBoardCounts counts={counts} />
      <p className="town-board-population">
        {counts.agents === 1
          ? t("town.agentsOne")
          : t("town.agentsMany", { agents: counts.agents })}
        {counts.unknown
          ? ` · ${t("town.unknownShort", { count: counts.unknown })}`
          : ""}
        {counts.outOfFuel
          ? ` · ${t("town.outOfFuelShort", { count: counts.outOfFuel })}`
          : ""}
      </p>
      {place.fuel.map(({ label, stop }, index) => (
        <p key={index} className="town-place-fuel">
          {place.fuel.length > 1 ? `${label}: ` : ""}
          {usageStopText(stop, Date.now())}
        </p>
      ))}
      {economy.status === "ready" ? (
        <TownBoardEconomy
          label={t("town.economyToday")}
          cost={
            economy.price === "priced"
              ? formatOfficeCost(economy.costUsd, "estimated")
              : undefined
          }
          detail={`${t("town.tokensCount", { tokens: formatOfficeUsage(economy.tokens) })}${
            economy.models.length
              ? ` · ${formatOfficeModelNames(economy.models.map((model) => ({ model })))}`
              : ""
          }${economy.price === "priced" ? "" : ` · ${townPriceNote(economy.price)}`}`}
          caveats={economy.partial ? [townPartialCaveat()] : []}
        />
      ) : (
        <TownBoardEconomy
          label={t("town.economyToday")}
          detail={t(PLACE_ECONOMY_KEYS[economy.status])}
        />
      )}
    </div>
  );
}
