import {
  ArrowDown,
  ArrowUp,
  Clipboard,
  MessageSquareText,
  Pin,
  PinOff,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  diffReviewLineLabel,
  fileReviewLineLabel,
  terminalAnnotationTitle,
  type ReviewAnnotation,
} from "../annotations";
import {
  shortcutLabel,
  shortcutMatches,
  shortcutTitle,
  useShortcutPreferences,
} from "../shortcutPreferences";
import { type TranslationKey, useT } from "../i18n";
import type { Pane } from "../types";
import { ConfirmDialog } from "./ModalDialogs";
import { ThemedSelect } from "./ThemedSelect";
import "./AnnotationPanel.css";

function annotationLocation(
  annotation: ReviewAnnotation,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) {
  if (annotation.source === "terminal")
    return t("annotations.locationTerminal", { title: annotation.title });
  if (annotation.source === "diff") {
    return t("annotations.locationDiff", {
      path: annotation.path,
      lines: diffReviewLineLabel(annotation),
    });
  }
  if (annotation.anchor === "line") {
    return t("annotations.locationFile", {
      path: annotation.path,
      lines: fileReviewLineLabel(annotation),
    });
  }
  return annotation.section.length
    ? t("annotations.locationMarkdownSection", {
        path: annotation.path,
        section: annotation.section.join(" › "),
      })
    : t("annotations.locationMarkdownSelection", { path: annotation.path });
}

function paneLabel(pane: Pane) {
  return terminalAnnotationTitle(pane);
}

export function AnnotationPanel({
  open,
  floating,
  onToggleFloating,
  annotations,
  agentPanes,
  preferredPaneId,
  busy,
  focusedAnnotationId,
  onClose,
  onUpdateComment,
  onDelete,
  onMove,
  onClear,
  onCopy,
  onSend,
  onGoToAgent,
}: {
  open: boolean;
  floating: boolean;
  onToggleFloating?: () => void;
  annotations: readonly ReviewAnnotation[];
  agentPanes: readonly Pane[];
  preferredPaneId?: string;
  busy: boolean;
  focusedAnnotationId?: string | null;
  onClose: () => void;
  onUpdateComment: (id: string, comment: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onClear: () => void;
  onCopy: () => void;
  onSend: (paneId: string | null) => void;
  onGoToAgent?: () => void;
}) {
  useShortcutPreferences();
  const t = useT();
  const copyShortcut = shortcutLabel("annotations.copy");
  const prefillShortcut = shortcutLabel("annotations.prefill");
  const hasFeedback = annotations.some((annotation) =>
    annotation.comment.trim(),
  );
  const [targetPaneId, setTargetPaneId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (preferredPaneId) setTargetPaneId(preferredPaneId);
  }, [preferredPaneId]);

  useEffect(() => {
    const preferred = agentPanes.find(
      (pane) => pane.pane_id === preferredPaneId,
    );
    setTargetPaneId((current) => {
      if (agentPanes.some((pane) => pane.pane_id === current)) return current;
      return preferred?.pane_id ?? agentPanes[0]?.pane_id ?? "";
    });
  }, [agentPanes, preferredPaneId]);

  useEffect(() => {
    if (!open || !focusedAnnotationId) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const card = Array.from(
          document.querySelectorAll<HTMLElement>("[data-review-annotation-id]"),
        ).find(
          (element) =>
            element.dataset.reviewAnnotationId === focusedAnnotationId,
        );
        card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        card?.querySelector("textarea")?.focus({ preventScroll: true });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedAnnotationId, open]);

  if (!open) return null;

  return (
    <aside
      className={`annotation-panel ${floating ? "is-floating" : ""}`}
      aria-label={t("annotations.panelAria")}
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          confirmClear ||
          !(event.target instanceof Node) ||
          !event.currentTarget.contains(event.target)
        )
          return;
        const copy = shortcutMatches(event.nativeEvent, "annotations.copy");
        const prefill = shortcutMatches(
          event.nativeEvent,
          "annotations.prefill",
        );
        if (!copy && !prefill) return;
        event.preventDefault();
        event.stopPropagation();
        if (busy || !hasFeedback || event.repeat) return;
        if (copy) onCopy();
        else onSend(targetPaneId || null);
      }}
    >
      <header className="annotation-panel-head">
        <div>
          <strong>{t("annotations.panelTitle")}</strong>
          <span>
            {t(
              annotations.length === 1
                ? "annotations.commentsOne"
                : "annotations.commentsMany",
              { count: annotations.length },
            )}
          </span>
        </div>
        {onToggleFloating ? (
          <button
            type="button"
            className="annotation-icon-button annotation-mode-button"
            aria-label={
              floating ? t("annotations.pinAria") : t("annotations.floatAria")
            }
            title={
              floating
                ? t("annotations.layoutFixedTitle")
                : t("annotations.layoutFloatingTitle")
            }
            aria-pressed={!floating}
            onClick={onToggleFloating}
          >
            {floating ? <Pin size={16} /> : <PinOff size={16} />}
          </button>
        ) : null}
        <button
          type="button"
          className="annotation-icon-button"
          aria-label={t("annotations.closeAria")}
          title={t("annotations.closeTitle")}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>

      <div className="annotation-panel-list">
        {annotations.length === 0 ? (
          <div className="annotation-panel-empty">
            <MessageSquareText size={24} />
            <strong>{t("annotations.emptyTitle")}</strong>
            <span>{t("annotations.emptyHint")}</span>
          </div>
        ) : (
          annotations.map((annotation, index) => (
            <article
              key={annotation.id}
              data-review-annotation-id={annotation.id}
              className={`annotation-card ${
                annotation.id === focusedAnnotationId ? "is-focused" : ""
              }`}
            >
              <div className="annotation-card-head">
                <strong title={annotationLocation(annotation, t)}>
                  {index + 1}. {annotationLocation(annotation, t)}
                </strong>
                {annotation.stale ? (
                  <span>
                    {annotation.source === "terminal"
                      ? t("annotations.stalePane")
                      : t("annotations.staleAnchor")}
                  </span>
                ) : null}
              </div>
              <blockquote
                tabIndex={0}
                aria-label={t("annotations.quoteAria", {
                  number: index + 1,
                })}
              >
                {annotation.quote || t("annotations.blankLine")}
              </blockquote>
              <textarea
                value={annotation.comment}
                rows={3}
                maxLength={10_000}
                aria-label={t("annotations.commentAria", {
                  number: index + 1,
                })}
                onChange={(event) =>
                  onUpdateComment(annotation.id, event.currentTarget.value)
                }
              />
              <div className="annotation-card-actions">
                <button
                  type="button"
                  className="annotation-icon-button"
                  disabled={index === 0}
                  aria-label={t("annotations.moveUpAria", {
                    number: index + 1,
                  })}
                  title={t("annotations.moveUpTitle")}
                  onClick={() => onMove(annotation.id, -1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="annotation-icon-button"
                  disabled={index === annotations.length - 1}
                  aria-label={t("annotations.moveDownAria", {
                    number: index + 1,
                  })}
                  title={t("annotations.moveDownTitle")}
                  onClick={() => onMove(annotation.id, 1)}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  className="annotation-icon-button is-danger"
                  aria-label={t("annotations.deleteAria", {
                    number: index + 1,
                  })}
                  title={t("annotations.deleteTitle")}
                  onClick={() => onDelete(annotation.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <footer className="annotation-panel-footer">
        {agentPanes.length > 1 ? (
          <label className="annotation-target-picker">
            <span>{t("annotations.agentPaneLabel")}</span>
            <ThemedSelect
              aria-label={t("annotations.agentPaneLabel")}
              value={targetPaneId}
              options={agentPanes.map((pane) => ({
                value: pane.pane_id,
                label: paneLabel(pane),
              }))}
              onChange={setTargetPaneId}
            />
          </label>
        ) : agentPanes.length === 1 ? (
          <div className="annotation-target-summary">
            {t("annotations.agentPaneSummary", {
              pane: paneLabel(agentPanes[0]),
            })}
          </div>
        ) : (
          <div className="annotation-target-summary">
            {t("annotations.noAgentPane")}
          </div>
        )}
        <div className="annotation-delivery-actions">
          <button
            type="button"
            className="ghost"
            disabled={busy || !hasFeedback}
            onClick={onCopy}
            title={shortcutTitle(
              t("annotations.copyFeedbackTitle"),
              "annotations.copy",
            )}
          >
            <Clipboard size={14} /> {t("annotations.copyButton")}
            {copyShortcut !== "Unassigned" ? <kbd>{copyShortcut}</kbd> : null}
          </button>
          <button
            type="button"
            disabled={busy || !hasFeedback}
            onClick={() => onSend(targetPaneId || null)}
            title={shortcutTitle(
              agentPanes.length
                ? t("annotations.prefillAgent")
                : t("annotations.copyFeedback"),
              "annotations.prefill",
            )}
          >
            {agentPanes.length ? <Send size={14} /> : <Clipboard size={14} />}
            {agentPanes.length
              ? t("annotations.prefillAgent")
              : t("annotations.copyFeedback")}
            {prefillShortcut !== "Unassigned" ? (
              <kbd>{prefillShortcut}</kbd>
            ) : null}
          </button>
        </div>
        {onGoToAgent ? (
          <button type="button" className="ghost" onClick={onGoToAgent}>
            {t("annotations.goToAgent")}
          </button>
        ) : null}
        <button
          type="button"
          className="annotation-clear-button"
          disabled={busy || annotations.length === 0}
          onClick={() => setConfirmClear(true)}
        >
          {t("annotations.clearDraft")}
        </button>
      </footer>
      <ConfirmDialog
        open={confirmClear}
        title={t("annotations.confirmTitle")}
        message={t("annotations.confirmBody")}
        confirmLabel={t("annotations.confirmAction")}
        danger
        onConfirm={onClear}
        onClose={() => setConfirmClear(false)}
      />
    </aside>
  );
}
