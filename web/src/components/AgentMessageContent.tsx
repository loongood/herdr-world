import { useState } from "react";
import { Copy, X } from "lucide-react";
import { formatUiDateTime } from "../uiLocale";
import { copyTextWithFeedback } from "../copyText";
import { t, useT } from "../i18n";
import { isToolContentPending } from "./agentHistory";
import { CloseButton } from "./CloseButton";
import { MarkdownPreview } from "./markdown";
import "./AgentMessageContent.css";

export type AgentMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  kind?: "message" | "tool_call" | "tool_result" | "error";
  tool_name?: string;
  source_call_id?: string;
  is_error?: boolean;
  text: string;
  sent_at: string;
  text_bytes?: number;
};

export function agentMessageRoleLabel(message: AgentMessage) {
  return message.role === "tool"
    ? `${message.kind === "tool_call" ? t("agents.toolArgumentsLabel") : message.is_error ? t("agents.toolErrorLabel") : t("agents.toolOutput")}: ${message.tool_name ?? "tool"}`
    : message.role === "assistant"
      ? t("agents.roleAssistant")
      : t("agents.roleUser");
}

// Message rendering is shared by the modal and the inline History reader.
export function AgentMessageContent({
  message,
  embedded = false,
  onClose,
}: {
  message: AgentMessage;
  embedded?: boolean;
  onClose: () => void;
}) {
  const isTool = message.role === "tool";
  const t = useT();
  const [viewMode, setViewMode] = useState<"rendered" | "raw">(
    message.role === "assistant" ? "rendered" : "raw",
  );
  const [viewModeMessageId, setViewModeMessageId] = useState(message.id);
  if (message.id !== viewModeMessageId) {
    // A refreshed snapshot replaces objects, not the user's selected message.
    // Reset only when switching to another entry.
    setViewModeMessageId(message.id);
    setViewMode(message.role === "assistant" ? "rendered" : "raw");
  }
  // Redacted tool entry whose on-demand content has not arrived (yet).
  const contentPending = isToolContentPending(message);
  const roleLabel = agentMessageRoleLabel(message);

  return (
    <>
      <div
        className={`modal-head agent-message-modal-head ${embedded ? "is-embedded" : ""}`}
      >
        <div>
          <h3>{t("agents.messageTitle", { role: roleLabel })}</h3>
          <time dateTime={message.sent_at}>
            {formatUiDateTime(message.sent_at)}
          </time>
          {message.source_call_id ? (
            <p>{t("agents.callIdLabel", { id: message.source_call_id })}</p>
          ) : null}
        </div>
        <div className="agent-message-modal-actions">
          {!isTool ? (
            <button
              type="button"
              className="agent-message-mode-toggle"
              onClick={() =>
                setViewMode((mode) =>
                  mode === "rendered" ? "raw" : "rendered",
                )
              }
              aria-label={
                viewMode === "rendered"
                  ? t("agents.showRawMarkdownAria")
                  : t("agents.showRenderedMarkdownAria")
              }
              title={
                viewMode === "rendered"
                  ? t("agents.showRawTitle")
                  : t("agents.showRenderedTitle")
              }
            >
              {viewMode === "rendered"
                ? t("agents.rawLabel")
                : t("agents.renderedToggle")}
            </button>
          ) : null}
          {!contentPending ? (
            <button
              type="button"
              className="agent-history-icon"
              onClick={() => void copyTextWithFeedback(message.text)}
              aria-label={t("agents.copyMessageAria")}
              title={t("agents.copyTitle")}
            >
              <Copy size={15} />
            </button>
          ) : null}
          {embedded ? (
            <button
              type="button"
              className="agent-history-icon"
              onClick={onClose}
              aria-label={t("agents.closeMessageDetail")}
              title={t("agents.closeDetailTitle")}
            >
              <X size={15} />
            </button>
          ) : (
            <CloseButton label={t("agents.closeMessage")} onClick={onClose} />
          )}
        </div>
      </div>
      {contentPending ? (
        <pre className="agent-message-modal-content">
          {t("agents.loadingToolContent")}
        </pre>
      ) : !isTool && viewMode === "rendered" ? (
        <div className="agent-message-modal-content is-rendered">
          <MarkdownPreview
            text={message.text}
            className="agent-message-markdown"
            breaks
          />
        </div>
      ) : (
        <pre className="agent-message-modal-content">{message.text}</pre>
      )}
    </>
  );
}
