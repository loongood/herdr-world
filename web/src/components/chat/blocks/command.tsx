import { useT } from "../../../i18n";
import { formatUiDateTime } from "../../../uiLocale";
import { HISTORY_PREVIEW_CHARS } from "../../AgentHistoryCard";
import "./command.css";

export function CommandReceipt({
  text,
  at,
  observed = false,
  detail,
  onDismiss,
  waiting,
}: {
  text: string;
  at: string;
  observed?: boolean;
  /** Herdr queued it while the agent was busy and it has not run yet. */
  waiting?: string;
  detail?: string;
  onDismiss?: () => void;
}) {
  const t = useT();
  return (
    <div
      className="agent-chat-command-receipt"
      data-delivery={observed ? "matched" : waiting ? "waiting" : "unchecked"}
      title={detail}
    >
      <code>{text.slice(0, HISTORY_PREVIEW_CHARS)}</code>
      <span>
        {observed
          ? t("chat.seenInTranscript")
          : (waiting ?? t("chat.sentNotChecked"))}
      </span>
      <time dateTime={at} title={at}>
        {formatUiDateTime(at)}
      </time>
      {onDismiss ? (
        <button type="button" onClick={onDismiss}>
          {t("chat.dismiss")}
        </button>
      ) : null}
    </div>
  );
}
