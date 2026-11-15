/**
 * One set of agent marks for every view (Town, Board, Desk, Chat and the
 * phone): each state has one glyph, one colour (agentMarks.css) and one word
 * (the i18n `marks` dictionary).
 */
import { t } from "../i18n/core";
import type { TranslationKey } from "../i18n/en";

export type AgentMarkKind =
  | "working"
  | "needs"
  | "asks"
  | "done"
  | "reviewed"
  | "idle"
  | "no-signal"
  | "offline";

export const AGENT_MARKS: Record<AgentMarkKind, string> = {
  working: "•",
  needs: "!",
  asks: "?",
  done: "✓",
  reviewed: "–",
  idle: "–",
  "no-signal": "~",
  offline: "×",
};

const MARK_WORD_KEYS = {
  working: "marks.working",
  needs: "marks.needs",
  asks: "marks.asks",
  done: "marks.done",
  reviewed: "marks.reviewed",
  idle: "marks.idle",
  "no-signal": "marks.noSignal",
  offline: "marks.offline",
} as const satisfies Record<AgentMarkKind, TranslationKey>;

/** The state's one word, in the selected language. */
export const agentMarkWord = (kind: AgentMarkKind) => t(MARK_WORD_KEYS[kind]);

/**
 * The mark for an agent's Herdr status ("working", "blocked", "done",
 * "idle", anything else is no signal). An open owner question outranks the
 * status, and an unreachable host outranks both.
 */
export function agentMarkKind(
  status: string | null | undefined,
  {
    asking = false,
    offline = false,
    reviewed = false,
  }: { asking?: boolean; offline?: boolean; reviewed?: boolean } = {},
): AgentMarkKind {
  if (offline) return "offline";
  if (asking) return "asks";
  switch (status) {
    case "working":
      return "working";
    case "blocked":
      return "needs";
    case "done":
      return reviewed ? "reviewed" : "done";
    case "idle":
      return "idle";
    default:
      return "no-signal";
  }
}

/** The one word for an agent's state, as agentMarkKind decides it. */
export function agentStateWord(
  status: string | null | undefined,
  options?: Parameters<typeof agentMarkKind>[1],
) {
  return agentMarkWord(agentMarkKind(status, options));
}
