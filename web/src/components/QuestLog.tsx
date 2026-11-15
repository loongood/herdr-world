import { useState } from "react";
import type { Quest } from "../../../server/src/agent/quest";
import { t, useT } from "../i18n";
import type { TranslationKey } from "../i18n/en";
import {
  questCurrentStep,
  questProgressText,
  questSourceLabel,
} from "../world/agentQuests";
import "./QuestLog.css";

const STEP_MARKS: Record<Quest["steps"][number]["status"], string> = {
  done: "✓",
  active: "▸",
  blocked: "!",
  pending: "·",
};

const STATUS_KEYS = {
  active: "quest.statusActive",
  done: "quest.statusDone",
  blocked: "quest.statusBlocked",
  paused: "quest.statusPaused",
} as const satisfies Record<Quest["status"], TranslationKey>;

/** Where the quest came from, in the harness's own words. */
function questOrigin(quest: Quest) {
  const parts = [
    t("quest.originFrom", {
      source: questSourceLabel(quest.source),
      tool: quest.tool,
    }),
  ];
  if (quest.helpers)
    parts.push(
      quest.helpers === 1
        ? t("quest.helpersOne")
        : t("quest.helpersMany", { count: quest.helpers }),
    );
  return parts.join(" · ");
}

/**
 * A small quest progress chip for a card or desk label: a flag, then "2/5"
 * or the quest's kind. Its title names the quest and the current step.
 */
export function QuestChip({ quest }: { quest: Quest }) {
  const t = useT();
  const step = questCurrentStep(quest);
  return (
    <span
      className={`quest-chip is-${quest.status}`}
      title={t("quest.chipTitle", {
        title: quest.title,
        step: step?.text ?? "",
        status: t(STATUS_KEYS[quest.status]),
      })}
      aria-label={t("quest.chipAria", {
        progress: questProgressText(quest),
        title: quest.title,
      })}
      data-quest-source={quest.source}
    >
      <span aria-hidden="true">⚑</span>
      {questProgressText(quest)}
    </span>
  );
}

/**
 * The agent's quest in Mission Log style: title, progress bar and its
 * objectives, read from the agent's own todos, plan, goal or loop. It folds
 * to one line; nothing is shown when the transcript records no quest.
 */
export function QuestLog({
  quest,
  compact = false,
}: {
  quest: Quest | null | undefined;
  compact?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(!compact);
  if (!quest) return null;
  const { done, total } = quest.progress;
  const percent = total > 0 ? Math.round((done / total) * 100) : null;
  return (
    <section
      className={`quest-log is-${quest.status}${compact ? " is-compact" : ""}`}
      aria-label={t("quest.logAria")}
      data-quest-source={quest.source}
    >
      <button
        type="button"
        className="quest-log-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="quest-log-flag" aria-hidden="true">
          ⚑
        </span>
        <span className="quest-log-title">{quest.title}</span>
        <span className="quest-log-count">{questProgressText(quest)}</span>
      </button>
      {percent !== null && (!compact || open) ? (
        <div
          className="quest-log-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={t("quest.progressAria", { done, total })}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      {open ? (
        <>
          {quest.steps.length ? (
            <ol className="quest-log-steps">
              {quest.steps.map((step) => (
                <li key={step.id} className={`is-${step.status}`}>
                  <span className="quest-log-mark" aria-hidden="true">
                    {STEP_MARKS[step.status]}
                  </span>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
          ) : null}
          <p className="quest-log-meta">
            {t(STATUS_KEYS[quest.status])} · {questOrigin(quest)}
          </p>
        </>
      ) : null}
    </section>
  );
}
