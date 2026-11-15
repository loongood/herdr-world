import { t } from "../../../i18n";
import type { TranslationKey } from "../../../i18n/en";

/** Harnesses where Esc interrupts the current turn without quitting. */
export const STOPS_WITH_ESCAPE = new Set(["claude", "codex", "pi"]);
/** Two presses of Esc this close together stop the agent. */
export const DOUBLE_ESCAPE_MS = 700;

export function elapsed(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** The task a harness names in its title, without its spinner glyph. */
export const titleTask = (title: string | null | undefined) =>
  title
    ?.replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(?:working|needs you|blocked|done|idle)\s*:\s*/iu, "")
    .trim() || null;

/** Chat's state words: the shared marks' words (agentMarks.ts). */
const STATUS_KEYS: Record<string, TranslationKey> = {
  working: "marks.working",
  blocked: "marks.needs",
  done: "marks.done",
  idle: "marks.idle",
};

/** The word for a chat status, or the status itself when it has none. */
export const statusWord = (status: string) =>
  STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status;
