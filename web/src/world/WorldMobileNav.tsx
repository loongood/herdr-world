import {
  Castle,
  LayoutDashboard,
  type LucideIcon,
  PanelsTopLeft,
  StickyNote,
} from "lucide-react";
import { t } from "../i18n";
import type { WorldView } from "./worldViewRouting";
import "./WorldMobileNav.css";

export const WORLD_VIEW_DESTINATIONS: readonly {
  view: WorldView;
  Icon: LucideIcon;
}[] = [
  { view: "town", Icon: Castle },
  { view: "board", Icon: StickyNote },
  { view: "desk", Icon: LayoutDashboard },
  { view: "spaces", Icon: PanelsTopLeft },
];

export function worldViewLabel(view: WorldView) {
  return t(`views.${view}`);
}

/**
 * The phone's bottom navigation bar for World's root screens, following the
 * platform pattern: three to five destinations, icon over label, the current
 * one marked. Detail screens (a terminal, Spaces) hide it and show Back.
 */
export function WorldMobileNav({
  view,
  onSelect,
}: {
  view: WorldView;
  onSelect: (view: WorldView) => void;
}) {
  return (
    <nav className="world-mobile-nav" aria-label={t("views.mobileNavAria")}>
      {WORLD_VIEW_DESTINATIONS.map(({ view: destination, Icon }) => (
        <button
          key={destination}
          type="button"
          aria-current={destination === view ? "page" : undefined}
          onClick={() => {
            if (destination !== view) onSelect(destination);
          }}
        >
          <span className="world-mobile-nav-icon">
            <Icon size={22} aria-hidden />
          </span>
          <span className="world-mobile-nav-label">
            {worldViewLabel(destination)}
          </span>
        </button>
      ))}
    </nav>
  );
}
