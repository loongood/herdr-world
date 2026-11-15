import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Copy,
  Download,
  Eye,
  Info,
  MessagesSquare,
  RefreshCw,
  X,
} from "lucide-react";
import { useStoreSelector } from "../store";
import { paneAgentTitle } from "../agentName";
import { t, useT } from "../i18n";
import { copyTextWithFeedback } from "../copyText";
import {
  connectionClientScopeKey,
  useConnectionClient,
} from "../useConnectionClient";
import { CodexSessionLink } from "./CodexSessionLink";
import type { Pane } from "../types";
import {
  DEFAULT_INSPECTOR_NAVIGATION_RATIO,
  inspectorNavigationRatioAtPosition,
} from "../workspaceResource";
import { formatUiDateTime, formatUiRelativeTime } from "../uiLocale";
import { prefersReducedMotion, shortId } from "../utils";
import { AgentIcon } from "./AgentIcon";
import { AgentMessageContent } from "./AgentMessageContent";
import { AgentMessageDialog } from "./AgentMessageDialog";
import { AgentHistoryCard } from "./AgentHistoryCard";
import { AgentHistoryChat } from "./AgentHistoryChat";
import { useAgentHistoryWindow } from "./useAgentHistoryWindow";
import { HistoryDetailRow as DetailRow } from "./HistoryDetailRow";
import { HistoryTerminalComposer } from "./HistoryTerminalComposer";
import { AgentHistoryFilters } from "./AgentHistoryFilters";
import { ConversationMinimap } from "./ConversationMinimap";
import {
  groupHistoryChatItems,
  searchHistoryChatEntries,
  readAgentHistoryView,
  writeAgentHistoryView,
  type AgentHistoryView,
} from "./agentHistoryView";
import {
  ALL_HISTORY_FILTERS,
  historyEntryLabel,
  isToolContentPending,
  selectHistoryEntries,
  toolOverlayMatches,
  type HistoryFilters,
  type HistoryEntry as AgentHistoryEntry,
} from "./agentHistory";
import { AgentSessionPreviewDialog } from "./AgentSessionPreviewDialog";
import {
  type AgentSessionSummary,
  downloadSession,
  formatBytes,
  formatCount,
  formatOptionalCompact,
  formatTokenTotal,
  tokenUsage,
} from "./agentSession";
import "./AgentHistoryDrawer.css";

function formatRelativeTime(timestamp: string) {
  const time = new Date(timestamp);
  if (Number.isNaN(time.getTime())) return t("history.unknownTime");
  const seconds = Math.round((time.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  if (absoluteSeconds < 60) return formatUiRelativeTime(seconds, "second");
  if (absoluteSeconds < 3600)
    return formatUiRelativeTime(Math.round(seconds / 60), "minute");
  if (absoluteSeconds < 86400)
    return formatUiRelativeTime(Math.round(seconds / 3600), "hour");
  return formatUiRelativeTime(Math.round(seconds / 86400), "day");
}

export function AgentHistoryDrawer({
  pane,
  open,
  embedded = false,
  wide = false,
  onOpenChange,
}: {
  pane: Pane;
  open: boolean;
  embedded?: boolean;
  wide?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const workspaces = useStoreSelector((state) => state.workspaces);
  const t = useT();
  const connectionClient = useConnectionClient();
  const workspaceLabel =
    workspaces.find((workspace) => workspace.workspace_id === pane.workspace_id)
      ?.label ?? pane.workspace_id;
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<HistoryFilters>({
    ...ALL_HISTORY_FILTERS,
    tool: false,
  });
  const [session, setSession] = useState<AgentSessionSummary | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [view, setView] = useState<AgentHistoryView>(readAgentHistoryView);
  const chatView = view === "chat";
  const [previewPane, setPreviewPane] = useState<Pane | null>(null);
  const [previewSummary, setPreviewSummary] =
    useState<AgentSessionSummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [expandedMessage, setExpandedMessage] =
    useState<AgentHistoryEntry | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [highlightedSequence, setHighlightedSequence] = useState<number | null>(
    null,
  );
  // Wide layout: the list sits in a resizable master column and the selected
  // entry opens in an inline detail panel instead of the modal dialog.
  const [wideListRatio, setWideListRatio] = useState(
    DEFAULT_INSPECTOR_NAVIGATION_RATIO,
  );
  const [wideSelectedId, setWideSelectedId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wideSplitRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const previewSeqRef = useRef(0);
  // History's window: the last conversation entries, then only what changed;
  // tool payloads are fetched on demand (useAgentHistoryWindow, shared with
  // Chat).
  const {
    history,
    messages: hydratedMessages,
    loading,
    error: historyError,
    refresh: loadHistory,
    toolEntryTexts,
    toolEntryLoading,
    toolEntryFailedRef,
    loadToolEntry,
  } = useAgentHistoryWindow({
    pane,
    client: connectionClient,
    active: open,
    pollMs: 4000,
  });
  // One set for the hook's lifetime, updated in place.
  const toolEntryFailed = toolEntryFailedRef.current;
  const messages = hydratedMessages;
  // Substitute fetched tool payloads only while they still match the entry.
  const hydrateEntry = useCallback(
    (entry: AgentHistoryEntry): AgentHistoryEntry => {
      const overlay = toolEntryTexts.get(entry.id);
      return overlay !== undefined && toolOverlayMatches(overlay, entry)
        ? { ...entry, text: overlay.text }
        : entry;
    },
    [toolEntryTexts],
  );
  const error = [historyError, sessionError].filter(Boolean).join("\n");
  // The session summary refreshes with the history. Only the newest read
  // for the current pane and connection publishes: a late answer from an
  // earlier poll, pane or connection is dropped, success or failure.
  const sessionSeqRef = useRef(0);
  const loadSession = useCallback(() => {
    if (!pane.agent || !connectionClient.isCurrent()) return;
    const seq = ++sessionSeqRef.current;
    const current = () =>
      connectionClient.isCurrent() && sessionSeqRef.current === seq;
    connectionClient
      .call("agent_session.get", { pane_id: pane.pane_id, agent: pane.agent })
      .then((value) => {
        if (!current()) return;
        setSession(value as AgentSessionSummary);
        setSessionError("");
      })
      .catch((reason: unknown) => {
        if (!current()) return;
        setSessionError(
          reason instanceof Error ? reason.message : String(reason),
        );
      });
  }, [connectionClient, pane.agent, pane.pane_id]);
  // A new pane, agent or connection drops reads still in flight.
  useEffect(() => {
    sessionSeqRef.current += 1;
  }, [connectionClient, pane.agent, pane.pane_id]);
  const refreshAll = useCallback(() => {
    loadHistory();
    loadSession();
  }, [loadHistory, loadSession]);

  useEffect(() => {
    // Resource-derived state belongs to one pane and one connection lease.
    // Invalidate old continuations before loading a colliding pane ID from a
    // switched connection or replacement runtime.
    previewSeqRef.current += 1;
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedSequence(null);
    setWideSelectedId(null);
    setWideListRatio(DEFAULT_INSPECTOR_NAVIGATION_RATIO);
    setQuery("");
    setSession(null);
    setDetailsOpen(false);
    setExpandedMessage(null);
    setPreviewPane(null);
    setPreviewSummary(null);
    setPreviewLoading(false);
    setPreviewError("");
    setSessionError("");
  }, [
    connectionClient,
    pane.agent,
    pane.pane_id,
    pane.workspace_id,
    pane.tab_id,
  ]);

  const timelineSelection = useMemo(
    () => selectHistoryEntries(hydratedMessages, filters, query),
    [hydratedMessages, filters, query],
  );
  // The chat view has no type filter: it shows every entry, with tool entries
  // collapsed into blocks between the conversation bubbles. Its search keeps
  // a tool call and its result together.
  const chatEntries = useMemo(
    () => (chatView ? searchHistoryChatEntries(hydratedMessages, query) : null),
    [chatView, hydratedMessages, query],
  );
  const visibleMessages = chatEntries ?? timelineSelection.visible;
  const counts = timelineSelection.counts;
  const chatItems = useMemo(
    () => (chatView ? groupHistoryChatItems(visibleMessages) : []),
    [chatView, visibleMessages],
  );
  // The chat view reads full messages in the modal dialog at any width; only
  // the wide timeline uses the inline master-detail reader.
  const masterDetail = wide && !chatView;
  const wideSelectedEntry = masterDetail
    ? (visibleMessages.find((entry) => entry.id === wideSelectedId) ?? null)
    : null;
  const activeMessage = masterDetail
    ? !detailsOpen
      ? wideSelectedEntry
      : null
    : expandedMessage;

  // A refresh can swap the expanded entry for a redacted stub whose fetched
  // text was pruned (e.g. tool arguments rewritten under the same call id).
  // Refetch instead of showing a blank dialog; failed fetches are not
  // retried automatically (the card's manual Load button still works).
  useEffect(() => {
    if (
      !open ||
      !activeMessage ||
      !isToolContentPending(activeMessage) ||
      toolEntryLoading.has(activeMessage.id) ||
      toolEntryFailed.has(activeMessage.id)
    ) {
      return;
    }
    const overlay = toolEntryTexts.get(activeMessage.id);
    if (overlay !== undefined && toolOverlayMatches(overlay, activeMessage))
      return;
    loadToolEntry(activeMessage);
  }, [
    activeMessage,
    open,
    toolEntryFailed,
    toolEntryTexts,
    toolEntryLoading,
    loadToolEntry,
  ]);

  useEffect(() => {
    if (!open) return;
    if (document.visibilityState === "visible") loadSession();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadSession();
    }, 4000);
    return () => {
      window.clearInterval(timer);
    };
  }, [loadSession, open, pane.terminal_id]);

  useEffect(() => {
    if (!open) {
      setExpandedMessage(null);
      setPreviewPane(null);
      setPreviewSummary(null);
      setPreviewError("");
    }
  }, [open]);

  const openSessionPreview = useCallback(() => {
    if (
      !pane.agent ||
      session?.status !== "ok" ||
      !connectionClient.isCurrent()
    ) {
      return;
    }
    const seq = ++previewSeqRef.current;
    setPreviewPane(pane);
    setPreviewSummary(null);
    setPreviewError("");
    setPreviewLoading(true);
    connectionClient
      .call("agent_session.get", {
        pane_id: pane.pane_id,
        agent: pane.agent,
        include_text: true,
        include_trajectory: true,
        preview_limit: 1024 * 1024,
      })
      .then((result) => {
        if (connectionClient.isCurrent() && previewSeqRef.current === seq) {
          setPreviewSummary(result as AgentSessionSummary);
        }
      })
      .catch((value) => {
        if (connectionClient.isCurrent() && previewSeqRef.current === seq) {
          setPreviewError(
            value instanceof Error ? value.message : String(value),
          );
        }
      })
      .finally(() => {
        if (connectionClient.isCurrent() && previewSeqRef.current === seq) {
          setPreviewLoading(false);
        }
      });
  }, [connectionClient, pane, session?.status]);

  const closeSessionPreview = useCallback(() => {
    previewSeqRef.current += 1;
    setPreviewPane(null);
    setPreviewSummary(null);
    setPreviewError("");
  }, []);

  useEffect(
    () => () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    },
    [],
  );

  const changeFilters = (next: HistoryFilters, nextQuery = query) => {
    setFilters(next);
    setQuery(nextQuery);
    setExpandedMessage((entry) =>
      entry &&
      (chatView
        ? searchHistoryChatEntries(hydratedMessages, nextQuery).some(
            (item) => item.id === entry.id,
          )
        : selectHistoryEntries([hydrateEntry(entry)], next, nextQuery).visible
            .length)
        ? entry
        : null,
    );
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedSequence(null);
    // The chat jumps back to its newest message itself (followKey).
    if (!chatView && contentRef.current) contentRef.current.scrollTop = 0;
  };

  // Stable identity so the message dialog's focus effect only re-runs when the
  // message itself changes, not on every drawer re-render.
  const closeExpandedMessage = useCallback(() => setExpandedMessage(null), []);

  const usage = tokenUsage(session);
  // Minimap entries: every visible timeline card, or every chat bubble (tool
  // chip rows are not indexed).
  const messageEntries = useMemo(
    () =>
      chatView
        ? chatItems.flatMap((item) =>
            item.type === "message"
              ? [{ message: item.entry, sequence: item.sequence }]
              : [],
          )
        : visibleMessages.map((message, index) => ({
            message,
            sequence: index + 1,
          })),
    [chatItems, chatView, visibleMessages],
  );

  const scrollToMessage = useCallback(
    (sequence: number) => {
      const card = timelineRef.current?.querySelector(
        `[data-sequence="${sequence}"]`,
      );
      if (!(card instanceof HTMLElement)) return;
      if (masterDetail) {
        // Master-detail: the minimap selects the entry in the detail panel
        // and scrolls its row into view instead of flashing a highlight.
        const message = messageEntries[sequence - 1]?.message;
        if (message) setWideSelectedId(message.id);
        card.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "nearest",
        });
        return;
      }
      const reduceMotion = prefersReducedMotion();
      card.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      setHighlightedSequence(sequence);
      highlightTimerRef.current = window.setTimeout(() => {
        highlightTimerRef.current = null;
        setHighlightedSequence(null);
      }, 1200);
    },
    [masterDetail, messageEntries],
  );
  const minimapEntries = useMemo(
    () =>
      messageEntries.map(({ message }) => ({
        id: message.id,
        role: message.role,
        label: historyEntryLabel(message),
        text: message.text,
      })),
    [messageEntries],
  );
  const selectMinimapEntry = useCallback(
    (index: number) => scrollToMessage(index + 1),
    [scrollToMessage],
  );

  const updateWideRatioFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const split = wideSplitRef.current;
      if (!split) return;
      const bounds = split.getBoundingClientRect();
      setWideListRatio(
        inspectorNavigationRatioAtPosition(
          event.clientX - bounds.left,
          bounds.width,
        ),
      );
    },
    [],
  );

  const handleWideResizerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const split = wideSplitRef.current;
      if (!split) return;
      const availableWidth = split.getBoundingClientRect().width;
      let next: number | null = null;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        next = inspectorNavigationRatioAtPosition(
          wideListRatio * availableWidth +
            (event.key === "ArrowLeft" ? -16 : 16),
          availableWidth,
        );
      } else if (event.key === "Home") {
        next = inspectorNavigationRatioAtPosition(0, availableWidth);
      } else if (event.key === "End") {
        next = inspectorNavigationRatioAtPosition(
          availableWidth,
          availableWidth,
        );
      }
      if (next === null) return;
      event.preventDefault();
      setWideListRatio(next);
    },
    [wideListRatio],
  );
  const sessionReady = session?.status === "ok";
  const historyReady = history?.status === "ok" || messages.length > 0;
  const hasSessionData = sessionReady || historyReady;
  const unavailable = !loading && !hasSessionData;
  const unavailableDetail =
    session?.detail ||
    history?.detail ||
    error ||
    t("history.noTranscriptReported");
  const unavailableCommand = session?.command || history?.command;
  const updatedAt = sessionReady
    ? session.updated_at
    : historyReady
      ? history?.updated_at
      : undefined;

  const sessionActions = sessionReady ? (
    <>
      <button
        type="button"
        className="agent-history-icon"
        onClick={openSessionPreview}
        aria-label={t("history.openTranscript")}
        title={t("history.openTranscript")}
      >
        <Eye size={14} />
      </button>
      <button
        type="button"
        className="agent-history-icon"
        onClick={() =>
          downloadSession(pane, connectionClient, session.session?.value)
        }
        aria-label={t("history.exportSession")}
        title={t("history.exportSession")}
      >
        <Download size={14} />
      </button>
    </>
  ) : null;

  const historySearch = (
    <div className="agent-history-search">
      <input
        type="search"
        aria-label={t("history.searchHistoryAria")}
        placeholder={t("history.searchHistoryPlaceholder")}
        title={t("history.searchHistoryTitle")}
        value={query}
        onChange={(event) => changeFilters(filters, event.currentTarget.value)}
      />
    </div>
  );
  const historyFilters = (
    <>
      {historySearch}
      <AgentHistoryFilters
        filters={filters}
        counts={counts}
        onToggle={(category) =>
          changeFilters({
            ...filters,
            [category]: !filters[category],
          })
        }
      />
    </>
  );
  // The timeline keeps a flat strip above its cards; the chat view gets the
  // side rail beside its bubbles.
  const historyMinimap = (orientation: "auto" | "horizontal") =>
    minimapEntries.length > 1 ? (
      <ConversationMinimap
        entries={minimapEntries}
        scrollerRef={contentRef}
        itemsRef={timelineRef}
        orientation={orientation}
        label={t("history.jumpToMessage")}
        className={orientation === "horizontal" ? "agent-history-minimap" : ""}
        onSelect={selectMinimapEntry}
      />
    ) : null;
  const historyCards = (
    <div className="agent-history-timeline" ref={timelineRef}>
      {messageEntries.map(({ message, sequence }) => (
        <AgentHistoryCard
          entry={message}
          index={sequence}
          key={message.id}
          highlighted={highlightedSequence === sequence}
          selected={wide && wideSelectedId === message.id}
          contentLoading={toolEntryLoading.has(message.id)}
          onExpand={
            wide ? (entry) => setWideSelectedId(entry.id) : setExpandedMessage
          }
          onLoadContent={loadToolEntry}
        />
      ))}
    </div>
  );
  const historyEmptyState =
    loading && messages.length === 0 ? (
      <div className="agent-history-state">
        <span className="terminal-loading-dot" />
        {t("history.loadingMessages")}
      </div>
    ) : visibleMessages.length === 0 ? (
      <div className="agent-history-state">
        {messages.length > 0 ? (
          <>
            {chatView
              ? t("history.noMatchSearch")
              : query.trim()
                ? t("history.noMatchSearchAndTypes")
                : t("history.noMatchTypes")}
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                // The chat view only clears its search; the timeline's
                // hidden type filters keep their state.
                changeFilters(chatView ? filters : ALL_HISTORY_FILTERS, "")
              }
            >
              {chatView
                ? t("history.clearSearch")
                : query.trim()
                  ? t("history.resetFilters")
                  : t("history.showAllTypes")}
            </button>
          </>
        ) : (
          t("history.noEntries")
        )}
      </div>
    ) : null;
  const historyTimeline = (
    <div className="agent-history-content" ref={contentRef}>
      {historyEmptyState ?? historyCards}
    </div>
  );
  const historyChat = (
    <div
      className="agent-history-messages"
      role="region"
      aria-label={t("history.historyMessagesAria")}
    >
      {historySearch}
      {historyEmptyState ?? (
        <div className="agent-history-chat-frame">
          <AgentHistoryChat
            items={chatItems}
            speechActive={open}
            // Speech belongs to this connection's pane and session.
            speechScopeKey={JSON.stringify([
              connectionClient.connectionId,
              connectionClient.generation,
              pane.pane_id,
              history?.path,
              session?.session?.value,
            ])}
            listRef={contentRef}
            contentRef={timelineRef}
            highlightedSequence={highlightedSequence}
            followKey={query}
            toolLoading={toolEntryLoading}
            onLoadTool={loadToolEntry}
            onOpen={setExpandedMessage}
          />
          {historyMinimap("auto")}
        </div>
      )}
      <HistoryTerminalComposer
        key={connectionClientScopeKey(
          connectionClient,
          pane.pane_id,
          pane.terminal_id,
        )}
        pane={pane}
        open={open}
        onSent={refreshAll}
      />
    </div>
  );
  const changeView = (next: AgentHistoryView) => {
    setView(next);
    writeAgentHistoryView(next);
    setDetailsOpen(false);
    setExpandedMessage(null);
  };

  // Wide layout: master-detail. The left column is a resizable list of
  // compact entries; the right column reads the selected entry in full.
  const wideMessagesPanel = (
    <div
      className="agent-history-wide"
      ref={wideSplitRef}
      role="region"
      aria-label={t("history.historyMessagesAria")}
      style={
        {
          "--agent-history-list-width": `${wideListRatio * 100}%`,
        } as CSSProperties
      }
    >
      <div className="agent-history-wide-list">
        {historyFilters}
        {historyMinimap("horizontal")}
        {historyTimeline}
      </div>
      <div
        className="workspace-inspector-split-resizer"
        role="separator"
        tabIndex={0}
        aria-label={t("history.resizeListAria")}
        aria-orientation="vertical"
        aria-valuemin={15}
        aria-valuemax={75}
        aria-valuenow={Math.round(wideListRatio * 100)}
        title={t("history.resizeListTitle")}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          updateWideRatioFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          updateWideRatioFromPointer(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onDoubleClick={() =>
          setWideListRatio(DEFAULT_INSPECTOR_NAVIGATION_RATIO)
        }
        onKeyDown={handleWideResizerKeyDown}
      />
      <div className="agent-history-wide-detail">
        {wideSelectedEntry ? (
          <AgentMessageContent
            message={hydrateEntry(wideSelectedEntry)}
            embedded
            onClose={() => setWideSelectedId(null)}
          />
        ) : (
          <div className="agent-history-wide-placeholder">
            {t("history.readHerePlaceholder")}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`agent-history-drawer ${open ? "is-open" : ""} ${
          embedded ? "is-embedded" : ""
        } ${wide ? "is-wide" : ""}`}
        aria-label={t("history.drawerAria")}
        aria-hidden={!open}
        ref={(node) => {
          node?.toggleAttribute("inert", !open);
        }}
      >
        <div className="agent-history-drawer-head">
          <div className="agent-history-identity">
            <AgentIcon agent={pane.agent} />
            <div className="agent-history-title">
              <strong>
                {t("history.sessionLabel")}
                {messages.length > 0 ? (
                  <span
                    className="agent-history-count"
                    aria-label={t("history.countAria", {
                      shown: visibleMessages.length,
                      total: messages.length,
                    })}
                    title={t("history.countTitle")}
                  >
                    {visibleMessages.length === messages.length
                      ? messages.length
                      : `${visibleMessages.length}/${messages.length}`}
                  </span>
                ) : null}
              </strong>
              <span title={workspaceLabel}>
                {workspaceLabel} ·{" "}
                {paneAgentTitle(pane) || t("history.agentFallback")} ·{" "}
                {shortId(pane.pane_id)}
              </span>
            </div>
          </div>
          <span
            className={`agent-history-status is-${pane.agent_status.toLowerCase()}`}
          >
            {pane.agent_status}
          </span>
          <div className="agent-history-actions">
            <button
              type="button"
              className="agent-history-icon"
              aria-label={t("history.chatView")}
              aria-pressed={chatView && !detailsOpen}
              title={
                chatView && !detailsOpen
                  ? t("history.showAsTimeline")
                  : t("history.showAsChat")
              }
              onClick={() =>
                changeView(chatView && !detailsOpen ? "timeline" : "chat")
              }
              disabled={!hasSessionData}
            >
              <MessagesSquare size={14} />
            </button>
            <button
              type="button"
              className="agent-history-icon"
              aria-label={t("history.detailsAria")}
              aria-pressed={detailsOpen}
              title={
                detailsOpen
                  ? t("history.showHistory")
                  : t("history.showDetails")
              }
              onClick={() => setDetailsOpen((current) => !current)}
              disabled={!hasSessionData}
            >
              <Info size={14} />
            </button>
            {sessionActions}
            <button
              type="button"
              className={`agent-history-icon ${loading ? "is-loading" : ""}`}
              onClick={refreshAll}
              aria-label={t("history.refreshSession")}
              title={t("history.refresh")}
              disabled={loading}
            >
              <RefreshCw size={14} />
            </button>
            {!embedded ? (
              <button
                type="button"
                className="agent-history-icon"
                onClick={() => onOpenChange(false)}
                aria-label={t("history.closeSession")}
                title={t("history.close")}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        {pane.agent === "codex" ? (
          <CodexSessionLink
            key={connectionClientScopeKey(
              connectionClient,
              pane.pane_id,
              pane.terminal_id,
            )}
            paneId={pane.pane_id}
            client={connectionClient}
            onLinked={refreshAll}
          />
        ) : null}
        {unavailable ? (
          <div className="agent-history-unavailable" role="status">
            <strong>{t("history.unavailableTitle")}</strong>
            <p>{unavailableDetail}</p>
            {unavailableCommand ? (
              <div className="agent-history-command-row">
                <code>{unavailableCommand}</code>
                <button
                  type="button"
                  className="agent-history-icon"
                  onClick={() => void copyTextWithFeedback(unavailableCommand)}
                  aria-label={t("history.copyIntegrationAria")}
                  title={t("history.copyCommandTitle")}
                >
                  <Copy size={13} />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="secondary-btn"
              onClick={refreshAll}
            >
              <RefreshCw size={13} />
              {t("history.retry")}
            </button>
          </div>
        ) : (
          <>
            {error ? <div className="agent-history-error">{error}</div> : null}
            {!detailsOpen ? (
              chatView ? (
                historyChat
              ) : wide ? (
                wideMessagesPanel
              ) : (
                <div
                  className="agent-history-messages"
                  role="region"
                  aria-label={t("history.historyMessagesAria")}
                >
                  {historyFilters}
                  {historyMinimap("horizontal")}
                  {historyTimeline}
                </div>
              )
            ) : (
              <div
                className="agent-history-details"
                role="region"
                aria-label={t("history.detailsAria")}
              >
                {sessionReady ? (
                  <section
                    className="agent-history-overview"
                    aria-label={t("history.overviewAria")}
                  >
                    <div>
                      <strong>{formatCount(session.stats.turns)}</strong>
                      <span>{t("history.statTurns")}</span>
                    </div>
                    <div>
                      <strong>{formatTokenTotal(session)}</strong>
                      <span>{t("history.statTokens")}</span>
                    </div>
                    <div>
                      <strong
                        title={
                          updatedAt ? formatUiDateTime(updatedAt) : undefined
                        }
                      >
                        {updatedAt ? formatRelativeTime(updatedAt) : "-"}
                      </strong>
                      <span>{t("history.statUpdated")}</span>
                    </div>
                    <p>
                      {t("history.usageInput", {
                        count: formatOptionalCompact(usage?.input_tokens) ?? "",
                      })}
                      <span>·</span>
                      {t("history.usageCached", {
                        count:
                          formatOptionalCompact(usage?.cached_input_tokens) ??
                          "",
                      })}
                      <span>·</span>
                      {t("history.usageOutput", {
                        count:
                          formatOptionalCompact(usage?.output_tokens) ?? "",
                      })}
                    </p>
                  </section>
                ) : null}
                <DetailRow
                  label={t("history.detailWorkspace")}
                  value={workspaceLabel}
                />
                <DetailRow
                  label={t("history.detailAgent")}
                  value={pane.agent ?? "-"}
                />
                <DetailRow
                  label={t("history.detailPane")}
                  value={shortId(pane.pane_id)}
                />
                <DetailRow
                  label={t("history.detailSessionId")}
                  value={session?.session?.value || "-"}
                  copyable={!!session?.session?.value}
                />
                <DetailRow
                  label={t("history.detailSessionFile")}
                  value={session?.path || history?.path || "-"}
                  copyable={!!(session?.path || history?.path)}
                />
                <DetailRow
                  label={t("history.detailRecords")}
                  value={
                    sessionReady ? formatCount(session.stats.records) : "-"
                  }
                />
                <DetailRow
                  label={t("history.detailFileSize")}
                  value={sessionReady ? formatBytes(session.file?.size) : "-"}
                />
                <DetailRow
                  label={t("history.detailReasoning")}
                  value={formatOptionalCompact(usage?.reasoning_output_tokens)}
                />
                <DetailRow
                  label={t("history.detailUpdated")}
                  value={updatedAt ? formatUiDateTime(updatedAt) : "-"}
                />
              </div>
            )}
          </>
        )}
      </aside>
      <AgentMessageDialog
        message={
          !masterDetail && expandedMessage
            ? hydrateEntry(expandedMessage)
            : null
        }
        onClose={closeExpandedMessage}
      />
      <AgentSessionPreviewDialog
        pane={previewPane}
        summary={previewSummary}
        loading={previewLoading}
        error={previewError}
        onClose={closeSessionPreview}
      />
    </>
  );
}
