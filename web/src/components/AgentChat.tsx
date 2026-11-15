import "./AgentChat.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, ListTree, RefreshCw, SquareTerminal } from "lucide-react";
import { useT } from "../i18n";
import { watchConversation } from "../conversationWatch";
import { type ChatFocusIntent, useChatFocusIntent } from "../chatFocus";
import { attachmentUploading } from "../attachmentUploads";
import {
  beginTerminalComposerSubmission,
  finishTerminalComposerSubmission,
  terminalComposerUploadCount,
} from "../terminalComposer";
import { ChatComposer, chatComposerDraftKey } from "./chat/ChatComposer";
import { copyTextWithFeedback } from "../copyText";
import type { Pane } from "../types";
import { useConnectionClient } from "../useConnectionClient";
import { useStoreSelector } from "../store/react";
import { relayNames } from "./chat/chatSenders";
import { AgentHistoryDrawer } from "./AgentHistoryDrawer";
import { AgentHistoryChat } from "./AgentHistoryChat";
import { AgentMessageDialog } from "./AgentMessageDialog";
import type { HistoryEntry } from "./agentHistory";
import { groupHistoryChatItems } from "./agentHistoryView";
import { useAgentHistoryWindow } from "./useAgentHistoryWindow";
import { matchedTurns, placedSends } from "./chat/pendingSends";
import { CodexSessionLink } from "./CodexSessionLink";
import { QuestLog } from "./QuestLog";
import { useStepEvidence } from "./chat/useStepEvidence";
import { useChatBlocks } from "./chat/useChatBlocks";
import { useChatKeys } from "./chat/useChatKeys";
import { isSlashCommand } from "../../../shared/conversationInput";
import { ChatAfterBlocks, decorateChat } from "./chat/blocks/registry";
import { chooseTrust } from "./chat/blocks/trust";
import type { WorkItem } from "../../../shared/worldSources";
import {
  DOUBLE_ESCAPE_MS,
  elapsed,
  STOPS_WITH_ESCAPE,
  titleTask,
} from "./chat/blocks/now";
import type {
  AnswerResult,
  Conversation,
  SendResult,
  TrustChoice,
  UnconfirmedReason,
} from "./chat/types";
import "./chat/blocks/now.css";
import { ChatStatusBadge } from "./chat/blocks/status-badge";
import { useCurrentUsageStop } from "../world/town/townOutOfFuel";
import { useOutOfFuelTrialPane } from "../world/town/townOutOfFuelTrial";
import { usageStopText } from "../../../shared/usageStop";
// After every Chat style it re-skins.
import "./AgentChat.town.css";

export type {
  Conversation,
  ConversationDelivery,
  ConversationMessage,
  PendingPrompt,
} from "./chat/types";

const preview = (text: string) =>
  text.length > 80 ? `${text.slice(0, 79)}…` : text;

/**
 * Chat reads only the conversation read model and sends with Herdr's agent
 * prompt. While Chat shows a pane, the service watches it and pushes
 * `agent_conversation_changed`, so Chat has no timer. It never shows terminal
 * output: the Terminal tab stays a separate choice.
 */
export function AgentChat({
  pane,
  active,
  wide = false,
  onOpenTerminal,
  onClose,
  workSessionFingerprint,
  recipientLabel,
  focusIntent,
}: {
  pane: Pane;
  active: boolean;
  wide?: boolean;
  onOpenTerminal?: () => void;
  onClose: () => void;
  workSessionFingerprint?: string;
  recipientLabel?: string;
  focusIntent?: ChatFocusIntent | null;
}) {
  const localFocusIntent = useChatFocusIntent(
    active && focusIntent === undefined,
  );
  const t = useT();
  const connectionClient = useConnectionClient();
  // The other live agents in this Herdr session whose names are valid and
  // unique there: a message typed here as "name: …" reads as relayed from it.
  const relayFrom = useStoreSelector((state) =>
    JSON.stringify(relayNames(state.panes, pane.pane_id)),
  );
  const transcript = useMemo(
    () => ({
      agent:
        recipientLabel ?? pane.agent_name ?? pane.agent ?? t("chat.agentName"),
      agents: new Set(JSON.parse(relayFrom) as string[]),
    }),
    [relayFrom, pane.agent, pane.agent_name, recipientLabel, t],
  );
  const [conversation, setConversation] = useState<Conversation | null>(null);
  // Set when the newest read failed; the last good conversation stays shown.
  const [stale, setStale] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [details, setDetails] = useState(false);
  const seqRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef<Conversation | null>(null);
  // Chat's status, session and receipts come from the conversation summary
  // (agent_conversation.latest, without messages); the messages themselves
  // are History's window below, so a long, busy transcript is never re-read
  // or re-rendered whole. A burst of change pushes runs at most one more read.
  const inFlightRef = useRef(false);
  const againRef = useRef(false);
  const load = useCallback(() => {
    if (!connectionClient.isCurrent()) return;
    if (inFlightRef.current) {
      againRef.current = true;
      return;
    }
    inFlightRef.current = true;
    const seq = ++seqRef.current;
    setLoading(true);
    connectionClient
      .call("agent_conversation.latest", { pane_id: pane.pane_id, menus: true })
      .then((result) => {
        if (seq !== seqRef.current || !connectionClient.isCurrent()) return;
        const reply = result as Partial<Conversation> | null;
        if (!reply || (reply.status !== "ok" && reply.status !== "unavailable"))
          throw new Error(t("components.agentChat.unreadableConversation"));
        const next = reply as Conversation;
        // A transcript caught mid-write must not replace what was readable.
        if (
          next.unavailable?.reason === "read_failed" &&
          shownRef.current?.status === "ok"
        ) {
          setStale(next.unavailable.detail);
          return;
        }
        shownRef.current = next;
        setConversation(next);
        setStale("");
      })
      .catch((reason: unknown) => {
        if (seq !== seqRef.current) return;
        setStale(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        inFlightRef.current = false;
        if (seq === seqRef.current) setLoading(false);
        if (againRef.current) {
          againRef.current = false;
          loadRef.current();
        }
      });
  }, [connectionClient, pane.pane_id, t]);
  const loadRef = useRef(load);
  loadRef.current = load;
  // Chat's interactions belong to this connection, runtime, pane and session.
  const answerScope = JSON.stringify([
    connectionClient.connectionId,
    connectionClient.generation,
    connectionClient.serverRuntimeGeneration,
    pane.pane_id,
    conversation?.session_fingerprint,
  ]);
  const keys = useChatKeys({
    client: connectionClient,
    paneId: pane.pane_id,
    sessionFingerprint: conversation?.session_fingerprint ?? null,
    scope: answerScope,
    reload: load,
  });
  const { afterCommand } = keys;
  const history = useAgentHistoryWindow({
    pane,
    client: connectionClient,
    active: active && !details,
  });
  const refreshHistory = history.refresh;
  const [expanded, setExpanded] = useState<HistoryEntry | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chatItems = useMemo(
    () => groupHistoryChatItems(history.messages),
    [history.messages],
  );
  const stepEvidence = useStepEvidence({
    client: connectionClient,
    paneId: pane.pane_id,
    sessionFingerprint: conversation?.session_fingerprint ?? null,
    entries: history.messages,
    enabled: active && !details,
  });

  // While visible, ask the service to watch this pane and reread when it says
  // the conversation changed, or after the connection comes back.
  useEffect(() => {
    if (!active || details) return;
    const stop = watchConversation(connectionClient, pane.pane_id, () => {
      load();
      refreshHistory();
    });
    load();
    return stop;
  }, [active, connectionClient, details, load, pane.pane_id, refreshHistory]);

  const send = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text) throw new Error(t("chat.writeFirst"));
      if (!connectionClient.isCurrent() || !conversation?.session_fingerprint)
        throw new Error(t("chat.conversationChanged"));
      if (
        conversation.deliveries?.some(
          (delivery) => delivery.state === "misdelivered",
        )
      )
        throw new Error(t("chat.dismissNoticeFirst"));
      setNotice("");
      const result = (await connectionClient.call("agent_conversation.send", {
        pane_id: pane.pane_id,
        text,
        session_fingerprint: conversation.session_fingerprint,
        baseline: history.messages
          .filter((message) => message.role === "user")
          .map((message) => message.id),
      })) as SendResult;
      if (result.status !== "sent") {
        if (result.reason === "changed") load();
        throw new Error(result.message);
      }
      load();
      refreshHistory();
      if (isSlashCommand(text)) afterCommand();
    },
    [
      connectionClient,
      conversation,
      afterCommand,
      history.messages,
      load,
      pane.pane_id,
      refreshHistory,
    ],
  );

  const dismiss = useCallback(
    (deliveryId: string) => {
      connectionClient
        .call("agent_conversation.dismiss", {
          pane_id: pane.pane_id,
          delivery_id: deliveryId,
        })
        .then(load, load);
    },
    [connectionClient, load, pane.pane_id],
  );

  const draftKey = chatComposerDraftKey(
    connectionClient,
    pane,
    conversation?.session_fingerprint,
  );
  const sendRef = useRef({ send, draftKey });
  sendRef.current = { send, draftKey };
  const askAuthor = useCallback(
    (item: WorkItem) => {
      const current = sendRef.current;
      if (
        terminalComposerUploadCount(current.draftKey) ||
        attachmentUploading(current.draftKey)
      ) {
        setNotice(t("chat.waitUploads"));
        return;
      }
      if (!beginTerminalComposerSubmission(current.draftKey)) return;
      void current
        .send(t("chat.fixFindings", { number: item.number ?? "" }))
        .catch((reason: unknown) =>
          setNotice(reason instanceof Error ? reason.message : String(reason)),
        )
        .finally(() => finishTerminalComposerSubmission(current.draftKey));
    },
    [t],
  );
  const decorationTokens = useChatBlocks({
    entries: history.messages,
    steps: stepEvidence,
    owner: {
      connectionId: connectionClient.connectionId,
      generation: connectionClient.serverRuntimeGeneration,
      paneId: pane.pane_id,
      sessionFingerprint: workSessionFingerprint,
      label: pane.agent_name ?? pane.agent ?? t("chat.theAgent"),
    },
    onAskAuthor:
      conversation?.status === "ok" && conversation.session_fingerprint
        ? askAuthor
        : undefined,
  });

  // The agent's question: answered by pressing one option's key in its pane,
  // only when the user picks it. The service checks the agent still shows
  // this same question just before the key goes.
  const prompt = conversation?.pending_prompt ?? null;
  const latestDelivery =
    conversation?.deliveries?.[conversation.deliveries.length - 1];
  const tooSmall =
    conversation?.status === "ok" &&
    latestDelivery?.kind === "command" &&
    latestDelivery.fingerprint === conversation.session_fingerprint
      ? conversation.menu_unreadable
      : undefined;
  const [answering, setAnswering] = useState(false);
  // The answer sent for a question, shown in its place until another
  // question appears.
  const [answered, setAnswered] = useState<{
    fingerprint: string;
    question: string[];
    number: string;
    label: string;
    text?: string;
    acknowledged: boolean;
    unconfirmed_reason: UnconfirmedReason | null;
  } | null>(null);
  const [askNotice, setAskNotice] = useState<{
    scope: string;
    text: string;
  } | null>(null);
  useEffect(() => setAskNotice(null), [answerScope]);
  const answer = useCallback(
    async (key: string, text?: string) => {
      if (!prompt || answering) return;
      setAnswering(true);
      setAskNotice(null);
      try {
        const result = (await connectionClient.call(
          "agent_conversation.answer",
          {
            pane_id: pane.pane_id,
            key,
            ...(text !== undefined ? { text } : {}),
            prompt_fingerprint: prompt.fingerprint,
          },
        )) as AnswerResult;
        if (result.status === "sent")
          setAnswered({
            fingerprint: result.prompt_fingerprint,
            question: prompt.question,
            number: result.number,
            label: result.label,
            ...(result.text !== undefined ? { text: result.text } : {}),
            acknowledged: result.acknowledged,
            unconfirmed_reason: result.unconfirmed_reason,
          });
        else setAskNotice({ scope: answerScope, text: result.message });
      } catch (reason) {
        setAskNotice({
          scope: answerScope,
          text: reason instanceof Error ? reason.message : String(reason),
        });
      } finally {
        setAnswering(false);
        load();
      }
    },
    [answering, answerScope, connectionClient, load, pane.pane_id, prompt],
  );
  // Claude's folder-trust question, before any session: checked and
  // answered by the service under its pre-session witness.
  const trust = useCallback(
    async (choice: TrustChoice) => {
      if (!prompt?.trust || answering) return;
      setAnswering(true);
      setAskNotice(null);
      const refused = await chooseTrust(
        connectionClient,
        pane.pane_id,
        prompt,
        choice,
      );
      if (refused) setAskNotice({ scope: answerScope, text: refused });
      setAnswering(false);
      load();
    },
    [answering, answerScope, connectionClient, load, pane.pane_id, prompt],
  );
  // A different question replaces the last answer's receipt.
  const showAsk =
    prompt !== null && prompt.fingerprint !== answered?.fingerprint;
  useEffect(() => {
    if (prompt && prompt.fingerprint !== answered?.fingerprint) {
      setAnswered(null);
    }
    // Only a new question resets the receipt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt?.fingerprint]);
  // The Now bar: Herdr's status (newer than the last read), the task in the
  // terminal title, and time since this view saw the status change. A
  // display clock ticks only while something is running; nothing is polled.
  const liveStatus = pane.agent_status || conversation?.agent_status || "";
  const [statusSince, setStatusSince] = useState<number | null>(null);
  const seenStatus = useRef(liveStatus);
  useEffect(() => {
    if (seenStatus.current === liveStatus) return;
    seenStatus.current = liveStatus;
    setStatusSince(Date.now());
  }, [liveStatus]);
  // An open call is running only while Herdr says the agent works: a call
  // waiting for approval, or one cut off by an interrupt or crash, is not.
  const running =
    liveStatus === "working" ? (conversation?.running_tool ?? null) : null;
  // Out of fuel: stopped on its usage limit, in Town's words, until the
  // limit resets or the agent works again.
  const trialStop = useOutOfFuelTrialPane(pane);
  const usageStop = useCurrentUsageStop(conversation?.usage_stop ?? trialStop);
  const fuel =
    usageStop && liveStatus !== "working"
      ? usageStopText(usageStop, Date.now())
      : null;
  const ticking = liveStatus === "working";
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);
  // Stop presses Esc in the agent's pane, only when the user asks: the Stop
  // button, or Esc twice while Chat has focus.
  const agentName = conversation?.agent ?? pane.agent ?? "";
  const canStop = liveStatus === "working" && STOPS_WITH_ESCAPE.has(agentName);
  const [stopNote, setStopNote] = useState("");
  const stop = useCallback(async () => {
    try {
      await connectionClient.call("pane.send_input", {
        pane_id: pane.pane_id,
        text: "",
        keys: ["escape"],
      });
      setStopNote(
        t("chat.pressedEsc", { name: agentName || t("chat.theAgent") }),
      );
    } catch (reason) {
      setStopNote(reason instanceof Error ? reason.message : String(reason));
    }
  }, [agentName, connectionClient, pane.pane_id, t]);
  const firstEscape = useRef(0);
  useEffect(() => {
    if (!canStop) return;
    let expire = 0;
    const keydown = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing ||
        !(event.target instanceof HTMLElement) ||
        !event.target.closest(".agent-chat")
      )
        return;
      const now = Date.now();
      window.clearTimeout(expire);
      if (now - firstEscape.current < DOUBLE_ESCAPE_MS) {
        firstEscape.current = 0;
        void stop();
      } else {
        firstEscape.current = now;
        const note = t("chat.pressEscAgain", {
          name: agentName || t("chat.theAgent"),
        });
        setStopNote(note);
        // The note holds only while a second Esc would stop.
        expire = window.setTimeout(
          () => setStopNote((current) => (current === note ? "" : current)),
          DOUBLE_ESCAPE_MS,
        );
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.clearTimeout(expire);
      window.removeEventListener("keydown", keydown);
    };
  }, [agentName, canStop, stop, t]);
  // A new turn clears the last stop note.
  useEffect(() => {
    if (liveStatus !== "working") setStopNote("");
  }, [liveStatus]);

  if (details) {
    return (
      <div className="agent-chat is-details">
        <div className="agent-chat-toolbar">
          <button type="button" onClick={() => setDetails(false)}>
            {t("chat.backToChat")}
          </button>
        </div>
        <AgentHistoryDrawer
          pane={pane}
          open={active}
          embedded
          wide={wide}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        />
      </div>
    );
  }

  // No session means there is no record to read. A named transcript that
  // disappeared (file_missing) or a failed read still needs its error.
  const noRecord =
    conversation?.status === "unavailable" &&
    !conversation.session_fingerprint &&
    !conversation.session_binding &&
    history.messages.length === 0 &&
    ["no_session", "codex_unlinked", "no_messages_yet"].includes(
      conversation.unavailable?.reason ?? "",
    );
  const unavailable = noRecord ? null : conversation?.unavailable;
  const deliveries = conversation?.deliveries ?? [];
  const pending = deliveries.filter(
    (delivery) =>
      delivery.kind !== "command" &&
      (delivery.state === "pending" || delivery.state === "unverified") &&
      delivery.fingerprint === conversation?.session_fingerprint,
  );
  const commands = deliveries.filter(
    (delivery) => delivery.kind === "command" && delivery.state !== "matched",
  );
  const matched = matchedTurns(deliveries, conversation?.session_fingerprint);
  // Sent to a session the pane has since left: still checked there.
  const elsewhere = deliveries.filter(
    (delivery) =>
      delivery.kind !== "command" &&
      delivery.state === "pending" &&
      delivery.fingerprint !== conversation?.session_fingerprint,
  );
  const misdelivered = deliveries.filter(
    (delivery) =>
      delivery.kind !== "command" && delivery.state === "misdelivered",
  );
  const unverified = deliveries.filter(
    (delivery) =>
      delivery.kind !== "command" &&
      (delivery.state === "uncertain" ||
        (delivery.state === "unverified" &&
          delivery.fingerprint !== conversation?.session_fingerprint)),
  );
  const canSend =
    conversation?.status === "ok" && !!conversation.session_fingerprint;
  return (
    <div className="agent-chat">
      <div className="agent-chat-toolbar agent-chat-now">
        {/* Only the status and task are announced; the clocks are not. */}
        <span className="agent-chat-now-live" aria-live="polite">
          {fuel ? (
            <ChatStatusBadge status="fuel" label={t("chat.outOfFuel")} />
          ) : (
            <ChatStatusBadge status={liveStatus} />
          )}
          <span
            className="agent-chat-now-title"
            title={fuel ?? conversation?.terminal_title ?? ""}
          >
            {fuel ?? titleTask(conversation?.terminal_title)}
          </span>
        </span>
        {stopNote ? (
          <span className="agent-chat-now-note" role="status" title={stopNote}>
            {stopNote}
          </span>
        ) : null}
        {statusSince !== null && ticking ? (
          <span className="agent-chat-now-time" aria-hidden="true">
            {elapsed(clock - statusSince)}
          </span>
        ) : null}
        {canStop ? (
          <button
            type="button"
            className="agent-chat-stop"
            title={
              // A touch screen has no Esc key to point to.
              window.matchMedia?.("(pointer: coarse)").matches
                ? t("chat.stopTouchTitle")
                : t("chat.stopTitle")
            }
            onClick={() => void stop()}
          >
            ■ {t("chat.stop")} <kbd>Esc</kbd>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            load();
            refreshHistory();
          }}
          disabled={loading}
          aria-label={t("chat.refreshConversation")}
          title={t("chat.refresh")}
        >
          <RefreshCw size={13} />
        </button>
        <button
          type="button"
          onClick={() => setDetails(true)}
          aria-label={t("chat.showDetails")}
          title={t("chat.detailsTitle")}
        >
          <ListTree size={13} /> {t("chat.details")}
        </button>
      </div>
      {misdelivered.map((delivery) => (
        <div key={delivery.id} className="agent-chat-misdelivered" role="alert">
          {delivery.evidence === "herdr" ? (
            <>
              <strong>{t("chat.misdeliveredHerdrTitle")}</strong>
              <span>
                {t("chat.misdeliveredHerdrBody", {
                  to: delivery.delivered_to ?? "",
                  text: preview(delivery.text),
                  expected: delivery.expected,
                })}
              </span>
            </>
          ) : (
            <>
              <strong>{t("chat.misdeliveredTitle")}</strong>
              <span>
                {t("chat.misdeliveredBody", {
                  text: preview(delivery.text),
                  to: delivery.delivered_to ?? "",
                  expected: delivery.expected,
                })}
              </span>
            </>
          )}
          <button type="button" onClick={() => dismiss(delivery.id)}>
            {t("chat.dismiss")}
          </button>
        </div>
      ))}
      {unverified.map((delivery) => (
        <div
          key={delivery.id}
          className="agent-chat-misdelivered is-unverified"
          role="status"
        >
          <strong>
            {delivery.state === "uncertain"
              ? t("chat.uncertainTitle")
              : t("chat.uncheckableTitle")}
          </strong>
          <span>
            {t("chat.unverifiedBody", {
              text: preview(delivery.text),
              expected: delivery.expected,
              detail: delivery.detail ?? "",
            })}
          </span>
          <button type="button" onClick={() => dismiss(delivery.id)}>
            {t("chat.dismiss")}
          </button>
        </div>
      ))}
      {elsewhere.map((delivery) => (
        <p
          key={delivery.id}
          className="agent-chat-elsewhere"
          role="status"
          data-delivery="elsewhere"
        >
          {t("chat.stillChecking", {
            expected: delivery.expected,
            text: preview(delivery.text),
          })}{" "}
          <button
            type="button"
            className="agent-chat-pending-dismiss"
            onClick={() => dismiss(delivery.id)}
          >
            {t("chat.stopChecking")}
          </button>
        </p>
      ))}
      {stale ? (
        <p className="agent-chat-stale" role="status">
          {t("chat.staleBody", { detail: stale })}
        </p>
      ) : null}
      {/* History's read failed: keep its last good window, if any, and say
          so; Refresh retries it. */}
      {!stale && !unavailable && history.error ? (
        <p className="agent-chat-stale" role="status">
          {history.history
            ? t("chat.historyStaleBody", { detail: history.error })
            : t("chat.historyErrorBody", { detail: history.error })}
        </p>
      ) : null}
      {unavailable ? (
        <div className="agent-chat-unavailable" role="status">
          <strong>{t("chat.unavailableTitle")}</strong>
          <span>{unavailable.detail}</span>
          {unavailable.command ? (
            <span className="agent-chat-command">
              <code>{unavailable.command}</code>
              <button
                type="button"
                onClick={() => void copyTextWithFeedback(unavailable.command!)}
              >
                <Copy size={13} /> {t("chat.copyCommand")}
              </button>
            </span>
          ) : null}
          {unavailable.reason === "codex_unlinked" ? (
            <div className="agent-chat-link">
              <CodexSessionLink
                paneId={pane.pane_id}
                client={connectionClient}
                onLinked={load}
              />
            </div>
          ) : null}
          <span className="agent-chat-actions">
            <button type="button" onClick={load} disabled={loading}>
              <RefreshCw size={13} /> {t("chat.refresh")}
            </button>
            {onOpenTerminal ? (
              <button type="button" onClick={onOpenTerminal}>
                <SquareTerminal size={13} /> {t("chat.openTerminal")}
              </button>
            ) : null}
          </span>
          {unavailable.issue ? (
            <a href={unavailable.issue} target="_blank" rel="noreferrer">
              {t("chat.knownIssue")}
            </a>
          ) : null}
        </div>
      ) : (
        <div className="agent-chat-list">
          {/* A question card stands in for the empty conversation. */}
          {history.messages.length === 0 &&
          (history.error || !(showAsk && prompt)) ? (
            <p
              className={
                history.error
                  ? "agent-chat-error"
                  : noRecord || history.history
                    ? "agent-chat-empty"
                    : "agent-chat-empty is-loading"
              }
            >
              {history.error
                ? t("chat.errorEmpty")
                : noRecord || history.history
                  ? t("chat.noMessages")
                  : t("chat.loadingConversation")}
            </p>
          ) : null}
          <AgentHistoryChat
            items={chatItems}
            transcript={transcript}
            listRef={listRef}
            contentRef={contentRef}
            followKey={JSON.stringify([
              connectionClient.connectionId,
              connectionClient.serverRuntimeGeneration,
              pane.pane_id,
              conversation?.session_fingerprint,
            ])}
            countNewAgentMessages
            toolLoading={history.toolEntryLoading}
            onLoadTool={history.loadToolEntry}
            placed={[
              ...(conversation?.quest
                ? [
                    {
                      key: `quest:${conversation.session_fingerprint}:${conversation.quest.started_at}`,
                      at: conversation.quest.started_at,
                      node: (
                        <QuestLog
                          key={`${conversation.session_fingerprint}:${conversation.quest.started_at}`}
                          quest={conversation.quest}
                          compact
                        />
                      ),
                    },
                  ]
                : []),
              ...placedSends(
                [...pending, ...commands],
                recipientLabel ??
                  conversation?.agent ??
                  pane.agent ??
                  t("chat.theAgent"),
                dismiss,
              ),
            ]}
            hasOlder={history.hasOlder}
            olderLoading={history.olderLoading}
            onLoadOlder={history.loadOlder}
            onAtLatest={history.dropOlder}
            onOpen={setExpanded}
            matchedIds={matched}
            decorate={decorateChat}
            decorationTokens={decorationTokens}
            after={
              <ChatAfterBlocks
                key={answerScope}
                running={running}
                clock={clock}
                answered={answered}
                prompt={showAsk ? prompt : null}
                tooSmall={tooSmall}
                agent={conversation?.agent ?? t("chat.theAgentSentence")}
                answering={answering}
                notice={
                  keys.notice ||
                  (askNotice?.scope === answerScope ? askNotice.text : "")
                }
                onAnswer={(key, text) => void answer(key, text)}
                pressing={keys.pressing}
                onPress={(key) => keys.pressMenu(prompt!.fingerprint, key)}
                onType={(text) => keys.pressMenu(prompt!.fingerprint, "", text)}
                onOpenTerminal={onOpenTerminal}
                onTrust={(choice) => void trust(choice)}
              />
            }
          />
          <AgentMessageDialog
            message={expanded}
            onClose={() => setExpanded(null)}
          />
        </div>
      )}
      {noRecord ? (
        <div className="agent-chat-starting agent-chat-guessed" role="status">
          <span>{conversation?.unavailable?.detail}</span>
          {onOpenTerminal ? (
            <button type="button" onClick={onOpenTerminal}>
              <SquareTerminal size={13} /> {t("chat.openTerminal")}
            </button>
          ) : null}
          {conversation?.unavailable?.command ? (
            <span className="agent-chat-command">
              <code>{conversation.unavailable.command}</code>
              <button
                type="button"
                onClick={() =>
                  void copyTextWithFeedback(conversation.unavailable!.command!)
                }
              >
                <Copy size={13} /> {t("chat.copyCommand")}
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
      {conversation?.status === "ok" && !canSend ? (
        <div className="agent-chat-guessed" role="status">
          <span>
            {conversation.session_binding === "title"
              ? t("chat.codexTitleGuess")
              : t("chat.folderGuess")}
          </span>
          {onOpenTerminal ? (
            <button type="button" onClick={onOpenTerminal}>
              <SquareTerminal size={13} /> {t("chat.openTerminal")}
            </button>
          ) : null}
        </div>
      ) : null}
      {canSend ? (
        <ChatComposer
          active={active}
          focusIntent={
            focusIntent === undefined ? localFocusIntent : focusIntent
          }
          client={connectionClient}
          pane={pane}
          fingerprint={conversation?.session_fingerprint ?? ""}
          recipient={
            recipientLabel ??
            conversation?.agent ??
            pane.agent ??
            t("chat.agentName")
          }
          notice={notice}
          disabledReason={
            misdelivered.length
              ? t("chat.dismissNoticeFirst")
              : conversation?.pending_prompt?.menu
                ? t("chat.menuOpenDisabled")
                : undefined
          }
          onSubmit={send}
          onKey={(key) =>
            void keys.press(key).then((refused) => {
              if (refused) setNotice(refused);
            })
          }
          onError={setNotice}
        />
      ) : conversation === null ? (
        // The composer's room while the first read is out, so the list does
        // not shrink under the reader when the composer arrives.
        <div className="agent-chat-composer is-reserved" aria-hidden="true" />
      ) : null}
    </div>
  );
}
