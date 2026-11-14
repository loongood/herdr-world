import { Coins } from "lucide-react";
import { type CSSProperties, type ReactNode, type Ref, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { t, useT } from "../../i18n";
import { formatOfficeUsage } from "../officeObservability";
import { TownExpenseCaveats } from "./TownExpenseCaveats";
import { TOWN_CITY_BOARD_GAP, type TownCenterLot } from "./townCenter";
import {
  type TownCityExpenses,
  type TownExpenseTotal,
  type TownHostExpenses,
  townCityExpenses,
  townCoverageCaveats,
  townExpenseText,
  townHostExpenses,
  townUsd,
  townWindowLabelText,
  useTownExpensesUsage,
} from "./townExpenses";
import { TOWN_TILE as T } from "./townLayout";
import {
  type TownUsageStore,
  type TownUsageWindow,
  townUsageStore,
} from "./townPlaceUsage";
import "./townExpenses.css";

const WAITING_TEXT = {
  loading: () => t("town.readingUsage"),
  unavailable: () => t("town.usageUnavailable"),
  stale: () => t("town.waitingStale"),
  "no-data": () => t("town.waitingNoData"),
} as const;

const waitingText = (status: keyof typeof WAITING_TEXT) =>
  WAITING_TEXT[status]();

/** The figures line, or what stands in for it. */
function Headline({
  span,
  expenses,
}: {
  span: TownUsageWindow;
  expenses: TownCityExpenses | TownHostExpenses;
}) {
  return (
    <p className="town-expenses-headline">
      <span>{townWindowLabelText(span)}</span>
      {" · "}
      <b>
        {expenses.status === "ready"
          ? townExpenseText(expenses.total)
          : waitingText(expenses.status)}
      </b>
    </p>
  );
}

/**
 * A board on its posts, or on a phone a sign that opens it: the boards stay
 * readable at any width.
 */
function Board({
  folded,
  label,
  summary,
  sign,
  className,
  style,
  boardRef,
  children,
}: {
  folded: boolean;
  label: string;
  /** The headline figures in words, the folded sign's name. */
  summary: string;
  /** The folded sign's short text. */
  sign: string;
  className: string;
  style?: CSSProperties;
  /** The unfolded board, measured to keep other boards off it. */
  boardRef?: Ref<HTMLElement>;
  children: ReactNode;
}) {
  const t = useT();
  if (!folded)
    return (
      <section
        ref={boardRef}
        className={`town-expenses ${className}`}
        style={style}
        role="group"
        aria-label={label}
      >
        <div className="town-expenses-panel">{children}</div>
        <span className="town-expenses-posts" aria-hidden="true" />
      </section>
    );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`town-expenses-sign ${className}`}
          style={style}
          aria-label={`${label}: ${summary}. ${t("town.open")}`}
          title={label}
        >
          <Coins size={12} aria-hidden="true" />
          <span>{sign}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="town-expenses-popover"
        collisionPadding={8}
        aria-label={label}
      >
        <div className="town-expenses-panel">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

/** A listed room: its tokens, and its estimate when it has one. */
const townRoomText = (total: TownExpenseTotal) =>
  `${formatOfficeUsage(total.tokens)}${
    total.price === "priced" && total.costUsd !== null
      ? ` · ${townUsd(total.costUsd)}`
      : ""
  }`;

/** The figures in words, for the folded sign's name. */
const spokenText = (expenses: TownCityExpenses | TownHostExpenses) =>
  expenses.status === "ready"
    ? townExpenseText(expenses.total)
    : waitingText(expenses.status);

const SIGN_WAITING = {
  loading: () => "…",
  unavailable: () => "n/a",
  stale: () => t("town.signOld"),
  "no-data": () => t("town.waitingNoData"),
};

const signWaitingText = (status: keyof typeof SIGN_WAITING) =>
  SIGN_WAITING[status]();

/** The folded sign's few characters: the cost, else the tokens. */
const signText = (expenses: TownCityExpenses | TownHostExpenses) => {
  if (expenses.status !== "ready") return signWaitingText(expenses.status);
  const { total } = expenses;
  if (!total.records) return t("town.signNone");
  return total.price === "priced" && total.costUsd !== null
    ? townUsd(total.costUsd)
    : t("town.signTokens", { tokens: formatOfficeUsage(total.tokens) });
};

/**
 * The city expenses billboard: the whole World's tokens and estimated cost,
 * today or over 7 days. It stands on the lawn above the town center, never
 * over it, or on a phone, where the center tops the stacked town, folds to a
 * sign in the center's empty corner beside its tower.
 */
export function TownCityBillboard({
  center,
  folded,
  boardRef,
  stores = townUsageStore,
}: {
  center: TownCenterLot;
  folded: boolean;
  boardRef?: Ref<HTMLElement>;
  stores?: (span: TownUsageWindow) => TownUsageStore;
}) {
  const [span, setSpan] = useState<TownUsageWindow>("today");
  const t = useT();
  const expenses = townCityExpenses(useTownExpensesUsage(stores(span)));
  const style = folded
    ? { left: (center.x + 4) * T, top: (center.y + 2) * T }
    : {
        left: (center.x + center.w / 2) * T,
        top: center.y * T - TOWN_CITY_BOARD_GAP,
      };
  return (
    <Board
      folded={folded}
      label={t("town.cityExpenses")}
      summary={`${townWindowLabelText(span)} ${spokenText(expenses)}`}
      sign={signText(expenses)}
      className="town-expenses-city"
      style={style}
      boardRef={boardRef}
    >
      <header className="town-expenses-title">
        <span>{t("town.cityExpensesTitle")}</span>
        <span
          className="town-expenses-window"
          role="group"
          aria-label={t("town.expensesWindow")}
        >
          {(["today", "7d"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={span === option}
              onClick={() => setSpan(option)}
            >
              {townWindowLabelText(option)}
            </button>
          ))}
        </span>
      </header>
      <Headline span={span} expenses={expenses} />
      {expenses.status === "ready" ? (
        <TownExpenseCaveats
          caveats={townCoverageCaveats(
            expenses.coverage,
            expenses.unattributed,
            "pane",
          )}
        />
      ) : null}
    </Board>
  );
}

/**
 * A building's expenses, part of its reception board: the host's totals today
 * and its costliest rooms under the queue. On a phone, where the reception is
 * compact, they fold to a sign in its title that opens them.
 */
export function TownReceptionExpenses({
  connectionId,
  hostLabel,
  roomLabel,
  folded,
  store = townUsageStore("today"),
}: {
  connectionId: string;
  hostLabel: string;
  /** A room's name by its workspace, or null for one Town no longer has. */
  roomLabel(workspaceId: string, generation: number): string | null;
  folded: boolean;
  store?: TownUsageStore;
}) {
  const expenses = townHostExpenses(useTownExpensesUsage(store), connectionId);
  const t = useT();
  const label = t("town.hostExpenses", { host: hostLabel });
  const details = (
    <>
      <p className="town-expenses-headline">
        <b>{spokenText(expenses)}</b>
      </p>
      {expenses.status === "ready" && expenses.rooms.length ? (
        <ol
          className="town-expenses-rooms"
          aria-label={t("town.topRoomsBySpend")}
        >
          {expenses.rooms.map((room) => (
            <li key={room.workspaceId}>
              <span>
                {roomLabel(room.workspaceId, room.generation) ??
                  t("town.closedRoom")}
              </span>
              <b>{townRoomText(room.total)}</b>
            </li>
          ))}
          {expenses.moreRooms ? (
            <li className="town-expenses-more">
              {expenses.moreRooms === 1
                ? t("town.moreRoomsOne", { count: expenses.moreRooms })
                : t("town.moreRooms", { count: expenses.moreRooms })}
            </li>
          ) : null}
        </ol>
      ) : null}
      {expenses.status === "ready" ? (
        <TownExpenseCaveats
          caveats={townCoverageCaveats(
            expenses.coverage,
            expenses.unattributed,
            "room",
          )}
        />
      ) : null}
    </>
  );
  if (!folded)
    return (
      <section
        className="town-reception-expenses"
        role="group"
        aria-label={label}
      >
        <header className="town-reception-expenses-title">
          {t("town.expensesToday")}
        </header>
        {details}
      </section>
    );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="town-expenses-sign"
          aria-label={`${label}: ${spokenText(expenses)}. ${t("town.open")}`}
          title={label}
        >
          <Coins size={12} aria-hidden="true" />
          <span>{signText(expenses)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="town-expenses-popover"
        collisionPadding={8}
        aria-label={label}
      >
        <div className="town-expenses-panel">
          <header className="town-expenses-title">
            <span>{t("town.expensesToday")}</span>
          </header>
          {details}
        </div>
      </PopoverContent>
    </Popover>
  );
}
