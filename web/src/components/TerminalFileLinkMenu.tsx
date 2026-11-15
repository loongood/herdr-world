import { useEffect, useState } from "react";
import type { ConnectionClient } from "../api";
import {
  directoryPreviewPath,
  normalizeFilesystemPath,
} from "../filesystemPaths";
import { useT } from "../i18n";
import { useStoreSelector } from "../store";
import { ActionsMenu } from "./ActionsMenu";
import { requestFilePreview } from "./fileExplorerResources";
import "./ContextMenu.css";

export type TerminalFileLinkMenuState = {
  x: number;
  y: number;
  path: string;
  workspaceId: string;
};

export function TerminalFileLinkMenu({
  state,
  client,
  onPreview,
  onWorkspace,
  onClose,
}: {
  state: TerminalFileLinkMenuState;
  client: ConnectionClient;
  onPreview: (path: string) => void;
  onWorkspace: (path: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const workspaces = useStoreSelector((state) => state.workspaces);
  const [directory, setDirectory] = useState<string | null>(null);
  const alreadyOpen =
    directory !== null &&
    workspaces.some((workspace) => {
      const root = workspace.worktree?.checkout_path ?? workspace.cwd;
      return root && normalizeFilesystemPath(root) === directory;
    });
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let current = true;
    setDirectory(null);
    setChecking(true);
    void requestFilePreview(state.workspaceId, state.path, { client })
      .then(
        (preview) => {
          if (current && client.isCurrent())
            setDirectory(directoryPreviewPath(preview));
        },
        () => {
          /* Preview retains the existing error UI for unavailable paths. */
        },
      )
      .finally(() => {
        if (current) setChecking(false);
      });
    return () => {
      current = false;
    };
  }, [client, state]);
  return (
    <ActionsMenu
      x={state.x}
      y={state.y}
      header={{ title: state.path }}
      onClose={onClose}
      groups={[
        {
          label: t("components.fileLinkMenu.actions"),
          items: [
            {
              key: "preview",
              label: directory
                ? t("components.fileLinkMenu.previewDirectory")
                : t("components.fileLinkMenu.previewFile"),
              action: () => onPreview(state.path),
            },
            ...(directory && !alreadyOpen
              ? [
                  {
                    key: "workspace",
                    label: t("components.fileLinkMenu.openAsWorkspace"),
                    action: () => onWorkspace(directory),
                  },
                ]
              : []),
            ...(checking
              ? [
                  {
                    key: "checking",
                    label: t("components.fileLinkMenu.checkingDirectory"),
                    disabled: true,
                    action: () => {},
                  },
                ]
              : []),
          ],
        },
      ]}
    />
  );
}
