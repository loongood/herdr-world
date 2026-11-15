import { SquareTerminal } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useT } from "../../../i18n";
import type { TranslationKey } from "../../../i18n/en";
import type { PendingPrompt, UnconfirmedReason } from "../types";
import "./ask.css";

export const UNCONFIRMED_KEYS: Record<UnconfirmedReason, TranslationKey> = {
  no_progress: "chat.unconfirmedNoProgress",
  still_showing: "chat.unconfirmedStillShowing",
  session_changed: "chat.unconfirmedSessionChanged",
  unknown_status: "chat.unconfirmedUnknownStatus",
  agent_missing: "chat.unconfirmedAgentMissing",
  unreadable: "chat.unconfirmedUnreadable",
};

/**
 * The agent's own question, with its options as buttons. The options are read
 * from the agent's prompt and each presses that option's key; when none can be
 * read, Chat shows the question and the way to the Terminal instead of
 * guessing.
 */
export function AskCard({
  agent,
  prompt,
  answering,
  notice,
  onAnswer,
  onOpenTerminal,
  renderMessage,
}: {
  agent: string;
  prompt: PendingPrompt;
  answering: boolean;
  notice: string;
  onAnswer(key: string, text?: string): void;
  onOpenTerminal?: () => void;
  renderMessage?: (message: ReactNode) => ReactNode;
}) {
  const screenRef = useRef<HTMLPreElement>(null);
  const t = useT();
  useLayoutEffect(() => {
    const block = screenRef.current;
    if (block) block.scrollTop = block.scrollHeight;
  }, [prompt]);
  const nativeEditor = prompt.options.some((option) => option.active);
  const options = nativeEditor ? [] : prompt.options;
  const [textKey, setTextKey] = useState<string | null>(null);
  const [text, setText] = useState("");
  const textOption = options.find((option) => option.key === textKey);
  const choose = (key: string) => {
    const option = options.find((item) => item.key === key);
    if (option?.input) setTextKey(key);
    else onAnswer(key);
  };
  const terminal = onOpenTerminal ? (
    <button type="button" onClick={onOpenTerminal}>
      <SquareTerminal size={13} /> {t("chat.answerInTerminal")}
    </button>
  ) : null;
  // Without keys, Claude's own record of its questions is shown whole, or
  // else the prompt as the terminal draws it, never a clipped tail.
  const message = (
    <>
      {prompt.request.length ? <pre>{prompt.request.join("\n")}</pre> : null}
      {prompt.asked && !options.length ? (
        <AskedQuestions asked={prompt.asked} />
      ) : prompt.screen && !options.length ? (
        <pre
          ref={screenRef}
          className="agent-chat-ask-screen"
          aria-label={t("chat.promptScreenAria")}
        >
          {prompt.screen.join("\n")}
        </pre>
      ) : (
        prompt.question.map((line, index) => <p key={index}>{line}</p>)
      )}
    </>
  );
  return (
    <section
      className="agent-chat-ask"
      aria-label={t("chat.isWaiting", { agent })}
      // Keys answer only while this card has focus, and a held key repeats
      // nothing: another Chat's question is never answered from here.
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.repeat ||
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          answering ||
          (event.target instanceof HTMLElement &&
            event.target.closest(
              "input, textarea, button, [contenteditable=true]",
            ))
        )
          return;
        const option = options.find(
          (candidate) => candidate.number === event.key,
        );
        if (!option) return;
        event.preventDefault();
        choose(option.key);
      }}
    >
      <h3>{t("chat.waitingOnYou", { agent })}</h3>
      {prompt.steps?.length ? (
        // A form asks its questions one at a time, then submits them all.
        <ol
          className="agent-chat-ask-steps"
          aria-label={t("chat.formQuestionsAria")}
        >
          {prompt.steps.map((step, index) => (
            <li
              key={index}
              className={step.answered ? "is-answered" : undefined}
              aria-label={
                step.answered
                  ? t("chat.stepAnsweredAria", { label: step.label })
                  : t("chat.stepWaitingAria", { label: step.label })
              }
            >
              <span aria-hidden="true">{step.answered ? "☒" : "☐"}</span>{" "}
              {step.label}
            </li>
          ))}
        </ol>
      ) : null}
      {renderMessage ? renderMessage(message) : message}
      {options.length ? (
        <>
          <div
            className="agent-chat-ask-options"
            role="group"
            aria-label={t("chat.answersAria")}
          >
            {options.map((option, index) => (
              <button
                key={option.number}
                type="button"
                className={index === 0 ? "is-primary" : undefined}
                disabled={answering}
                aria-expanded={
                  option.input ? textKey === option.key : undefined
                }
                onClick={() => choose(option.key)}
              >
                <kbd>{option.number}</kbd>
                <span className="agent-chat-ask-label">
                  {option.label}
                  {option.description ? (
                    <small>{option.description}</small>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          {textOption?.input ? (
            <form
              className="agent-chat-ask-text"
              onSubmit={(event) => {
                event.preventDefault();
                if (text.trim() && !answering) onAnswer(textOption.key, text);
              }}
            >
              <label>
                {textOption.label}
                <input
                  type="text"
                  value={text}
                  maxLength={4000}
                  required
                  autoFocus
                  disabled={answering}
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <button type="submit" disabled={answering || !text.trim()}>
                {t("chat.sendTextAnswer")}
              </button>
            </form>
          ) : null}
          <p className="agent-chat-ask-fine">
            {t("chat.optionsNote", { agent })}
          </p>
        </>
      ) : (
        <p className="agent-chat-ask-fine">
          {nativeEditor
            ? t("chat.editorOpenNote")
            : (prompt.unanswerable ?? t("chat.unreadableChoicesNote"))}{" "}
          {terminal}
        </p>
      )}
      {notice ? (
        <p className="agent-chat-ask-notice" role="alert">
          {notice} {terminal}
        </p>
      ) : null}
    </section>
  );
}

/**
 * The questions as Claude recorded them: each header, question, option and
 * description, whether several may be picked, and the free-text and
 * discussion choices Claude adds. Shown for reading only: the answer goes in
 * the Terminal.
 */
function AskedQuestions({
  asked,
}: {
  asked: NonNullable<PendingPrompt["asked"]>;
}) {
  const t = useT();
  const typeHint = (kind: string) =>
    kind === "number" ? t("chat.typeNumber") : t("chat.typeSomething");
  return (
    <ol className="agent-chat-asked" aria-label={t("chat.questionsAskedAria")}>
      {asked.questions.map((item, index) => (
        <li
          key={index}
          aria-current={asked.current === index ? "step" : undefined}
        >
          {item.header ? (
            <span className="agent-chat-asked-header">{item.header}</span>
          ) : null}
          <p>{item.question}</p>
          {item.kind === "choice" ? (
            <ul
              className="agent-chat-asked-options"
              aria-label={
                item.multi_select ? t("chat.pickAny") : t("chat.pickOne")
              }
            >
              {item.options.map((option, number) => (
                <li key={number}>
                  <span aria-hidden="true">
                    {item.multi_select ? "☐" : "○"}
                  </span>
                  <span className="agent-chat-ask-label">
                    {option.label}
                    {option.description ? (
                      <small>{option.description}</small>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <span className="agent-chat-asked-more">
            <input
              type="text"
              disabled
              placeholder={typeHint(item.kind)}
              aria-label={`${typeHint(item.kind)} ${t("chat.answerInTerminalAria")}`}
            />
            {item.kind === "choice" && !item.multi_select ? (
              <button type="button" disabled>
                {t("chat.chatAboutThis")}
              </button>
            ) : null}
          </span>
          {item.multi_select ? (
            <small className="agent-chat-asked-note">
              {t("chat.multiSelectNote")}
            </small>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
