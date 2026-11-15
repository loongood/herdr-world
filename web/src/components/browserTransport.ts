import { t } from "../i18n";
import type { ConnectionStatus } from "../api";

export interface BrowserTransportPresentation {
  label: string;
  clientCount: number | null;
  pauseOthersLabel: string | null;
  needsResume: boolean;
  toggleLabel: string;
}

export function browserTransportPresentation(
  connectionPaused: boolean,
  status: ConnectionStatus,
  reportedClientCount: number | null | undefined,
): BrowserTransportPresentation {
  let label = t("connections.browserDisconnected");
  if (connectionPaused) {
    label = t("connections.browserSyncPaused");
  } else if (status === "connected") {
    label = t("connections.browserConnected");
  } else if (status === "connecting") {
    label = t("connections.browserConnecting");
  }
  const clientCount =
    !connectionPaused && status === "connected"
      ? (reportedClientCount ?? null)
      : null;
  const otherClientCount =
    typeof clientCount === "number" ? Math.max(0, clientCount - 1) : 0;
  let pauseOthersLabel: string | null = null;
  if (otherClientCount === 1) {
    pauseOthersLabel = t("connections.pauseOtherBrowser");
  } else if (otherClientCount > 1) {
    pauseOthersLabel = t("connections.pauseOtherBrowsers", {
      count: otherClientCount,
    });
  }
  const needsResume = connectionPaused || status === "disconnected";
  let toggleLabel = t("connections.pauseBrowserSync");
  if (connectionPaused) {
    toggleLabel = t("connections.resumeBrowserSync");
  } else if (status === "disconnected") {
    toggleLabel = t("connections.reconnectBrowser");
  }

  return {
    label,
    clientCount,
    pauseOthersLabel,
    needsResume,
    toggleLabel,
  };
}
