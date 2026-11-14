import type { WorkItem } from "../../../shared/worldSources";
import { t } from "../i18n";
import { formatTime, formatWeekdayTime } from "../i18n/format";
import type { NeedsYouItem } from "./needsYou";
import type { WorldLeafObject } from "./worldObject";

/**
 * "Since you left": what changed while the owner was away, derived only from
 * facts World already keeps (ask times, blocked-since and finish times, the
 * reviewed record, merged times from the GitHub source). The away window
 * itself comes from presence.ts.
 */

/** Away this long (no visible World tab with input) makes a return. */
export const AWAY_MS = 30 * 60_000;

/** The owner left at `since` and came back at `at` (both epoch ms). */
export type AwayWindow = { since: number; at: number };

export type SinceYouLeftLine = {
  kind: "for-you" | "questions" | "finished" | "merged";
  count: number;
  /** The board sign's line. */
  text: string;
  /** The phone chip's part of its one line. */
  short: string;
  /**
   * The Needs you item the line opens at. Merged pull requests have no item,
   * so their line opens Needs you without one.
   */
  itemKey?: string;
};

/**
 * When the agent stopped, blocked or finished: the reviewed record's stop
 * time, else Herdr's last activity.
 */
export type StoppedAt = (leaf: WorldLeafObject) => number | null;

/** When an item arrived: asked, or the agent's stop (blocked or finished). */
export function arrivedAt(
  item: NeedsYouItem,
  stoppedAt: StoppedAt,
): number | null {
  return item.kind === "asks" ? item.ask.at : stoppedAt(item.leaf);
}

const within = (window: AwayWindow, at: number | null | undefined) =>
  typeof at === "number" && at > window.since && at <= window.at;

/** Needs you items that arrived while away, in Needs you's own order. */
export function arrivedWhileAway(
  window: AwayWindow,
  items: readonly NeedsYouItem[],
  stoppedAt: StoppedAt,
): NeedsYouItem[] {
  return items.filter((item) => within(window, arrivedAt(item, stoppedAt)));
}

/** The questions line's text: its count and, when known, who asked. */
function questionsText(count: number, askers: readonly string[]): string {
  const name = askers[0];
  if (count === 1)
    return name
      ? t("master.newQuestionFromOne", { name })
      : t("master.newQuestionOne");
  if (!name) return t("master.newQuestionsMany", { count });
  return askers.length > 1
    ? t("master.newQuestionsFromOthers", { count, name })
    : t("master.newQuestionsFromOne", { count, name });
}

/**
 * Up to four lines, most important first: new for you (questions and newly
 * blocked agents), who asked, finished work still to review, merged pull
 * requests. Only items still waiting count, so answering or reviewing one
 * takes it off the recap; an empty list means nothing to show.
 */
export function sinceYouLeft({
  window,
  items,
  stoppedAt,
  name,
  sources = [],
}: {
  window: AwayWindow;
  items: readonly NeedsYouItem[];
  stoppedAt: StoppedAt;
  /** An item's agent name, as Needs you shows it. */
  name: (item: NeedsYouItem) => string;
  /** The GitHub source's items, when it is configured. */
  sources?: readonly WorkItem[];
}): SinceYouLeftLine[] {
  const arrived = arrivedWhileAway(window, items, stoppedAt);
  const forYou = arrived.filter((item) => item.kind !== "done");
  const questions = forYou.filter((item) => item.kind === "asks");
  const finished = arrived.filter((item) => item.kind === "done");
  const merged = sources.filter(
    (item) =>
      item.kind === "pull_request" &&
      item.status === "merged" &&
      within(window, item.finishedAt),
  );
  const lines: SinceYouLeftLine[] = [];
  const askers = [...new Set(questions.map(name).filter(Boolean))];
  const questionLine = (): SinceYouLeftLine => ({
    kind: "questions",
    count: questions.length,
    text: questionsText(questions.length, askers),
    short: t("master.forYouShort", { count: questions.length }),
    itemKey: questions[0]!.key,
  });
  // When every new item is a question, one line says both.
  if (forYou.length && questions.length === forYou.length)
    lines.push(questionLine());
  else if (forYou.length) {
    lines.push({
      kind: "for-you",
      count: forYou.length,
      text: t("master.newForYou", { count: forYou.length }),
      short: t("master.forYouShort", { count: forYou.length }),
      itemKey: forYou[0]!.key,
    });
    if (questions.length) lines.push(questionLine());
  }
  if (finished.length)
    lines.push({
      kind: "finished",
      count: finished.length,
      text: t("master.finished", { count: finished.length }),
      short: t("master.finished", { count: finished.length }),
      itemKey: finished[0]!.key,
    });
  if (merged.length)
    lines.push({
      kind: "merged",
      count: merged.length,
      text:
        merged.length === 1
          ? t("master.mergedPrOne")
          : t("master.mergedPrMany", { count: merged.length }),
      short: t("master.mergedShort", { count: merged.length }),
    });
  return lines.slice(0, 4);
}

/** The phone chip's one line: "2 for you, 5 finished" (the question line folds into "for you"). */
export const sinceYouLeftShort = (lines: readonly SinceYouLeftLine[]) =>
  lines
    .filter(
      (line) =>
        line.kind !== "questions" ||
        !lines.some((other) => other.kind === "for-you"),
    )
    .map((line) => line.short)
    .join(", ");

/** How long the owner was away: "45 min", "3 h", "2 d". */
export function awayFor(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return t("master.awayMinutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t("master.awayHours", { count: hours });
  return t("master.awayDays", { count: Math.round(hours / 24) });
}

/** When the owner left, as a clock time; another day adds its weekday. */
export function leftAt(since: number, now: number) {
  const left = new Date(since);
  return left.toDateString() === new Date(now).toDateString()
    ? formatTime(left)
    : formatWeekdayTime(left);
}
