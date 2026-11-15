import { useState } from "react";
import type { WorkItem } from "../../../shared/worldSources";
import { useT } from "../i18n";
import { worldSourcesStore } from "./worldSources";

/** GitHub list health never stands in for the time the detail was read. */
export function PullRequestDetailHealth({
  item,
  fresh: current,
}: {
  item: WorkItem;
  fresh: boolean;
}) {
  const t = useT();
  const [refreshing, setRefreshing] = useState(false);
  const observation = item.prObservation;
  const readAt = observation?.readAt;
  const state = current
    ? t("pr.healthFresh")
    : item.pr
      ? t("pr.healthStale")
      : t("pr.healthUnavailable");
  return (
    <p
      className="pr-card-facts"
      data-detail-state={current ? "fresh" : item.pr ? "stale" : "unavailable"}
    >
      {t("pr.detailsHealth", { state })}
      {readAt !== undefined && readAt !== null ? (
        <>
          {t("pr.readPrefix")}
          <time dateTime={new Date(readAt).toISOString()}>
            {new Date(readAt).toLocaleString()}
          </time>
        </>
      ) : (
        t("pr.readTimeUnknown")
      )}
      {!current ? (
        <>
          {" "}
          <button
            type="button"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await worldSourcesStore.refresh(true);
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {refreshing ? t("pr.refreshing") : t("pr.refreshSources")}
          </button>
        </>
      ) : null}
    </p>
  );
}
