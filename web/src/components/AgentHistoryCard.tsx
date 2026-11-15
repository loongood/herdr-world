import { memo, useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import {
  historyEntryLabel,
  isToolContentPending,
  type HistoryEntry,
} from "./agentHistory";
import { formatBytes } from "./agentSession";
import { useT } from "../i18n";
import { formatUiDateTime } from "../uiLocale";
import { copyTextWithFeedback } from "../copyText";
import "./AgentHistoryCard.css";

export const HISTORY_PREVIEW_CHARS = 4000;

export const AgentHistoryCard = memo(function AgentHistoryCard({
  entry,
  index,
  highlighted = false,
  selected = false,
  contentLoading = false,
  onExpand,
  onLoadContent,
}: {
  entry: HistoryEntry;
  index: number;
  highlighted?: boolean;
  selected?: boolean;
  contentLoading?: boolean;
  onExpand: (entry: HistoryEntry) => void;
  onLoadContent?: (entry: HistoryEntry) => void;
}) {
  const contentRef = useRef<HTMLPreElement>(null);
  const [clipped, setClipped] = useState(false);
  const t = useT();
  const preview = entry.text.slice(0, HISTORY_PREVIEW_CHARS);
  const truncated = clipped || preview.length < entry.text.length;
  const contentPending = isToolContentPending(entry);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const update = () =>
      setClipped(content.scrollHeight > content.clientHeight + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(content);
    return () => observer.disconnect();
  }, [preview]);
  const label = historyEntryLabel(entry);
  return (
    <article
      className={`agent-history-card is-${entry.role} ${highlighted ? "is-minimap-target" : ""} ${selected ? "is-selected" : ""}`}
      data-sequence={index}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button"))
          return;
        onExpand(entry);
      }}
    >
      <div className="agent-history-card-meta">
        <strong className="agent-history-card-role">{label}</strong>
        <small>#{index}</small>
        <time title={entry.sent_at} dateTime={entry.sent_at}>
          {formatUiDateTime(entry.sent_at)}
        </time>
        <span />
        {!contentPending ? (
          <button
            type="button"
            className="agent-history-copy"
            onClick={() => void copyTextWithFeedback(entry.text)}
            aria-label={t("history.copyEntryAria", { index })}
            title={t("history.copy")}
          >
            <Copy size={13} />
          </button>
        ) : null}
      </div>
      {entry.source_call_id ? (
        <div className="agent-history-tool-id" title={entry.source_call_id}>
          {t("history.callId", { id: entry.source_call_id })}
        </div>
      ) : null}
      {contentPending ? (
        <button
          type="button"
          className="agent-history-tool-load"
          disabled={contentLoading}
          onClick={() => onLoadContent?.(entry)}
          aria-label={t(
            entry.kind === "tool_call"
              ? "history.loadAriaCall"
              : "history.loadAriaResult",
            { index },
          )}
        >
          {contentLoading
            ? t("history.loading")
            : t(
                entry.kind === "tool_call"
                  ? "history.loadArguments"
                  : "history.loadOutput",
                { size: formatBytes(entry.text_bytes) ?? "" },
              )}
        </button>
      ) : (
        <button
          type="button"
          className={`agent-history-card-open ${truncated ? "is-truncated" : ""}`}
          onClick={() => onExpand(entry)}
          aria-label={t("history.viewAria", { label, index })}
        >
          {entry.kind === "tool_call" ? (
            <div className="agent-history-tool-label">
              {t("history.arguments")}
            </div>
          ) : entry.kind === "tool_result" ? (
            <div className="agent-history-tool-label">
              {entry.is_error ? t("history.errorOutput") : t("history.output")}
            </div>
          ) : null}
          <pre ref={contentRef}>{preview}</pre>
          {truncated ? (
            <span>
              {entry.role === "tool"
                ? t("history.viewFullTool")
                : t("history.viewFullMessage")}
            </span>
          ) : null}
        </button>
      )}
    </article>
  );
});
