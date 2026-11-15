import type { GroupView } from "../../../../shared/groupViews";
import {
  groupPrText,
  groupStatusText,
  groupTitle,
  openGroups,
} from "./groupActions";
import { useT } from "../../i18n";
import { useGroups } from "./useGroups";
import "./groupsSummary.css";

/** Mount only inside the open Town Summary. Reception keeps its own counts. */
export function GroupsSummary() {
  const { groups, document, error } = useGroups();
  return (
    <GroupsSummaryContent
      groups={groups}
      ready={Boolean(document)}
      error={error}
    />
  );
}

export function GroupsSummaryContent({
  groups,
  ready,
  error,
  onOpen = openGroups,
}: {
  groups: readonly GroupView[];
  ready: boolean;
  error?: string | null;
  onOpen?(key?: string): void;
}) {
  const t = useT();
  const pods = groups.filter((group) => group.kind === "pod");
  return (
    <section className="groups-summary" aria-labelledby="groups-summary-title">
      <div className="groups-summary-heading">
        <h3 id="groups-summary-title">{t("groups.podsTitle")}</h3>
        <button type="button" onClick={() => onOpen()}>
          {t("groups.openGroups")}
        </button>
      </div>
      {error ? <p role="status">{error}</p> : null}
      {!ready ? (
        error ? null : (
          <p role="status">{t("groups.loadingPods")}</p>
        )
      ) : pods.length ? (
        <ul>
          {pods.map((group) => (
            <li key={group.key}>
              <button
                type="button"
                className="groups-summary-pod"
                aria-label={t("groups.openInGroups", {
                  group: groupTitle(group),
                })}
                onClick={() => onOpen(group.key)}
              >
                <span
                  className="groups-summary-dot"
                  data-status={group.status}
                  aria-hidden="true"
                />
                <span className="groups-summary-body">
                  <strong>{groupTitle(group)}</strong>
                  <small>
                    {groupStatusText(group)}
                    {group.members.some(
                      (member) => member.resolution !== "present",
                    )
                      ? t("groups.awayOrAmbiguous", {
                          count: group.members.filter(
                            (member) => member.resolution !== "present",
                          ).length,
                        })
                      : ""}
                  </small>
                  {group.now[0] ? (
                    <span className="groups-summary-now">
                      {t("groups.nowItem", { now: group.now[0] })}
                    </span>
                  ) : null}
                </span>
                <span
                  className={group.overLimit ? "group-over-limit" : undefined}
                >
                  {groupPrText(group)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="town-summary-empty">{t("groups.noPods")}</p>
      )}
    </section>
  );
}
