import { X } from "lucide-react";
import {
  WindowBackButton,
  WindowControls,
  type ManagedWindowControls,
} from "../world/windows/WindowControls";
import { useT } from "../i18n";
import "./WorkspaceInspectorFrame.css";

/**
 * The Inspector's frame and bar while its code downloads: its name, Back and
 * the window controls (or Close) stay usable, so a cold first open never
 * shows an empty window.
 */
export function InspectorLoadingShell({
  title,
  dock,
  floating,
  windowControls,
  onClose,
}: {
  title: string;
  dock: string;
  floating: boolean;
  windowControls?: ManagedWindowControls;
  onClose: () => void;
}) {
  const t = useT();
  // The Inspector's own frame and bar classes, so World's managed-window,
  // Town and phone styles apply to the shell exactly as to the Inspector.
  return (
    <aside
      className={`workspace-inspector workspace-inspector-${dock}`}
      aria-label={t("inspector.hostAria")}
      aria-busy="true"
    >
      <header
        className={`workspace-inspector-head ${
          floating ? "is-window-drag-handle" : ""
        }`}
      >
        {windowControls ? (
          <WindowBackButton
            controls={windowControls}
            label={t("inspector.windowLabel")}
          />
        ) : null}
        <div className="workspace-inspector-identity">
          <span className="workspace-inspector-repo">{title}</span>
        </div>
        {windowControls ? (
          <WindowControls
            controls={windowControls}
            label={t("inspector.windowLabel")}
          />
        ) : (
          <div className="workspace-inspector-actions">
            <button
              type="button"
              title={t("inspector.closeInspector")}
              aria-label={t("inspector.closeWorkspaceInspector")}
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </header>
      <div className="terminal-loading" role="status">
        <span className="terminal-loading-dot" />
        {t("inspector.loadingShell")}
      </div>
    </aside>
  );
}
