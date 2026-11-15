import type { InspectorView } from "../workspaceResource";
import { useT } from "../i18n";

/** The views that read the agent's worktree. */
const WORKTREE_VIEWS: ReadonlySet<InspectorView> = new Set([
  "files",
  "changes",
  "commits",
]);

/** Status stays outside the inert resource body and never overlays its editor. */
export function WorkspaceInspectorStatus({
  stale,
  worktreeStale = false,
  view,
  available,
}: {
  stale: boolean;
  /** The agent's worktree is being re-read; only its views say so. */
  worktreeStale?: boolean;
  view?: InspectorView;
  available: boolean;
}) {
  const t = useT();
  return (
    <>
      {stale ? (
        <div className="world-inspector-stale" role="status">
          {t("inspector.staleDisconnected")}
        </div>
      ) : worktreeStale && view && WORKTREE_VIEWS.has(view) ? (
        <div className="world-inspector-stale" role="status">
          {t("inspector.staleWorktree")}
        </div>
      ) : null}
      {!available ? (
        <div className="workspace-inspector-unavailable">
          <strong>{t("inspector.checkoutUnavailable")}</strong>
          <span>{t("inspector.checkoutUnavailableDetail")}</span>
        </div>
      ) : null}
    </>
  );
}
