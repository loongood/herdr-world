import { ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { freshPullRequestDetail } from "../../../shared/pullRequestFreshness";
import {
  actionablePullRequest,
  mergeCommand,
  type PullRequestCheck,
  type PullRequestReviewer,
  type PullRequestVerb,
  type ReadinessRule,
  shortSha,
} from "../../../shared/pullRequests";
import { type WorkItem, workBadgeText } from "../../../shared/worldSources";
import { useT } from "../i18n";
import { PullRequestDetailHealth } from "./PullRequestDetailHealth";
import {
  prConfirmedAt,
  prMergeUnavailable,
  prReadinessRules,
  prVerbConsequence,
  prVerbDone,
  prVerbLabel,
} from "./prCopy";
import { clockTime, type PrAttention } from "./pullRequestAttention";
import { runPullRequestVerb } from "./worldSources";
import "./pullRequestCard.css";

/**
 * One pull request card for every view: CI on the head, reviewer results,
 * the owner's merge rules, and the verbs World runs for you (merge, close,
 * mark ready), each behind a sheet that says exactly what happens. The
 * outcome is GitHub's: the card shows it once the source refreshes.
 */

export type PullRequestCardAgent = { id: string; label: string };

const GLYPH: Record<ReadinessRule["state"], string> = {
  pass: "✓",
  fail: "✗",
  unknown: "?",
};
const MAX_DOTS = 12;

export function PullRequestCard({
  item,
  agents = [],
  attention = null,
  compact = false,
  onSelectAgent,
  onAskAuthor,
}: {
  item: WorkItem;
  agents?: PullRequestCardAgent[];
  attention?: PrAttention | null;
  /** One line and Open, Details and Merge…, for Chat and popovers. */
  compact?: boolean;
  onSelectAgent?(id: string): void;
  /** Ask the agent on it to fix, as a Chat message; absent where there is no Chat. */
  onAskAuthor?(item: WorkItem): void;
}) {
  const t = useT();
  const [, expireDetail] = useState(0);
  const now = Date.now();
  const [open, setOpen] = useState(false);
  // A sheet holds the head it was opened on: the confirm is for that head.
  const [sheet, setSheetState] = useState<{
    verb: PullRequestVerb;
    head: string | undefined;
  } | null>(null);
  const setSheet = (verb: PullRequestVerb | null) => {
    if (verb === "merge" && !freshPullRequestDetail(item)) {
      expireDetail((value) => value + 1);
      return;
    }
    setSheetState(verb ? { verb, head: item.headSha } : null);
  };
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "running"; verb: PullRequestVerb }
    | { kind: "done"; verb: PullRequestVerb; seen: string }
    | { kind: "failed"; detail: string }
  >({ kind: "idle" });
  const rules = prReadinessRules(item, now);
  const failing = rules.filter((rule) => rule.state === "fail");
  const ready = rules.every((rule) => rule.state === "pass");
  const actionable = actionablePullRequest(item);
  const detailFresh = freshPullRequestDetail(item, now);
  useEffect(() => {
    if (!freshPullRequestDetail(item)) return;
    const expiresAt = item.prObservation!.expiresAt!;
    const timer = window.setTimeout(
      () => expireDetail((value) => value + 1),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [item]);
  const blocked = prMergeUnavailable(item);
  // GitHub's answer replaces "Merged" once the source shows the change.
  const seen = `${item.lane}|${item.draft}|${item.headSha}`;
  useEffect(() => {
    if (state.kind === "done" && seen !== state.seen)
      setState({ kind: "idle" });
  }, [seen, state]);
  // A push while the sheet is open withdraws it: review the new head first.
  useEffect(() => {
    if (sheet && sheet.head !== item.headSha) {
      setSheetState(null);
      setState({ kind: "failed", detail: t("pr.headChanged") });
    }
  }, [sheet, item.headSha]);
  useEffect(() => {
    if (sheet?.verb === "merge" && !detailFresh) {
      setSheetState(null);
      setState({ kind: "failed", detail: t("pr.detailsUnavailable") });
    }
  }, [sheet, detailFresh]);

  const run = async (
    verb: PullRequestVerb,
    head: string | undefined,
    comment?: string,
  ) => {
    if (verb === "merge" && !freshPullRequestDetail(item)) {
      setSheet(null);
      setState({ kind: "failed", detail: t("pr.detailsUnavailable") });
      return;
    }
    setSheet(null);
    setState({ kind: "running", verb });
    try {
      const action = await runPullRequestVerb(item, verb, {
        comment,
        headSha: head,
      });
      setState(
        action.outcome === "done"
          ? { kind: "done", verb, seen }
          : {
              kind: "failed",
              detail: action.detail ?? t("pr.githubRefused"),
            },
      );
    } catch (cause) {
      setState({
        kind: "failed",
        detail: cause instanceof Error ? cause.message : t("pr.couldNotRun"),
      });
    }
  };

  const running = state.kind === "running";
  const mergeControl = !actionable ? null : !detailFresh ? (
    <span>{t("pr.refreshBeforeMerge")}</span>
  ) : blocked ? (
    <MergeCommand item={item} reason={blocked} />
  ) : (
    <button
      type="button"
      className="pr-card-primary"
      disabled={running}
      onClick={() => setSheet("merge")}
    >
      {running && state.verb === "merge"
        ? t("pr.merging")
        : `${t("pr.verbMerge")}…`}
    </button>
  );

  return (
    <article
      className={`pr-card${compact ? " pr-card-compact" : ""}`}
      aria-label={t("pr.cardAria", { ref: item.ref })}
      data-ready={ready || undefined}
    >
      <header className="pr-card-head">
        <a
          className="pr-card-ref"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("pr.openRefAria", { ref: item.ref })}
        >
          {item.repo ? `${item.repo} ` : ""}
          {workBadgeText(item)}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
        <p className="pr-card-title">{item.title}</p>
      </header>
      <p className="pr-card-summary">
        <CheckDots item={item} fresh={detailFresh} />
        {item.pr?.reviewers.map((entry) => (
          <span
            key={entry.sourceId || entry.url || entry.reviewer}
            data-outcome={detailFresh ? entry.outcome : "unknown"}
          >
            {entry.reviewer ?? t("pr.unknownReviewer")}{" "}
            {detailFresh ? "" : t("pr.cached")}
            {entry.outcome === "confirmed"
              ? entry.commitsSince === 0
                ? t("pr.confirmed")
                : t("pr.confirmedEarlier")
              : entry.outcome === "open"
                ? t("pr.openOutcome")
                : t("pr.unknownOutcome")}
          </span>
        ))}
        {actionable ? (
          <span
            data-state={ready ? "pass" : failing.length ? "fail" : "unknown"}
          >
            {ready
              ? t("pr.readyOk")
              : failing.length
                ? failing.length === 1
                  ? t("pr.ruleFailOne", { count: failing.length })
                  : t("pr.ruleFailMany", { count: failing.length })
                : t("pr.readinessUnknown")}
          </span>
        ) : null}
      </p>
      {actionable ? (
        <PullRequestDetailHealth item={item} fresh={detailFresh} />
      ) : null}
      {attention && (attention.reason !== "ready" || ready) ? (
        <p className="pr-card-attention" data-reason={attention.reason}>
          {attention.reason === "stalled"
            ? t("pr.stalled", {
                time: clockTime(attention.since),
                agents: attention.agents.join(", "),
              })
            : t("pr.readyToMerge")}
        </p>
      ) : null}
      {state.kind === "failed" ? (
        <p className="pr-card-failed" role="alert">
          {state.detail}
        </p>
      ) : state.kind === "done" ? (
        <p className="pr-card-done" role="status">
          {t("pr.doneWaiting", { done: prVerbDone(state.verb) })}
        </p>
      ) : null}
      {sheet ? (
        <ConfirmSheet
          item={item}
          verb={sheet.verb}
          failing={sheet.verb === "merge" ? failing : []}
          onCancel={() => setSheet(null)}
          onConfirm={(comment) => void run(sheet.verb, sheet.head, comment)}
        />
      ) : (
        <div className="pr-card-actions">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronRight size={14} aria-hidden="true" />
            {t("pr.details")}
          </button>
          {compact || !open ? mergeControl : null}
        </div>
      )}
      {open ? (
        <div className="pr-card-detail">
          <Readiness rules={rules} />
          <Checks
            checks={item.pr?.checks}
            truncated={item.pr?.checksTruncated}
          />
          <PullRequestReviews reviewers={item.pr?.reviewers} />
          <p className="pr-card-facts">
            {item.headSha ? (
              <>
                {t("pr.headWord")} <code>{shortSha(item.headSha)}</code>
              </>
            ) : null}
            {item.pr?.behindBy !== undefined && item.pr.behindBy !== null
              ? t("pr.behindBy", {
                  count: item.pr.behindBy,
                  base: item.pr.baseRef,
                })
              : ""}
          </p>
          {agents.length ? (
            <div className="pr-card-agents">
              {agents.map((agent) =>
                onSelectAgent ? (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => onSelectAgent(agent.id)}
                    aria-label={t("pr.showAgentAria", { label: agent.label })}
                  >
                    {agent.label}
                  </button>
                ) : (
                  <span key={agent.id}>{agent.label}</span>
                ),
              )}
            </div>
          ) : null}
          {actionable && !sheet ? (
            <div className="pr-card-actions">
              {compact ? null : mergeControl}
              {item.draft ? (
                <button
                  type="button"
                  disabled={running}
                  onClick={() => setSheet("ready")}
                >
                  {running && state.verb === "ready"
                    ? t("pr.markingReady")
                    : `${t("pr.verbReady")}…`}
                </button>
              ) : null}
              <button
                type="button"
                disabled={running}
                onClick={() => setSheet("close")}
              >
                {running && state.verb === "close"
                  ? t("pr.closing")
                  : `${t("pr.verbClose")}…`}
              </button>
              {onAskAuthor && agents.length ? (
                <button type="button" onClick={() => onAskAuthor(item)}>
                  {t("pr.askAuthor")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CheckDots({ item, fresh }: { item: WorkItem; fresh: boolean }) {
  const t = useT();
  const checks = fresh ? item.pr?.checks : undefined;
  if (!checks?.length)
    return item.checks && item.checks !== "none" ? (
      <span data-state={item.checks}>
        {t("pr.ciState", { state: item.checks })}
      </span>
    ) : null;
  const order = { fail: 0, pending: 1, pass: 2, skipped: 3 } as const;
  const sorted = [...checks].sort((a, b) => order[a.state] - order[b.state]);
  const counts = (state: PullRequestCheck["state"]) =>
    checks.filter((check) => check.state === state).length;
  const label = [
    t("pr.checkPassed", { count: counts("pass") }),
    counts("fail") ? t("pr.checkFailing", { count: counts("fail") }) : "",
    counts("pending") ? t("pr.checkRunning", { count: counts("pending") }) : "",
    counts("skipped") ? t("pr.checkSkipped", { count: counts("skipped") }) : "",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <span
      className="pr-card-dots"
      aria-label={t("pr.ciAria", { label })}
      role="img"
    >
      CI{" "}
      {sorted.slice(0, MAX_DOTS).map((check, index) => (
        <i key={index} data-state={check.state} />
      ))}
      {sorted.length > MAX_DOTS ? `+${sorted.length - MAX_DOTS}` : ""}
    </span>
  );
}

function Readiness({ rules }: { rules: ReadinessRule[] }) {
  const t = useT();
  return (
    <section aria-label={t("pr.readiness")}>
      <h4>{t("pr.readiness")}</h4>
      <ul>
        {rules.map((rule) => (
          <li key={rule.id} data-state={rule.state}>
            <span aria-hidden="true">{GLYPH[rule.state]}</span> {rule.label}
            <small>{rule.detail}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Checks({
  checks,
  truncated,
}: {
  checks: PullRequestCheck[] | undefined;
  truncated: boolean | undefined;
}) {
  const t = useT();
  if (!checks) return null;
  const failing = checks.filter((check) => check.state === "fail");
  const running = checks.filter((check) => check.state === "pending");
  const rest = checks.filter(
    (check) => check.state === "pass" || check.state === "skipped",
  );
  const row = (check: PullRequestCheck, index: number) => (
    <li key={`${check.name}-${index}`} data-state={check.state}>
      {check.url ? (
        <a href={check.url} target="_blank" rel="noopener noreferrer">
          {check.name}
        </a>
      ) : (
        check.name
      )}
      {check.required ? <small>{t("pr.requiredWord")}</small> : null}
    </li>
  );
  return (
    <section aria-label={t("pr.checksSection")}>
      <h4>{t("pr.checksOnHead")}</h4>
      {checks.length ? null : <p>{t("pr.noChecksReported")}</p>}
      {failing.length || running.length ? (
        <ul>{[...failing, ...running].map(row)}</ul>
      ) : null}
      {rest.length ? (
        <details>
          <summary>
            {t("pr.passedOrSkipped", { count: rest.length })}
            {truncated ? t("pr.moreOnGitHub") : ""}
          </summary>
          <ul>{rest.map(row)}</ul>
        </details>
      ) : null}
    </section>
  );
}

function MergeCommand({ item, reason }: { item: WorkItem; reason: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const command = mergeCommand(item);
  return (
    <div className="pr-card-command">
      <p>{reason}</p>
      <code>{command}</code>
      <span>
        <a
          className="pr-card-primary"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("pr.openOnGitHub")}
        </a>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(command)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          <Copy size={13} aria-hidden="true" />
          {copied ? t("pr.copied") : t("pr.copyMergeCommand")}
        </button>
      </span>
    </div>
  );
}

function ConfirmSheet({
  item,
  verb,
  failing,
  onCancel,
  onConfirm,
}: {
  item: WorkItem;
  verb: PullRequestVerb;
  failing: ReadinessRule[];
  onCancel(): void;
  onConfirm(comment?: string): void;
}) {
  const t = useT();
  const [comment, setComment] = useState("");
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  const label =
    verb === "merge" && failing.length
      ? failing.length === 1
        ? t("pr.mergeDespiteOne", { count: failing.length })
        : t("pr.mergeDespiteMany", { count: failing.length })
      : prVerbLabel(verb);
  return (
    <div
      className="pr-card-sheet"
      role="group"
      aria-label={t("pr.sheetAria", {
        verb: prVerbLabel(verb),
        number: item.number ?? "?",
      })}
      data-verb={verb}
    >
      <p>{prVerbConsequence(item, verb)}</p>
      {failing.length ? (
        <ul>
          {failing.map((rule) => (
            <li key={rule.id}>
              ✗ {rule.label}: {rule.detail}
            </li>
          ))}
        </ul>
      ) : null}
      {verb === "close" ? (
        <label>
          {t("pr.commentOptional")}
          <textarea
            value={comment}
            maxLength={4_000}
            rows={2}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
      ) : null}
      <div className="pr-card-actions">
        <button type="button" onClick={onCancel}>
          {t("pr.cancel")}
        </button>
        <button
          ref={confirmRef}
          type="button"
          className={verb === "close" ? "pr-card-danger" : "pr-card-primary"}
          onClick={() => onConfirm(verb === "close" ? comment : undefined)}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

/** Parsed evidence only; unattributed posts remain individually linked. */
export function PullRequestReviews({
  reviewers,
}: {
  reviewers?: PullRequestReviewer[];
}) {
  const t = useT();
  return (
    <section aria-label={t("pr.reviews")}>
      <h4>{t("pr.reviews")}</h4>
      {reviewers?.length ? (
        <ul>
          {reviewers.map((entry) => (
            <li
              key={entry.sourceId || entry.url || entry.reviewer}
              data-outcome={entry.outcome}
            >
              <b>{entry.reviewer ?? t("pr.unknownReviewer")}</b>{" "}
              {entry.line || t("pr.noResultLine")}
              {!entry.reviewer ? (
                <span>{t("pr.attributionUnknown")}</span>
              ) : null}
              <small>
                {entry.outcome === "confirmed" && entry.reviewer
                  ? `${prConfirmedAt(entry)} · `
                  : ""}
                {entry.url ? (
                  <a href={entry.url} target="_blank" rel="noopener noreferrer">
                    {entry.reviewer
                      ? t("pr.perReviewer", { reviewer: entry.reviewer })
                      : t("pr.viewResultSource")}
                  </a>
                ) : (
                  t("pr.sourceLinkUnavailable")
                )}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p>{reviewers ? t("pr.noReviewerResult") : t("pr.notReadYet")}</p>
      )}
      <p className="pr-card-note">{t("pr.reviewsNote")}</p>
    </section>
  );
}
