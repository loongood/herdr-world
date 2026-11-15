import { useT } from "../i18n";
import {
  HISTORY_CATEGORIES,
  type HistoryCategory,
  type HistoryFilters,
} from "./agentHistory";
import "./AgentHistoryFilters.css";

export function AgentHistoryFilters({
  filters,
  counts,
  onToggle,
}: {
  filters: HistoryFilters;
  counts: Record<HistoryCategory, number>;
  onToggle: (category: HistoryCategory) => void;
}) {
  const t = useT();
  const labels: Record<HistoryCategory, string> = {
    user: t("history.filterUser"),
    agent: t("history.filterAgent"),
    tool: t("history.filterTool"),
  };
  return (
    <div
      className="agent-history-filters"
      role="group"
      aria-label={t("history.filtersAria")}
    >
      {HISTORY_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          className={`agent-history-filter is-${category}`}
          aria-label={labels[category]}
          aria-pressed={filters[category]}
          title={t(
            filters[category]
              ? "history.filterHideTitle"
              : "history.filterShowTitle",
            { label: labels[category] },
          )}
          onClick={() => onToggle(category)}
        >
          {labels[category]}
          <span>{counts[category]}</span>
        </button>
      ))}
    </div>
  );
}
