import { Pencil, X } from "lucide-react";
import type { AssistantQueuedMessage } from "../../../shared/assistant";
import { useT } from "../i18n";
import "./AssistantQueue.css";

/**
 * Messages sent while Ranger answers. Steers join the running turn after its
 * current tool round; queued follow-ups send once the answer finishes. A held
 * queue (after Stop, a failure, or a chat switch) waits for the user, as does
 * one behind a preview awaiting review.
 */
export function AssistantQueue({
  queue,
  running,
  held,
  reviewing,
  disabled,
  onEdit,
  onRemove,
  onResume,
}: {
  queue: AssistantQueuedMessage[];
  running: boolean;
  held: boolean;
  /** An action or task preview from the last answer awaits confirmation. */
  reviewing: boolean;
  disabled: boolean;
  onEdit: (item: AssistantQueuedMessage) => void;
  onRemove: (item: AssistantQueuedMessage) => void;
  onResume: () => void;
}) {
  const t = useT();
  if (!queue.length) return null;
  return (
    <section
      className="assistant-queue"
      aria-label={t("assistant.queuePanelAria")}
    >
      {running || !(held || reviewing) ? null : (
        <div className="assistant-queue-head">
          <span>
            {reviewing
              ? t("assistant.queueReviewHeld")
              : t("assistant.queuePaused")}
          </span>
          <button type="button" disabled={disabled} onClick={onResume}>
            {t("assistant.sendNext")}
          </button>
        </div>
      )}
      <ol>
        {queue.map((item) => (
          <li key={item.id} className={`assistant-queue-item is-${item.mode}`}>
            <span
              className="assistant-queue-mode"
              title={
                item.mode === "steer"
                  ? t("assistant.queueSteerNote")
                  : t("assistant.queueFollowUpNote")
              }
            >
              {item.mode === "steer"
                ? t("assistant.steer")
                : t("assistant.queuedLabel")}
            </span>
            <span className="assistant-queue-text" title={item.text}>
              {item.text}
            </span>
            {item.mode === "follow_up" ? (
              <>
                <button
                  type="button"
                  aria-label={t("assistant.editQueuedAria")}
                  title={t("assistant.editQueuedTitle")}
                  disabled={disabled}
                  onClick={() => onEdit(item)}
                >
                  <Pencil size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={t("assistant.removeQueuedAria")}
                  title={t("assistant.removeQueuedTitle")}
                  disabled={disabled}
                  onClick={() => onRemove(item)}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
