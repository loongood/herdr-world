import { ChevronRight, ExternalLink, Settings2, X } from "lucide-react";
import "./workLensCards.css";
import { useMemo, useRef, useState } from "react";
import { useLocale, useT } from "../../i18n";
import { INTL_TAGS } from "../../i18n/locales";
import type { WorldSourceStatus } from "../../../../shared/worldSources";
import { useLayer } from "../../layerStack";
import { workBadgeText } from "../../../../shared/worldSources";
import { WORLD_SOURCES_SETTINGS_EVENT } from "../../workspaceResource";
import type { WorldObject } from "../worldObject";
import { useWorldSources } from "../worldSources";
import { actionablePullRequest } from "../../../../shared/pullRequests";
import { PullRequestCard } from "../PullRequestCard";
import { usePullRequestAttention } from "../pullRequestAttention";
import {
  workCardFacts,
  workLensColumns,
  type WorkLensCard,
  type WorkLensGroup,
} from "./workLensModel";

const openSourcesSettings = () =>
  window.dispatchEvent(new Event(WORLD_SOURCES_SETTINGS_EVENT));

/**
 * A source the user never set up is a quiet hint, not a problem: it has never
 * answered, and (for Jira) has nothing saved.
 */
function neverSetUp(source: WorldSourceStatus) {
  if (source.state !== "not_connected" || source.lastSuccessAt !== null)
    return false;
  return source.config.kind !== "jira"
    ? true
    : !source.config.site && !source.config.email && !source.config.tokenSet;
}

/**
 * The Work lens over Board: pull requests from review to merged, and tickets
 * by status. A card's agents jump to their Board cards. It is a layer:
 * Escape, Back or a press outside closes it.
 */
export function WorkLens({
  world,
  anchor,
  onSelectAgent,
  onClose,
}: {
  world: WorldObject;
  /** The control that toggles the lens; pressing it is not outside. */
  anchor?: () => Element | null;
  onSelectAgent(id: string): void;
  onClose(): void;
}) {
  const t = useT();
  const locale = useLocale();
  const snapshot = useWorldSources();
  const sectionRef = useRef<HTMLElement | null>(null);
  useLayer(true, onClose, {
    element: () => sectionRef.current,
    anchors: () => [anchor?.() ?? null],
  });
  const [group, setGroup] = useState<WorkLensGroup>("pull_requests");
  // History days the user opened or closed; the newest day starts open.
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const columns = useMemo(
    () =>
      workLensColumns(snapshot, world, group, Date.now(), INTL_TAGS[locale]),
    [snapshot, world, group, locale],
  );
  const attention = usePullRequestAttention(
    columns.flatMap((column) =>
      column.cards.map((card) => ({ item: card.item, authors: card.agents })),
    ),
  );
  const connected = snapshot.sources.filter(
    (source) => source.state === "connected",
  );
  const problems = snapshot.sources.filter(
    (source) =>
      source.state === "error" ||
      (source.state === "not_connected" && !neverSetUp(source)),
  );
  const unset = snapshot.sources.filter(neverSetUp);
  const empty = columns.every((column) => !column.cards.length);
  return (
    <section
      ref={sectionRef}
      className="work-lens"
      aria-label={t("board.workAria")}
    >
      <header className="work-lens-head">
        <div
          className="work-lens-tabs"
          role="tablist"
          aria-label={t("board.work")}
        >
          {(
            [
              ["pull_requests", t("work.tabPullRequests")],
              ["tickets", t("work.tabTickets")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={group === id}
              onClick={() => setGroup(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="work-lens-icon"
          aria-label={t("work.sourcesSettings")}
          onClick={openSourcesSettings}
        >
          <Settings2 size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="work-lens-icon"
          aria-label={t("work.close")}
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      {problems.length ? (
        <p className="work-lens-note" role="status">
          {problems
            .map((source) => `${source.label}: ${source.detail}`)
            .join(" ")}
        </p>
      ) : null}
      {unset.length ? (
        <p className="work-lens-hint">
          {unset.map((source) => (
            <button
              key={source.id}
              type="button"
              className="work-lens-setup"
              onClick={openSourcesSettings}
            >
              {t("work.setUpSource", { source: source.label })}
            </button>
          ))}
        </p>
      ) : null}
      {empty ? (
        <p className="work-lens-note">
          {snapshot.sources.length === 0
            ? t("sources.loading")
            : connected.length
              ? group === "pull_requests"
                ? t("work.noPullRequests")
                : t("work.noTickets")
              : t("work.noSourceConnected")}
        </p>
      ) : null}
      <div className="work-lens-columns">
        {columns.map((column) => (
          <div
            key={column.lane}
            className="work-lens-column"
            data-lane={column.lane}
          >
            <h3>
              {column.label} <span>{column.cards.length}</span>
            </h3>
            {column.days ? (
              <div className="work-lens-days">
                {column.days.map((day, index) => {
                  const key = `${column.lane}:${day.key}`;
                  const open = openDays[key] ?? index === 0;
                  return (
                    <section key={day.key} aria-label={day.label}>
                      <button
                        type="button"
                        className="work-lens-day"
                        aria-expanded={open}
                        onClick={() =>
                          setOpenDays((value) => ({ ...value, [key]: !open }))
                        }
                      >
                        <ChevronRight size={14} aria-hidden="true" />
                        {day.label} <span>{day.cards.length}</span>
                      </button>
                      {open ? (
                        <ul>
                          {day.cards.map((card) => (
                            <WorkCard
                              key={card.item.key}
                              card={card}
                              compact
                              onSelectAgent={onSelectAgent}
                            />
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            ) : (
              <ul>
                {column.cards.map((card) =>
                  actionablePullRequest(card.item) ? (
                    <li key={card.item.key} className="work-card-pr">
                      <PullRequestCard
                        item={card.item}
                        agents={card.agents}
                        attention={attention.get(card.item.key) ?? null}
                        onSelectAgent={onSelectAgent}
                      />
                    </li>
                  ) : (
                    <WorkCard
                      key={card.item.key}
                      card={card}
                      onSelectAgent={onSelectAgent}
                    />
                  ),
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** A card: its link, title, state words (not for history) and agents. */
function WorkCard({
  card: { item, agents },
  compact = false,
  onSelectAgent,
}: {
  card: WorkLensCard;
  compact?: boolean;
  onSelectAgent(id: string): void;
}) {
  const t = useT();
  return (
    <li className="work-card" data-source={item.source}>
      <a
        className="work-card-ref"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.kind === "ticket"
          ? item.ref
          : `${item.repo ?? ""} ${workBadgeText(item)}`}
        <ExternalLink size={12} aria-hidden="true" />
      </a>
      <p className="work-card-title">{item.title}</p>
      {compact ? null : (
        <p className="work-card-facts">
          {[...workCardFacts(item), ...item.roles].join(" · ")}
        </p>
      )}
      {agents.length ? (
        <div className="work-card-agents">
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent.id)}
              aria-label={t("work.showAgentOnBoard", { name: agent.label })}
            >
              {agent.label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
