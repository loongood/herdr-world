import { SquareTerminal } from "lucide-react";
import type { ReactNode } from "react";
import { t, useT } from "../../../i18n";
import type { PendingPrompt, TrustChoice, TrustResult } from "../types";
import "./ask.css";

/**
 * Pick one of Claude's folder-trust choices for this pane. Returns why
 * nothing was confirmed, or "" once Enter was sent. The service checks the
 * question and that Claude still has no session before every key.
 */
export async function chooseTrust(
  client: {
    call(method: string, params: Record<string, unknown>): Promise<unknown>;
    isCurrent?(): boolean;
  },
  paneId: string,
  prompt: PendingPrompt,
  choice: TrustChoice,
): Promise<string> {
  if (client.isCurrent && !client.isCurrent())
    return t("chat.connectionChanged");
  try {
    const result = (await client.call("agent_conversation.trust", {
      pane_id: paneId,
      prompt_fingerprint: prompt.fingerprint,
      choice,
    })) as TrustResult;
    if (result.status === "refused") return result.message;
    return result.acknowledged
      ? ""
      : t("chat.trustSentUnconfirmed", { label: result.label });
  } catch (reason) {
    return reason instanceof Error ? reason.message : String(reason);
  }
}

/**
 * Claude's folder-trust question, asked before it starts a session: its
 * text, the folder, and its two choices in Claude's order, with the one its
 * cursor is on marked. A click is the choice; nothing is preselected here.
 */
export function TrustCard({
  prompt,
  choosing,
  notice,
  onChoose,
  onOpenTerminal,
  renderMessage,
}: {
  prompt: PendingPrompt;
  choosing: boolean;
  notice: string;
  onChoose(choice: TrustChoice): void;
  onOpenTerminal?: () => void;
  renderMessage?: (message: ReactNode) => ReactNode;
}) {
  const t = useT();
  const message = (
    <>
      {prompt.request.length ? <pre>{prompt.request.join("\n")}</pre> : null}
      {prompt.question.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </>
  );
  const terminal = onOpenTerminal ? (
    <button type="button" onClick={onOpenTerminal}>
      <SquareTerminal size={13} /> {t("chat.openTerminal")}
    </button>
  ) : null;
  return (
    <section
      className="agent-chat-ask agent-chat-trust"
      aria-label={t("chat.trustAria")}
    >
      <h3>{t("chat.trustAria")}</h3>
      {renderMessage ? renderMessage(message) : message}
      <div
        className="agent-chat-ask-options"
        role="group"
        aria-label={t("chat.choicesAria")}
      >
        {prompt.options.map((option) => (
          <button
            key={option.key}
            type="button"
            className={option.cursor ? "is-cursor" : undefined}
            disabled={choosing}
            onClick={() => onChoose(option.key as TrustChoice)}
          >
            <span className="agent-chat-ask-label">
              {option.label}
              {option.cursor ? (
                <small>{t("chat.selectedInTerminal")}</small>
              ) : null}
            </span>
          </button>
        ))}
      </div>
      <p className="agent-chat-ask-fine">
        {t("chat.trustNote")} {terminal}
      </p>
      {notice ? (
        <p className="agent-chat-ask-notice" role="alert">
          {notice} {terminal}
        </p>
      ) : null}
    </section>
  );
}
