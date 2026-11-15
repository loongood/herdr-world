import { useEffect, useState } from "react";
import type { ConnectionClient } from "../api";
import { store, useOperationalStore } from "../store";
import { useConnectionClient } from "../useConnectionClient";
import { useStableCallback } from "../world/useStableCallback";
import { useT } from "../i18n";
import { TextInputDialog } from "./ModalDialogs";

type Location = {
  client: ConnectionClient;
  workspaceId: string;
  key: string | null;
  directory: string;
};

/** Edits where new worktrees of the workspace's repository are created. */
export function WorktreeLocationDialog({
  open,
  workspaceId,
  onClose,
}: {
  open: boolean;
  workspaceId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const connectionClient = useConnectionClient();
  const operations = useOperationalStore();
  const [location, setLocation] = useState<Location | null>(null);
  const close = useStableCallback(onClose);
  const current =
    location?.client === connectionClient &&
    location.workspaceId === workspaceId
      ? location
      : null;

  useEffect(() => {
    if (!open || !workspaceId) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    connectionClient
      .call("settings.worktree_directory.get", { workspace_id: workspaceId })
      .then((result) => {
        if (cancelled || !connectionClient.isCurrent()) return;
        setLocation({
          client: connectionClient,
          workspaceId,
          key: result?.key ?? null,
          directory: result?.worktree_directory ?? "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        store.notify({
          kind: "error",
          message: t("worktree.locationReadFailed"),
          detail: (error as Error).message,
        });
        close();
      });
    return () => {
      cancelled = true;
    };
  }, [close, connectionClient, open, workspaceId]);

  return (
    <TextInputDialog
      open={open && !!current}
      title={t("worktree.locationTitle")}
      label={t("worktree.locationLabel")}
      initialValue={current?.directory ?? ""}
      placeholder="/path/to/worktrees"
      submitLabel={t("worktree.saveAction")}
      onClose={onClose}
      onSubmit={(value) => {
        // Save only through the connection and runtime generation that read
        // this location; never through whichever connection is focused now.
        if (!current || !connectionClient.isCurrent()) return;
        const key = current.key;
        onClose();
        if (!key) return;
        void operations.setRepoWorktreeDirectory(key, value.trim());
      }}
    />
  );
}
