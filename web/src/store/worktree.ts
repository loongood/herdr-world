import { t } from "../i18n";
import { type Notice } from "./types";
import { DEFAULT_NOTICE_AUTO_DISMISS_MS } from "./notifications";

type WorktreeHookEvent =
  | "worktree.created"
  | "worktree.opened"
  | "worktree.before_remove"
  | "worktree.removed";

type WorktreeHookRunResult = {
  event: WorktreeHookEvent;
  status: "skipped" | "succeeded" | "failed";
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
};

type WorktreeRemovalCleanup = {
  terminated_processes?: number;
  recovered_stale_checkout?: boolean;
  preserved_path?: string;
  warning?: string;
};
export const WORKTREE_REMOVED_EVENT = "herdr-world:worktree-removed";

function hookEventLabel(event: WorktreeHookEvent): string {
  switch (event) {
    case "worktree.before_remove":
      return t("storeNotices.worktreeHookTeardown");
    case "worktree.opened":
      return t("storeNotices.worktreeHookOpened");
    case "worktree.removed":
      return t("storeNotices.worktreeHookRemoved");
    case "worktree.created":
      return t("storeNotices.worktreeHookCreated");
  }
}

function hookOutput(
  result: Pick<WorktreeHookRunResult, "stdout" | "stderr" | "error">,
) {
  return [result.stderr, result.stdout, result.error]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join("\n")
    .trim();
}

export function summarizeDirectHookResult(
  result: WorktreeHookRunResult,
): Notice | null {
  if (result.status === "skipped") return null;
  const output = hookOutput(result);
  const exitSuffix =
    typeof result.exit_code === "number" ? ` (exit ${result.exit_code})` : "";
  return {
    kind: result.status === "succeeded" ? "success" : "error",
    message:
      result.status === "succeeded"
        ? t("storeNotices.hookCompleted", {
            hook: hookEventLabel(result.event),
          })
        : `${t("storeNotices.hookFailed", {
            hook: hookEventLabel(result.event),
          })}${exitSuffix}`,
    detail: output ? output.slice(0, 1400) : undefined,
    detailMode: output ? "output" : undefined,
    detailTitle: output
      ? t("storeNotices.hookOutputTitle", {
          hook: hookEventLabel(result.event),
        })
      : undefined,
    ...(result.status === "succeeded"
      ? { autoDismissMs: DEFAULT_NOTICE_AUTO_DISMISS_MS }
      : {}),
  };
}

export function worktreeRemovalCompletionNotice(
  cleanup: WorktreeRemovalCleanup | undefined,
  removedHookNotice: Notice | null,
): Notice | null {
  if (!cleanup?.recovered_stale_checkout && !cleanup?.warning) {
    return removedHookNotice;
  }

  const stopped = Number(cleanup.terminated_processes ?? 0);
  const recoveryDetails = [
    stopped > 0
      ? t(
          stopped === 1
            ? "storeNotices.stoppedProcessOne"
            : "storeNotices.stoppedProcessesMany",
          { count: stopped },
        )
      : "",
    cleanup.preserved_path
      ? t("storeNotices.staleFilesPreserved", {
          path: cleanup.preserved_path,
        })
      : cleanup.recovered_stale_checkout
        ? t("storeNotices.checkoutAlreadyAbsent")
        : "",
    cleanup.warning ?? "",
  ].filter(Boolean);

  if (removedHookNotice) {
    const cleanupWarning = Boolean(cleanup.warning);
    return {
      ...removedHookNotice,
      kind: cleanupWarning ? "error" : removedHookNotice.kind,
      message:
        cleanupWarning && removedHookNotice.kind !== "error"
          ? t("storeNotices.worktreeRemovedWithWarning")
          : removedHookNotice.message,
      detail: [
        cleanupWarning && removedHookNotice.kind !== "error"
          ? removedHookNotice.message
          : "",
        removedHookNotice.detail,
        ...recoveryDetails,
      ]
        .filter(Boolean)
        .join("\n"),
      detailTitle:
        removedHookNotice.detail || cleanupWarning
          ? t("storeNotices.worktreeRemovalDetails")
          : undefined,
    };
  }

  return {
    kind: cleanup.warning ? "error" : "success",
    message: cleanup.warning
      ? t("storeNotices.worktreeRemovedWithWarning")
      : t("storeNotices.worktreeRemoved"),
    detail: recoveryDetails.join("\n"),
  };
}
export { type WorktreeHookRunResult, type WorktreeRemovalCleanup };
