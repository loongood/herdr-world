import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CircleDot,
  GitPullRequest,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  pullRequestUnavailable,
  type PullRequestStatus,
} from "../../../shared/pullRequest";
import type { ConnectionClient } from "../api";
import { useT } from "../i18n";
import { formatUiDateTime } from "../uiLocale";
import { useConnectionReady } from "../useConnectionClient";
import { ThemedSelect } from "./ThemedSelect";
import "./PullRequestCard.css";

export function PullRequestCard({
  client,
  workspaceId,
  branch,
}: {
  client: ConnectionClient;
  workspaceId: string;
  branch?: string;
}) {
  const t = useT();
  const ready = useConnectionReady(client);
  const [remote, setRemote] = useState("");
  const [match, setMatch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState<PullRequestStatus | null>(null);
  const [stale, setStale] = useState<PullRequestStale | null>(null);
  const [error, setError] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  // The repository location keys this card by its complete qualified target.
  // Only same-target refreshes retain status; remote/match changes reset it.
  const lastGood = useRef<PullRequestStatus | null>(null);
  useEffect(() => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    if (!ready) return;
    const fallBack = (failedAt: string, message?: string) => {
      const good = lastGood.current;
      if (!good) return false;
      setStatus(good);
      setStale({ failedAt, message });
      setFinishedAt(good.refreshedAt);
      return true;
    };
    void client
      .call(
        "git.pull_request",
        {
          workspace_id: workspaceId,
          ...(branch ? { branch } : {}),
          ...(remote ? { remote } : {}),
          ...(match ? { match } : {}),
        },
        65_000,
      )
      .then((value: PullRequestStatus) => {
        if (sequence.current !== request || !client.isCurrent()) return;
        if (
          !value ||
          typeof value.state !== "string" ||
          !Array.isArray(value.remotes)
        )
          throw new Error(t("components.pullRequest.invalidStatus"));
        setLoading(false);
        if (
          pullRequestUnavailable(value) &&
          fallBack(value.refreshedAt, value.message)
        )
          return;
        lastGood.current = value.state === "ready" ? value : null;
        setStatus(value);
        setStale(null);
        setFinishedAt(value.refreshedAt);
      })
      .catch(() => {
        if (sequence.current !== request || !client.isCurrent()) return;
        setLoading(false);
        const message = t("components.pullRequest.statusUnavailableDetail");
        if (fallBack(new Date().toISOString(), message)) return;
        setStatus(null);
        setStale(null);
        setError(message);
        setFinishedAt(new Date().toISOString());
      });
    return () => {
      sequence.current = request + 1;
    };
  }, [client, ready, workspaceId, branch, remote, match, refresh, t]);

  const current = client.isCurrent() ? status : null;
  const reset = () => {
    sequence.current++;
    lastGood.current = null;
    setStatus(null);
    setStale(null);
    setError("");
    setFinishedAt("");
  };
  return (
    <PullRequestCardView
      current={current}
      loading={loading}
      stale={current ? stale : null}
      error={
        client.isCurrent()
          ? error
          : t("components.pullRequest.waitingForRecovery")
      }
      finishedAt={finishedAt}
      onRefresh={() => setRefresh((value) => value + 1)}
      onRemoteChange={(value) => {
        reset();
        setRemote(value);
        setMatch("");
      }}
      onMatchChange={(value) => {
        reset();
        setMatch(value);
      }}
    />
  );
}

type PullRequestStale = { failedAt: string; message?: string };

export function PullRequestCardView({
  current,
  loading,
  stale = null,
  error,
  finishedAt,
  onRefresh,
  onRemoteChange,
  onMatchChange,
}: {
  current: PullRequestStatus | null;
  /** A request is pending; a shown status stays visible while it refreshes. */
  loading: boolean;
  /** The shown status is the last success; the latest refresh failed. */
  stale?: PullRequestStale | null;
  error: string;
  finishedAt: string;
  onRefresh: () => void;
  onRemoteChange: (value: string) => void;
  onMatchChange: (value: string) => void;
}) {
  const t = useT();
  const pr = current?.state === "ready" ? current.request : undefined;
  const provider =
    current?.provider === "github"
      ? "GitHub"
      : current?.provider === "gitlab"
        ? "GitLab"
        : "PR/MR";
  const label = error
    ? t("components.pullRequest.statusUnavailable")
    : current
      ? {
          ready: t("components.pullRequest.requestFound"),
          select_remote: t("components.pullRequest.selectRemote"),
          select_match: t("components.pullRequest.selectMatch"),
          unsupported: t("components.pullRequest.providerNotConfigured"),
          missing_cli: t("components.pullRequest.missingCli"),
          unauthenticated: t("components.pullRequest.unauthenticated"),
          no_match: t("components.pullRequest.noMatch"),
          detached: t("components.pullRequest.detached"),
          error: t("components.pullRequest.statusUnavailable"),
        }[current.state]
      : loading
        ? t("components.pullRequest.checkingBranch")
        : t("components.pullRequest.statusUnavailable");
  const needsAttention =
    !!error ||
    !!stale ||
    ["error", "missing_cli", "unauthenticated"].includes(current?.state ?? "");
  const message = error || stale?.message || current?.message;
  const staleLabel = stale
    ? t("components.pullRequest.staleLabel", {
        when: formatUiDateTime(current?.refreshedAt ?? stale.failedAt),
      })
    : "";
  return (
    <section
      className="pull-request-card"
      aria-label={t("components.pullRequest.statusAria")}
      aria-busy={loading || undefined}
      data-attention={needsAttention || undefined}
      data-stale={stale ? true : undefined}
    >
      <details className="pull-request-card-disclosure">
        <summary className="pull-request-card-summary">
          <span className="pull-request-card-icon">
            <GitPullRequest size={17} aria-hidden="true" />
          </span>
          <span className="pull-request-card-heading">
            <span className="pull-request-card-eyebrow">
              {pr ? (
                <a
                  className="pull-request-card-link"
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("components.pullRequest.openProviderAria", {
                    provider,
                    number: pr.number,
                  })}
                  title={t("components.pullRequest.openOnProvider", {
                    provider,
                  })}
                  onClick={(event) => event.stopPropagation()}
                >
                  {provider} #{pr.number}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              ) : (
                t("components.pullRequest.providerStatus", { provider })
              )}
            </span>
            <span
              className="pull-request-card-title"
              role="status"
              aria-live="polite"
            >
              {pr?.title ?? label}
            </span>
          </span>
          {pr ? (
            <span
              className="pull-request-card-badge"
              data-state={pr.draft ? "draft" : pr.state}
            >
              {pr.draft
                ? t("components.pullRequest.draftBadge", { state: pr.state })
                : pr.state}
            </span>
          ) : null}
          {stale ? (
            <span
              className="pull-request-card-stale"
              title={staleLabel}
              aria-label={staleLabel}
              role="img"
            >
              {t("components.pullRequest.lastKnown")}
            </span>
          ) : null}
          <ChevronRight
            className="pull-request-card-chevron"
            size={14}
            aria-hidden="true"
          />
          <button
            className="pull-request-card-refresh"
            type="button"
            title={t("components.pullRequest.refreshStatus")}
            aria-label={t("components.pullRequest.refreshStatus")}
            disabled={loading}
            onClick={(event) => {
              event.stopPropagation();
              onRefresh();
            }}
          >
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </summary>
        <div className="pull-request-card-content">
          {current ? (
            <PullRequestSelectors
              current={current}
              onRemoteChange={onRemoteChange}
              onMatchChange={onMatchChange}
            />
          ) : null}
          {pr ? (
            <div className="pull-request-card-signals">
              <div
                className="pull-request-card-route"
                aria-label={t("components.pullRequest.branchesAria")}
              >
                <code>{pr.source}</code>
                <ArrowRight size={13} aria-hidden="true" />
                <code>{pr.target}</code>
              </div>
              <dl>
                <div>
                  <dt>
                    <CircleDot size={12} aria-hidden="true" />
                    {current?.provider === "github"
                      ? t("components.pullRequest.checks")
                      : t("components.pullRequest.pipeline")}
                  </dt>
                  <dd>
                    {current?.ci ?? t("components.pullRequest.unavailable")}
                  </dd>
                </div>
                <div>
                  <dt>
                    <CircleDot size={12} aria-hidden="true" />
                    {current?.provider === "github"
                      ? t("components.pullRequest.reviewDecision")
                      : t("components.pullRequest.approvals")}
                  </dt>
                  <dd>
                    {current?.review ?? t("components.pullRequest.unavailable")}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
          {current || error || !loading ? (
            <details className="pull-request-card-context">
              <summary>
                <ChevronRight size={12} aria-hidden="true" />
                {message
                  ? t("components.pullRequest.detailsTroubleshooting")
                  : t("components.pullRequest.checkoutDetails")}
              </summary>
              {message ? (
                <p className="pull-request-card-message">{message}</p>
              ) : null}
              <dl>
                {pr ? (
                  <div>
                    <dt>{t("components.pullRequest.author")}</dt>
                    <dd>{pr.author}</dd>
                  </div>
                ) : null}
                {current?.remotes.map((remote) => (
                  <div key={remote.name}>
                    <dt>
                      {t("components.pullRequest.remoteOf", {
                        name: remote.name,
                      })}
                    </dt>
                    <dd>
                      {remote.host}/{remote.repository}
                    </dd>
                  </div>
                ))}
                {current ? (
                  <>
                    <div>
                      <dt>{t("components.pullRequest.checkout")}</dt>
                      <dd>
                        <code>{current.root}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>{t("components.pullRequest.branch")}</dt>
                      <dd>
                        <code>{current.branch || "Detached HEAD"}</code>
                        {current.rebasing
                          ? t("components.pullRequest.rebaseInProgress")
                          : null}
                      </dd>
                    </div>
                  </>
                ) : null}
                {stale ? (
                  <div>
                    <dt>{t("components.pullRequest.lastRefreshFailed")}</dt>
                    <dd>
                      <time dateTime={stale.failedAt}>
                        {formatUiDateTime(stale.failedAt)}
                      </time>
                    </dd>
                  </div>
                ) : null}
                {finishedAt ? (
                  <div>
                    <dt>
                      {stale
                        ? t("components.pullRequest.lastSuccessfulRefresh")
                        : t("components.pullRequest.lastRefreshed")}
                    </dt>
                    <dd>
                      <time dateTime={finishedAt}>
                        {formatUiDateTime(finishedAt)}
                      </time>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </details>
          ) : null}
        </div>
      </details>
    </section>
  );
}

export function PullRequestSelectors({
  current,
  onRemoteChange,
  onMatchChange,
}: {
  current: PullRequestStatus;
  onRemoteChange: (value: string) => void;
  onMatchChange: (value: string) => void;
}) {
  const t = useT();
  const pr = current.state === "ready" ? current.request : undefined;
  return (
    <>
      {current.remotes.length > 1 || current.state === "select_remote" ? (
        <label>
          {t("components.pullRequest.sourceRemoteAria")}
          <ThemedSelect
            className="pull-request-card-remote-select"
            aria-label={t("components.pullRequest.sourceRemoteAria")}
            value={current.remote ?? ""}
            placeholder={t("components.pullRequest.selectRemotePlaceholder")}
            options={current.remotes.map((item) => ({
              value: item.name,
              label: `${item.name}: ${item.host}/${item.repository}`,
            }))}
            onChange={onRemoteChange}
          />
        </label>
      ) : null}
      {current.matches &&
      (current.matches.length > 1 || current.state === "select_match") ? (
        <label>
          {t("components.pullRequest.matchingRequest")}
          <select
            value={pr?.id ?? ""}
            onChange={(event) => {
              onMatchChange(event.target.value);
            }}
          >
            <option value="" disabled>
              {t("components.pullRequest.selectPrMr")}
            </option>
            {current.matches.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.number}: {item.title} ({item.state})
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}
