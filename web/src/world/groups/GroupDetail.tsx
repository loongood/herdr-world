import { useState } from "react";
import {
  type GroupTerminalObservation,
  type GroupView,
} from "../../../../shared/groupViews";
import type { GroupChange } from "../../../../shared/groups";
import { useT } from "../../i18n";
import { groupKindName, groupOpLabel, groupStatusLabel } from "./groupLabels";
import { PullRequestCard } from "../PullRequestCard";
import { GroupMembers } from "./GroupMembers";
import { GroupInterestButton } from "./GroupInterestButton";
import { GroupEditFeedback } from "./GroupEditFeedback";
import {
  groupPromotion,
  groupPrText,
  groupStatusText,
  groupTitle,
  type GroupEditPlan,
} from "./groupActions";

export function GroupDetail({
  group,
  groups,
  terminals,
  changes,
  busy,
  revision,
  onPlan,
  onError,
  onOpen,
  harness,
}: {
  group: GroupView;
  groups: readonly GroupView[];
  terminals: readonly GroupTerminalObservation[];
  changes: readonly GroupChange[];
  busy: boolean;
  revision: number;
  onPlan(plan: GroupEditPlan): void;
  onError(message: string): void;
  onOpen(terminal: GroupTerminalObservation): void;
  harness(terminal: GroupTerminalObservation): string | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const [editRevision, setEditRevision] = useState(revision);
  const [editError, setEditError] = useState<string | null>(null);
  const [name, setName] = useState(group.name);
  const [now, setNow] = useState(group.now.join("\n"));
  const [limit, setLimit] = useState(String(group.openPrLimit ?? 2));
  const t = useT();
  const currentState = `${t("groups.currentState", {
    kind: groupKindName(group.kind),
    name: group.name,
    now: group.now.join("; ") || t("groups.currentNone"),
  })}${group.kind === "pod" ? t("groups.currentStateLimit", { limit: String(group.openPrLimit) }) : ""}`;
  return (
    <div className="group-detail">
      <GroupInterestButton group={group} onError={onError} />
      <p className="group-status-line">
        <span
          className={`group-status is-${group.status}`}
          aria-label={groupStatusLabel(group.status)}
        />
        {groupStatusText(group)}
        {!group.current && t("groups.cachedTopology")}
      </p>
      <GroupMembers
        group={group}
        groups={groups}
        terminals={terminals}
        busy={busy}
        revision={revision}
        onPlan={onPlan}
        onError={onError}
        onOpen={onOpen}
        harness={harness}
      />
      <section>
        <div className="group-section-heading">
          <h3>{t("groups.openPrsTitle")}</h3>
          <span
            className={`group-pr-pill${group.overLimit ? " is-warning" : ""}`}
          >
            {groupPrText(group)}
          </span>
        </div>
        {group.workState !== "current" && (
          <p className="group-hint">
            {group.workState === "stale"
              ? t("groups.workStale")
              : t("groups.workUnknown")}
          </p>
        )}
        {group.openPullRequests.map((item) => (
          <PullRequestCard key={item.key} item={item} compact />
        ))}
        {group.workState === "current" && !group.openPullRequests.length && (
          <p className="group-hint">{t("groups.noOpenPrs")}</p>
        )}
      </section>
      <section>
        <h3>{t("groups.nowTitle")}</h3>
        {group.now.length ? (
          <ol>
            {group.now.map((item, index) => (
              <li key={`${index}:${item}`}>
                {/^https:\/\//.test(item) ? (
                  <a href={item} target="_blank" rel="noreferrer">
                    {item}
                  </a>
                ) : (
                  item
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="group-hint">{t("groups.noNowItems")}</p>
        )}
      </section>
      {group.stored && (
        <>
          <div className="group-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setName(group.name);
                setNow(group.now.join("\n"));
                setLimit(String(group.openPrLimit ?? 2));
                setEditing(!editing);
                setEditRevision(revision);
                setEditError(null);
              }}
            >
              {t("groups.editKind", { kind: groupKindName(group.kind) })}
            </button>
            {group.kind === "team" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  try {
                    onPlan(groupPromotion(group, name || group.name, groups));
                  } catch (error) {
                    onError(
                      error instanceof Error ? error.message : String(error),
                    );
                  }
                }}
              >
                {t("groups.promoteToPod")}
              </button>
            )}
            <button
              type="button"
              className="is-danger"
              disabled={busy}
              onClick={() =>
                onPlan({
                  ops: [{ op: "group.delete", id: group.id }],
                  confirmation: t("groups.deleteConfirm", {
                    group: groupTitle(group),
                  }),
                })
              }
            >
              {t("groups.deleteKind", { kind: groupKindName(group.kind) })}
            </button>
          </div>
          {editing && (
            <form
              className="group-edit"
              onSubmit={(event) => {
                event.preventDefault();
                const numeric = Number(limit);
                if (!Number.isSafeInteger(numeric) || numeric < 0) {
                  setEditError(t("groups.limitInvalid"));
                  onError(t("groups.limitInvalid"));
                  return;
                }
                onPlan({
                  revision: editRevision,
                  onComplete: (error) => {
                    setEditError(error);
                    if (!error) setEditing(false);
                  },
                  ops: [
                    {
                      op: "group.set_attrs",
                      id: group.id,
                      name: name.trim(),
                      attrs: {
                        queue: now
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean),
                        ...(group.kind === "pod"
                          ? { open_pr_limit: numeric }
                          : {}),
                      },
                    },
                  ],
                });
              }}
            >
              <GroupEditFeedback
                error={editError}
                changed={revision !== editRevision}
                current={currentState}
                onReview={() => {
                  setEditRevision(revision);
                  setEditError(null);
                }}
              />
              <label>
                {t("groups.nameLabel")}
                <input
                  value={name}
                  maxLength={240}
                  required
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                {t("groups.nowLabel")}
                <textarea
                  value={now}
                  onChange={(event) => setNow(event.target.value)}
                />
              </label>
              {group.kind === "pod" && (
                <label>
                  {t("groups.limitLabel")}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                  />
                </label>
              )}
              <button disabled={busy}>{t("common.save")}</button>
              <button type="button" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </button>
            </form>
          )}
        </>
      )}
      <section className="group-attribution">
        <h3>{t("groups.recentChanges")}</h3>
        <p className="group-hint">{t("groups.recentChangesHint")}</p>
        {changes.length ? (
          changes
            .slice(-12)
            .reverse()
            .map((change, index) => (
              <p key={`${change.revision}:${change.group_id}:${index}`}>
                {groupOpLabel(change.op)}
                {t("groups.attributionBy")}
                {change.sender.basis === "unknown"
                  ? t("groups.unknownSender")
                  : `${change.sender.label} (${change.sender.basis})`}{" "}
                ·{" "}
                <time dateTime={new Date(change.at).toISOString()}>
                  {new Date(change.at).toLocaleTimeString()}
                </time>
              </p>
            ))
        ) : (
          <p className="group-hint">{t("groups.noRecentChanges")}</p>
        )}
      </section>
    </div>
  );
}
