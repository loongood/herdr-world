import { useEffect, useRef, useState } from "react";
import { t, useT } from "../../i18n";
import {
  type AnswerNotice,
  type AnswerNotices,
  sharedAnswerDeliveries,
  useAnswerDeliveries,
  type WorldAnswerDeliveriesStore,
} from "../worldAnswerDeliveries";
import { askerName } from "../worldAsks";
import type { AnswerRecipientView } from "./answerOutbox";
import type { TownAsker } from "./townAskers";
import "./answerDeliveries.css";
export type AnswerDeliveryActions = Pick<
  WorldAnswerDeliveriesStore,
  "decide" | "refresh" | "older"
>;
const DELIVERY_LABEL_KEYS = {
  pending: "outbox.labelPending",
  claimed: "outbox.labelClaimed",
  dispatching: "outbox.labelDispatching",
  uncertain: "outbox.labelUncertain",
  refused: "outbox.labelRefused",
  delivered: "outbox.labelDelivered",
  cancelled: "outbox.labelCancelled",
} as const;

export const answerDeliveryLabel = (state: AnswerNotice["delivery"]["state"]) =>
  t(DELIVERY_LABEL_KEYS[state]);
/** Full saved-answer cards live in Summary; the rail is only a route here. */
export function AnswerDeliveries({
  state,
  actions,
  focusKey = 0,
  recipient,
  open,
}: {
  state: AnswerNotices;
  actions: AnswerDeliveryActions;
  focusKey?: number;
  recipient?(notice: AnswerNotice): AnswerRecipientView;
  open?(target: TownAsker): void;
}) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null),
    region = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (focusKey) {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start" });
    }
  }, [focusKey]);
  useEffect(() => {
    const sent = state.entries.find(
      (entry) => entry.delivery.state === "delivered",
    );
    if (sent)
      setStatus(
        sent.delivery.received_at !== undefined
          ? t("outbox.deliveryCli", { name: askerName(sent.ask) })
          : t("outbox.sentTo", { name: askerName(sent.ask) }),
      );
  }, [state.entries]);
  const decide: AnswerDeliveryActions["decide"] = async (notice, action) => {
    const index = state.entries.findIndex(
      (entry) => entry.ask.id === notice.ask.id,
    );
    const error = await actions.decide(notice, action);
    setStatus(
      error ??
        (action === "resend"
          ? t("outbox.sendRequested")
          : t("outbox.dismissedSaved")),
    );
    if (!error)
      requestAnimationFrame(() => {
        const cards =
          region.current?.querySelectorAll<HTMLElement>(".answer-delivery");
        (
          cards?.[Math.min(index, cards.length - 1)] ?? heading.current
        )?.focus();
      });
    return error;
  };
  return (
    <section
      ref={region}
      className="answer-deliveries"
      aria-label={t("outbox.outboxAria")}
    >
      <h3 ref={heading} tabIndex={-1}>
        {t("outbox.outbox")}{" "}
        <span>
          {(state.counts?.checks ?? 0) +
            (state.counts?.waiting ?? state.entries.length)}
        </span>
      </h3>
      <p className="answer-deliveries-help">{t("outbox.help")}</p>
      <p className="answer-delivery-live" role="status" aria-live="polite">
        {status}
      </p>
      {state.error ? (
        <p role="alert">
          {state.error}{" "}
          <button type="button" onClick={() => void actions.refresh()}>
            {t("outbox.refresh")}
          </button>
        </p>
      ) : null}
      <div className="answer-deliveries-list" aria-busy={state.loading}>
        {state.entries.map((notice) => (
          <AnswerDeliveryCard
            key={`${notice.ask.id}:${notice.ask.answer?.occurrence}`}
            notice={notice}
            decide={decide}
            recipient={recipient?.(notice)}
            open={open}
          />
        ))}
        {!state.entries.length && !state.error && !state.loading ? (
          <p className="answer-deliveries-help">{t("outbox.empty")}</p>
        ) : null}
      </div>
      {state.next || state.older ? (
        <div className="answer-delivery-actions">
          {state.older ? (
            <button
              type="button"
              disabled={state.loading}
              onClick={() => void actions.refresh()}
            >
              {t("outbox.newest")}
            </button>
          ) : null}
          {state.next ? (
            <button
              type="button"
              disabled={state.loading}
              onClick={() => void actions.older()}
            >
              {t("outbox.older")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
export function AnswerDeliveryCard({
  notice,
  decide,
  recipient,
  open,
}: {
  notice: AnswerNotice;
  decide: AnswerDeliveryActions["decide"];
  recipient?: AnswerRecipientView;
  open?(target: TownAsker): void;
}) {
  const t = useT();
  const { ask, delivery } = notice,
    name = recipient?.name ?? askerName(ask);
  const [confirm, setConfirm] = useState<AnswerNotice | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const card = useRef<HTMLElement>(null),
    sendButton = useRef<HTMLButtonElement>(null),
    confirmation = useRef<HTMLButtonElement>(null);
  const active = ["claimed", "dispatching"].includes(delivery.state),
    finished = ["delivered", "cancelled"].includes(delivery.state);
  useEffect(() => {
    if (confirm) confirmation.current?.focus();
  }, [confirm]);
  useEffect(() => {
    if (
      confirm &&
      !busy &&
      (confirm.delivery.attempt !== delivery.attempt ||
        confirm.delivery.state !== delivery.state)
    ) {
      setConfirm(null);
      setError(t("outbox.deliveryChanged"));
      requestAnimationFrame(() =>
        (sendButton.current ?? card.current)?.focus(),
      );
    }
  }, [confirm, busy, delivery.attempt, delivery.state]);
  const act = async (action: "resend" | "close") => {
    setBusy(true);
    setError(null);
    try {
      setError(
        await decide(action === "resend" && confirm ? confirm : notice, action),
      );
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };
  const refusedMessage = /session changed|binding changed/i.test(
    delivery.reason ?? "",
  )
    ? t("outbox.refusedSession", { name })
    : /ended|removed/i.test(delivery.reason ?? "")
      ? t("outbox.refusedEnded", { name })
      : t("outbox.refusedDefault");
  const message = active
    ? t("outbox.waitResult")
    : delivery.state === "uncertain"
      ? t("outbox.uncertain", { name })
      : delivery.state === "delivered"
        ? delivery.received_at !== undefined
          ? t("outbox.deliveryCli", { name })
          : t("outbox.sentTo", { name })
        : delivery.state === "refused"
          ? refusedMessage
          : /offline|reconnect/.test(delivery.reason ?? "")
            ? t("outbox.waitingReconnect")
            : t("outbox.waitingSession");

  return (
    <article
      ref={card}
      tabIndex={-1}
      className={`answer-delivery answer-delivery-${delivery.state}`}
      aria-label={t("outbox.cardAria", { name })}
    >
      <div className="answer-delivery-heading">
        <b>{name}</b>
        <span>
          {delivery.received_at !== undefined
            ? t("outbox.receivedCli")
            : answerDeliveryLabel(delivery.state)}
        </span>
      </div>
      <p>{ask.question}</p>
      <p className="answer-delivery-answer">
        <span>{t("outbox.yourAnswer")}</span> {ask.answer?.text}
      </p>
      <p className="answer-delivery-status">{message}</p>
      {delivery.prior_uncertainty && delivery.state !== "uncertain" ? (
        <p className="answer-delivery-status">{t("outbox.earlierArrived")}</p>
      ) : null}
      <details>
        <summary>{t("outbox.details")}</summary>
        <p
          title={`${ask.actor.connection_id ?? t("outbox.unverified")} · ${ask.actor.pane_id ?? t("outbox.unknownPane")}`}
        >
          {t("outbox.toLine", {
            name,
            location: recipient?.location ?? t("outbox.originalHost"),
          })}
        </p>
        {delivery.reason ? <p>{delivery.reason}</p> : null}
        {delivery.attempts?.length ? (
          <ul>
            {delivery.attempts.map((attempt) => (
              <li key={attempt.attempt}>
                {t("outbox.attemptLabel", { count: attempt.attempt })}{" "}
                {answerDeliveryLabel(
                  attempt.state as AnswerNotice["delivery"]["state"],
                ) ?? attempt.state}{" "}
                — {attempt.reason}
              </li>
            ))}
          </ul>
        ) : null}
        <p>
          {t("outbox.readablePrefix")}
          <code>herdr-world ask get {ask.id}</code>
          {t("outbox.readableSuffix")}
        </p>
        <p>{t("outbox.submissionNote")}</p>
      </details>
      {confirm ? (
        <div
          className="answer-delivery-confirm"
          role="group"
          aria-label={t("outbox.confirmAria")}
        >
          <p>{t("outbox.confirmText", { name })}</p>
          <div className="answer-delivery-actions">
            <button
              ref={confirmation}
              type="button"
              disabled={busy}
              onClick={() => void act("resend")}
            >
              {t("outbox.sendAgain")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirm(null);
                requestAnimationFrame(() =>
                  (sendButton.current ?? card.current)?.focus(),
                );
              }}
            >
              {t("outbox.cancel")}
            </button>
          </div>
        </div>
      ) : !active && !finished ? (
        <div className="answer-delivery-actions">
          {delivery.state === "uncertain" && notice.can_resend ? (
            <button
              ref={sendButton}
              type="button"
              disabled={busy}
              onClick={() => setConfirm(notice)}
            >
              {t("outbox.sendAgainEllipsis")}
            </button>
          ) : null}
          {delivery.state === "refused" && recipient?.target && open ? (
            <button type="button" onClick={() => open(recipient.target!)}>
              {recipient.target.terminal
                ? t("outbox.openTerminal")
                : t("outbox.openAgent")}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={t("outbox.dismissAria", { name })}
            disabled={busy}
            onClick={() => void act("close")}
          >
            {delivery.state === "pending"
              ? t("outbox.cancelSend")
              : t("outbox.dismiss")}
          </button>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </article>
  );
}
export function ConnectedAnswerDeliveries(
  props: Omit<Parameters<typeof AnswerDeliveries>[0], "state" | "actions">,
) {
  const store = sharedAnswerDeliveries();
  return (
    <AnswerDeliveries
      {...props}
      state={useAnswerDeliveries(store)}
      actions={store}
    />
  );
}
