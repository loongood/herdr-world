import { useRef, useState, type Ref, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import {
  SquareTerminal,
  FolderTree,
  MessagesSquare,
  FileDiff,
  GitGraph,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import "./InterestButton.css";
import type { InspectorView } from "../workspaceResource";
import { t, useT } from "../i18n";

export function inspectorTabLabel(view: InspectorView): string | undefined {
  switch (view) {
    case "history":
      return t("inspector.tabChat");
    case "terminal":
      return t("inspector.tabTerminal");
    case "changes":
      return t("inspector.tabChanges");
    case "files":
      return t("inspector.tabFiles");
    case "commits":
      return t("inspector.tabCommits");
    default:
      return undefined;
  }
}

/** The Inspector's views as its top selector shows them, Chat first. */
export const INSPECTOR_TAB_ORDER: readonly InspectorView[] = [
  "history",
  "terminal",
  "files",
  "changes",
  "commits",
];

const MOBILE_VIEWS: readonly InspectorView[] = [
  "history",
  "terminal",
  "files",
  "changes",
];

/** Mobile's primary view switcher; attention belongs to the window menu. */
export function WorkspaceInspectorViewSelect({
  value,
  availableViews,
  historyAvailable,
  onChange,
}: {
  value: InspectorView;
  availableViews: readonly InspectorView[];
  historyAvailable: boolean;
  onChange(view: InspectorView): void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const views = MOBILE_VIEWS.filter((view) => availableViews.includes(view));
  const icons = {
    terminal: SquareTerminal,
    files: FolderTree,
    history: MessagesSquare,
    changes: FileDiff,
    commits: GitGraph,
  };
  const Icon = icons[value];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className="interest-button workspace-inspector-view-select"
          aria-label={t("inspector.viewAria", {
            view: inspectorTabLabel(value) ?? value,
          })}
          title={t("inspector.viewTitle", {
            view: inspectorTabLabel(value) ?? value,
          })}
        >
          <Icon size={17} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="interest-popover"
        align="end"
        collisionPadding={8}
      >
        <div
          className="interest-choices"
          role="group"
          aria-label={t("inspector.viewsGroupAria")}
        >
          {views.map((view) => {
            const ViewIcon = icons[view];
            return (
              <button
                type="button"
                key={view}
                className="interest-choice"
                data-view={view}
                aria-pressed={value === view}
                disabled={view === "history" && !historyAvailable}
                onClick={() => {
                  if (view === "history" && !historyAvailable) return;
                  // Let the shared layer restore focus before Chat captures
                  // its new opening origin. Escape/Back keep their policy.
                  flushSync(() => setOpen(false));
                  if (view === "history")
                    triggerRef.current?.focus({ preventScroll: true });
                  onChange(view);
                }}
              >
                <ViewIcon size={15} aria-hidden="true" />
                <span>
                  <b>{inspectorTabLabel(view) ?? view}</b>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Keep secondary controls after the four primary views. */
export function WorkspaceInspectorSecondaryControls({
  commitsAvailable,
  hideInactiveCommits = false,
  view,
  commitsRef,
  onViewChange,
  onKeyDown,
}: {
  commitsAvailable: boolean;
  hideInactiveCommits?: boolean;
  view: InspectorView;
  commitsRef: Ref<HTMLButtonElement>;
  onViewChange(view: InspectorView): void;
  onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void;
}) {
  const t = useT();
  return (
    <>
      {commitsAvailable && (!hideInactiveCommits || view === "commits") ? (
        <div
          className="workspace-inspector-tabs"
          role="tablist"
          aria-label={t("inspector.additionalViewsAria")}
        >
          <button
            ref={commitsRef}
            type="button"
            role="tab"
            aria-label={t("inspector.tabCommits")}
            title={t("inspector.tabCommits")}
            aria-selected={view === "commits"}
            tabIndex={view === "commits" ? 0 : -1}
            className={view === "commits" ? "is-active" : ""}
            onClick={() => onViewChange("commits")}
            onKeyDown={onKeyDown}
          >
            <GitGraph size={14} aria-hidden="true" />
            <span className="workspace-inspector-tab-label">
              {t("inspector.tabCommits")}
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}
