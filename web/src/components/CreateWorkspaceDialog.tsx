import { Folder } from "lucide-react";
import { useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { WorkspacePathInfo } from "../../../shared/workspacePath";
import { bridge, type ConnectionClient } from "../api";
import {
  creationFailureMessage,
  useCreationProgress,
} from "../creationRequests";
import { useT } from "../i18n";
import { luckyWorkspaceName } from "../luckyName";
import {
  connectionSnapshot,
  endpointCreationReason,
  OperationalContext,
  store,
  useStoreSelector,
} from "../store";
import { useEffectCallback } from "../useEffectCallback";
import { CloseButton } from "./CloseButton";
import { focusDialogElement } from "./dialogFocus";
import { useSuggestedName } from "./useSuggestedName";
import "./CreateWorkspaceDialog.css";

export function CreateWorkspaceDialog({
  open,
  initialName,
  initialCwd,
  initialDestination,
  onClose,
}: {
  open: boolean;
  initialName?: string;
  initialCwd?: string;
  initialDestination?: {
    connectionId: string;
    runtimeGeneration: number;
    sourceWorkspaceId?: string;
  };
  onClose: () => void;
}) {
  const t = useT();
  useCreationProgress();
  const inherited = useContext(OperationalContext);
  const snapshot = useStoreSelector((state) => state);
  const [destination, setDestination] = useState<{
    connectionId: string;
    runtimeGeneration: number;
  } | null>(null);
  const ready = snapshot.connections.filter(
    (connection) => connection.state === "ready",
  );
  const destinationSource = useRef({ ready, inherited, initialDestination });
  destinationSource.current = { ready, inherited, initialDestination };
  const current =
    destination &&
    ready.some(
      (connection) =>
        connection.id === destination.connectionId &&
        connection.generation === destination.runtimeGeneration,
    );
  const createReason = !current
    ? t("createWorkspace.noDestination")
    : endpointCreationReason(
        connectionSnapshot(snapshot, destination!.connectionId),
        "workspace.create",
        destination!.connectionId === initialDestination?.connectionId &&
          destination!.runtimeGeneration ===
            initialDestination.runtimeGeneration
          ? initialDestination.sourceWorkspaceId
          : undefined,
      );
  const labelRef = useRef<HTMLInputElement>(null);
  const [label, setLabel, namePending] = useSuggestedName(
    open,
    initialName?.trim() || luckyWorkspaceName,
    labelRef,
  );
  const [cwd, setCwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionPending = useRef(false);
  const onCloseEvent = useEffectCallback(onClose);

  useEffect(() => {
    if (!open) return;
    const { ready, inherited, initialDestination } = destinationSource.current;
    if (initialDestination) {
      setDestination(initialDestination);
      return;
    }
    const owner =
      ready.find((connection) => connection.id === inherited?.connectionId) ??
      ready[0];
    setDestination(
      owner
        ? { connectionId: owner.id, runtimeGeneration: owner.generation }
        : null,
    );
  }, [open]);
  const client = useMemo(
    () =>
      destination
        ? bridge.connection(
            destination.connectionId,
            destination.runtimeGeneration,
          )
        : null,
    [
      destination?.connectionId,
      destination?.runtimeGeneration,
      snapshot.connectionGeneration,
      snapshot.status,
      snapshot.terminalAttachEpoch,
    ],
  );
  const [pathState, setPathState] = useState<{
    client: ConnectionClient;
    input: string;
    info?: WorkspacePathInfo;
    error?: string;
  } | null>(null);
  const [createError, setCreateError] = useState("");
  const cwdRef = useRef<HTMLInputElement>(null);
  const pathHintId = useId();

  useEffect(() => {
    if (!open) return;
    setCwd(initialCwd?.trim() ?? "");
    const cancelFocus = focusDialogElement(labelRef.current, { select: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseEvent();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelFocus();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, initialName, initialCwd, onCloseEvent]);

  useEffect(() => {
    setCreateError("");
    setPathState(null);
  }, [open, client]);

  const input = cwd.trim();
  useEffect(() => {
    if (!open || !input || !client) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void client.call("workspace.path", { path: input }).then(
        (info: WorkspacePathInfo) => {
          if (!cancelled && client.isCurrent())
            setPathState({ client, input, info });
        },
        (error: Error) => {
          if (!cancelled && client.isCurrent())
            setPathState({ client, input, error: error.message });
        },
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, client, input]);

  if (!open) return null;

  const checked =
    pathState && pathState.client === client && pathState.input === input
      ? pathState
      : null;
  const pathError = checked?.error || checked?.info?.error;
  const checking = !!input && !checked;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      namePending ||
      submissionPending.current ||
      createReason ||
      checking ||
      pathError ||
      !client?.isCurrent()
    )
      return;
    if (!destination) return;
    submissionPending.current = true;
    setSubmitting(true);
    setCreateError("");
    try {
      await store.createQualifiedWorkspace(
        destination,
        label.trim() || undefined,
        input ? checked?.info?.path : undefined,
        {
          sourceWorkspaceId:
            destination.connectionId === initialDestination?.connectionId &&
            destination.runtimeGeneration ===
              initialDestination.runtimeGeneration
              ? initialDestination.sourceWorkspaceId
              : undefined,
        },
      );
      onClose();
    } catch (error) {
      setCreateError(creationFailureMessage(error, "Workspace"));
      store.notify({
        kind: "error",
        message: creationFailureMessage(error, "Workspace"),
        detail: String(error),
      });
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal compact-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("createWorkspace.titleAria")}
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t("createWorkspace.title")}</h2>
          <CloseButton onClick={onClose} />
        </div>

        <label className="form-field">
          <span>{t("createWorkspace.destination")}</span>
          <select
            aria-label={t("createWorkspace.destination")}
            disabled={submitting}
            value={destination?.connectionId ?? ""}
            onChange={(event) => {
              const owner = ready.find(
                (connection) => connection.id === event.target.value,
              );
              setDestination(
                owner
                  ? {
                      connectionId: owner.id,
                      runtimeGeneration: owner.generation,
                    }
                  : null,
              );
            }}
          >
            <option value="" disabled>
              {t("createWorkspace.chooseHost")}
            </option>
            {ready.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{t("createWorkspace.nameLabel")}</span>
          <input
            ref={labelRef}
            value={label}
            disabled={submitting}
            onChange={(e) => setLabel(e.currentTarget.value)}
            placeholder={t("createWorkspace.namePlaceholder")}
          />
        </label>

        <label className="form-field">
          <span>{t("createWorkspace.cwdLabel")}</span>
          <input
            ref={cwdRef}
            value={cwd}
            onChange={(e) => {
              setCwd(e.currentTarget.value);
              setCreateError("");
            }}
            placeholder={t("createWorkspace.cwdPlaceholder")}
            spellCheck={false}
            autoComplete="off"
            disabled={submitting}
            aria-invalid={!!pathError}
            aria-describedby={pathHintId}
          />
        </label>
        <div id={pathHintId} className="workspace-path-hint" aria-live="polite">
          {checking ? (
            <p role="status">{t("createWorkspace.checking")}</p>
          ) : pathError ? (
            <p className="modal-error" role="alert">
              {pathError}
            </p>
          ) : checked?.info ? (
            <p>
              {t("createWorkspace.directoryLine")}{" "}
              <code>{checked.info.path}</code>
            </p>
          ) : (
            <p>{t("createWorkspace.cwdHelp")}</p>
          )}
        </div>
        {checked?.info?.directories.length ? (
          <div
            className="workspace-path-directories"
            role="list"
            aria-label={t("createWorkspace.suggestionsAria")}
          >
            {checked.info.directories.map((directory) => (
              <div key={directory} role="listitem">
                <button
                  type="button"
                  className="ghost"
                  disabled={submitting}
                  title={directory}
                  onClick={() => {
                    setCwd(
                      directory.endsWith("/") ? directory : `${directory}/`,
                    );
                    setCreateError("");
                    cwdRef.current?.focus();
                  }}
                >
                  <Folder size={14} aria-hidden="true" />
                  <span>
                    {directory
                      .split(directory.startsWith("/") ? "/" : /[/\\]/)
                      .filter(Boolean)
                      .pop()}
                    /
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {createError ? (
          <p className="modal-error" role="alert">
            {createError}
          </p>
        ) : null}
        {createReason ? <p role="status">{createReason}</p> : null}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            {t("createWorkspace.cancel")}
          </button>
          <button
            type="submit"
            disabled={
              namePending ||
              submitting ||
              !!createReason ||
              checking ||
              !!pathError
            }
            title={createReason ?? undefined}
          >
            {submitting
              ? t("createWorkspace.creating")
              : t("createWorkspace.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
