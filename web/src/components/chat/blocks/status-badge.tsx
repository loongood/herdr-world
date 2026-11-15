import { statusWord } from "./now";
import { Check } from "lucide-react";
import { useT } from "../../../i18n";
import "./status-badge.css";
export function ChatStatusBadge({
  status,
  label = statusWord(status),
}: {
  status: string;
  /** Words for a state with its own detail, such as out of fuel. */
  label?: string;
}) {
  // Subscribe to the locale so the word follows a language change.
  useT();
  return (
    <span
      className={`agent-chat-state-circle is-${status.toLowerCase()}`}
      title={label}
    >
      <span className="agent-chat-state-glyph" aria-hidden="true">
        {status === "done" ? (
          <Check size={12} />
        ) : status === "blocked" ? (
          "!"
        ) : null}
      </span>
      <span className="agent-chat-state-word">{label}</span>
    </span>
  );
}
