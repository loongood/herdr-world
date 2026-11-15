import type { WorldAsk } from "./worldAsks";
import "../components/AgentMark.css";
import "./worldAsks.css";
import { t } from "../i18n";

/** The same quiet question mark in Board and Desk; the enclosing agent still opens normally. */
export function WorldAskMark({ ask }: { ask?: WorldAsk }) {
  if (!ask) return null;
  return (
    <span
      className="agent-mark world-ask-mark"
      data-mark="asks"
      data-world-ask={ask.id}
      title={t("world.ownerQuestion", { question: ask.question })}
      aria-label={t("world.ownerQuestion", { question: ask.question })}
    >
      ?
    </span>
  );
}
