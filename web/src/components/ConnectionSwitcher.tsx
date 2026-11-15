import { useT } from "../i18n";
import { useCloseGlobalMenuForDialog } from "./useCloseGlobalMenuForDialog";
import { ConnectionHerdrInfo } from "./ConnectionHerdrInfo";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Pause,
  Pencil,
  Plug,
  Plus,
  Server,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { bridge, type ConnectionSummary } from "../api";
import {
  connectionErrorDetail,
  connectionLifecycleLabel,
  connectionProfileCapabilities,
  connectionTypeLabel,
  localConnectionProfilePayload,
  reconnectConnectionProfile,
  selectConnectionProfile,
  sshConnectionProfilePayload,
  suggestConnectionId,
} from "../connectionProfiles";
import { shallowEqual, store, useStoreSelector } from "../store";
import { browserTransportPresentation } from "./browserTransport";
import { CloseButton } from "./CloseButton";
import {
  focusDialogElement,
  trapDialogTab,
  tabbableElements,
  isActuallyTabbable,
} from "./dialogFocus";
import { ConfirmDialog } from "./ModalDialogs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import "./ConnectionSwitcher.css";

type Draft = {
  id: string;
  label: string;
  controlSocketPath: string;
  clientSocketPath: string;
  autoConnect: boolean;
};

type SshDraft = {
  id: string;
  label: string;
  sshDestination: string;
  remoteControlSocketPath: string;
  remoteClientSocketPath: string;
  autoConnect: boolean;
  remotePlatform?: "windows";
  remoteHerdrPath: string;
  remoteSession: string;
};

type Feedback = { kind: "success" | "error"; message: string } | null;

function draftFor(connection?: ConnectionSummary): Draft {
  return {
    id: connection?.id ?? "",
    label: connection?.label ?? "",
    controlSocketPath: connection?.control_socket_path ?? "",
    clientSocketPath: connection?.client_socket_path ?? "",
    autoConnect: connection?.auto_connect ?? true,
  };
}

function sshDraftFor(connection?: ConnectionSummary): SshDraft {
  return {
    id: connection?.id ?? "",
    label: connection?.label ?? "",
    sshDestination: connection?.ssh_destination ?? "",
    remoteControlSocketPath: connection?.remote_control_socket_path ?? "",
    remoteClientSocketPath: connection?.remote_client_socket_path ?? "",
    remotePlatform: connection?.remote_platform,
    remoteHerdrPath: connection?.remote_herdr_path ?? "",
    remoteSession: connection?.remote_session ?? "",
    autoConnect: connection?.auto_connect ?? true,
  };
}

function runtimeStateClass(connection: Pick<ConnectionSummary, "state">) {
  return `connection-runtime-${connection.state}`;
}

function BrowserTransportStatus({ onAction }: { onAction?: () => void }) {
  const t = useT();
  const state = useStoreSelector(
    (snapshot) => ({
      bridgeStatus: snapshot.bridgeStatus,
      connectionPaused: snapshot.connectionPaused,
      status: snapshot.status,
      navigationMode: snapshot.navigationMode,
    }),
    shallowEqual,
  );
  const { label, clientCount, pauseOthersLabel, needsResume, toggleLabel } =
    browserTransportPresentation(
      state.connectionPaused,
      state.status,
      state.bridgeStatus?.clients,
    );
  const statusLabel = `${label}${
    typeof clientCount === "number"
      ? ` · ${clientCount === 1 ? t("connections.clientsOne") : t("connections.clientsMany", { count: clientCount })}`
      : ""
  }`;
  return (
    <div
      className="connection-browser-section"
      role={onAction ? "group" : undefined}
      aria-label={onAction ? statusLabel : undefined}
    >
      <div
        className="connection-browser-status"
        role={onAction ? undefined : "status"}
        aria-hidden={onAction ? true : undefined}
      >
        <span
          className={`connection-browser-dot browser-${
            state.connectionPaused ? "paused" : state.status
          }`}
        />
        <span>{statusLabel}</span>
        <span
          title={
            state.navigationMode === "browser-local"
              ? t("connections.navLocalDetail")
              : t("connections.navSharedDetail")
          }
        >
          {state.navigationMode === "browser-local"
            ? t("connections.navLocal")
            : t("connections.navShared")}
        </span>
      </div>
      {onAction ? (
        <div className="connection-browser-actions">
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={needsResume ? "is-warning" : ""}
            onClick={() => {
              onAction();
              if (needsResume) {
                store.resumeConnection();
              } else {
                store.pauseConnection();
              }
            }}
          >
            {needsResume ? <Plug size={14} /> : <Pause size={14} />}
            {toggleLabel}
          </button>
          {pauseOthersLabel ? (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                onAction();
                void store.pauseOtherClients();
              }}
            >
              <Users size={14} />
              {pauseOthersLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProfileForm({
  connection,
  pending,
  feedback,
  onCancel,
  onSave,
  onTest,
}: {
  connection?: ConnectionSummary;
  pending: string | null;
  feedback: Feedback;
  onCancel: () => void;
  onSave: (draft: Draft) => void;
  onTest: (draft: Draft) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(() => draftFor(connection));
  const [idWasEdited, setIdWasEdited] = useState(false);
  const isEditing = !!connection;
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      aria-busy={!!pending}
      aria-describedby={feedback ? "connection-profile-feedback" : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id="connection-profile-form-title">
            {isEditing ? t("connections.editLocal") : t("connections.addLocal")}
          </h2>
          <p>{t("connections.localSubtitle")}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label={t("connections.back")}
          disabled={!!pending}
        >
          <X size={16} />
        </button>
      </div>
      <label className="form-field">
        <span>{t("connections.labelName")}</span>
        <input
          autoFocus
          data-initial-focus
          value={draft.label}
          maxLength={80}
          onChange={(event) => {
            const label = event.target.value;
            setDraft((current) => ({
              ...current,
              label,
              id:
                !isEditing && !idWasEdited
                  ? suggestConnectionId(label)
                  : current.id,
            }));
          }}
          placeholder={t("connections.labelPlaceholderLocal")}
        />
      </label>
      <label className="form-field">
        <span>{t("connections.connectionId")}</span>
        <input
          value={draft.id}
          disabled={isEditing}
          maxLength={128}
          onChange={(event) => {
            setIdWasEdited(true);
            update("id", event.target.value);
          }}
          placeholder="local-dev"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <label className="form-field">
        <span>{t("connections.controlSocketPath")}</span>
        <input
          value={draft.controlSocketPath}
          onChange={(event) => update("controlSocketPath", event.target.value)}
          placeholder="/absolute/path/to/herdr.sock"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <label className="form-field">
        <span>{t("connections.renderSocketPath")}</span>
        <input
          value={draft.clientSocketPath}
          onChange={(event) => update("clientSocketPath", event.target.value)}
          placeholder="/absolute/path/to/herdr-client.sock"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <label className="connection-profile-checkbox">
        <input
          type="checkbox"
          checked={draft.autoConnect}
          onChange={(event) => update("autoConnect", event.target.checked)}
        />
        {t("connections.autoConnectLabel")}
      </label>
      <p className="connection-profile-security-note">
        {t("connections.localSecurityNote")}
      </p>
      {feedback ? (
        <div
          id="connection-profile-feedback"
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className={
            feedback.kind === "error" ? "modal-error" : "modal-message"
          }
        >
          {feedback.message}
        </div>
      ) : null}
      <div className="modal-actions">
        <button
          type="button"
          onClick={() => onTest(draft)}
          disabled={!!pending}
        >
          {pending === "test-form"
            ? t("connections.testing")
            : t("connections.testConnection")}
        </button>
        <button type="button" onClick={onCancel} disabled={!!pending}>
          Cancel
        </button>
        <button type="submit" disabled={!!pending}>
          {pending === "save"
            ? t("connections.saving")
            : isEditing
              ? t("connections.save")
              : t("connections.addConnection")}
        </button>
      </div>
    </form>
  );
}

function SshProfileForm({
  connection,
  pending,
  feedback,
  onCancel,
  onSave,
  onTest,
}: {
  connection?: ConnectionSummary;
  pending: string | null;
  feedback: Feedback;
  onCancel: () => void;
  onSave: (draft: SshDraft) => void;
  onTest: (draft: SshDraft) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(() => sshDraftFor(connection));
  const [idWasEdited, setIdWasEdited] = useState(false);
  const isEditing = !!connection;
  const update = <K extends keyof SshDraft>(key: K, value: SshDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      aria-busy={!!pending}
      aria-describedby={feedback ? "connection-profile-feedback" : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id="connection-profile-form-title">
            {isEditing ? t("connections.editSsh") : t("connections.addSsh")}
          </h2>
          <p>{t("connections.sshSubtitle")}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label={t("connections.back")}
          disabled={!!pending}
        >
          <X size={16} />
        </button>
      </div>
      <label className="form-field">
        <span>{t("connections.labelName")}</span>
        <input
          autoFocus
          data-initial-focus
          value={draft.label}
          maxLength={80}
          onChange={(event) => {
            const label = event.target.value;
            setDraft((current) => ({
              ...current,
              label,
              id:
                !isEditing && !idWasEdited
                  ? suggestConnectionId(label, "ssh")
                  : current.id,
            }));
          }}
          placeholder={t("connections.labelPlaceholderRemote")}
        />
      </label>
      <label className="form-field">
        <span>{t("connections.connectionId")}</span>
        <input
          value={draft.id}
          disabled={isEditing}
          maxLength={128}
          onChange={(event) => {
            setIdWasEdited(true);
            update("id", event.target.value);
          }}
          placeholder="remote-dev"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <label className="form-field">
        <span>{t("connections.sshDestination")}</span>
        <input
          value={draft.sshDestination}
          maxLength={320}
          onChange={(event) => update("sshDestination", event.target.value)}
          placeholder="user@dev-box or config-alias"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <label className="form-field">
        <span>{t("connections.remoteHostOs")}</span>
        <select
          value={draft.remotePlatform ?? "unix"}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              remotePlatform:
                event.target.value === "windows" ? "windows" : undefined,
              remoteControlSocketPath: "",
              remoteClientSocketPath: "",
              remoteHerdrPath: "",
              remoteSession: "",
            }))
          }
        >
          <option value="unix">{t("connections.osUnix")}</option>
          <option value="windows">Windows</option>
        </select>
      </label>
      {draft.remotePlatform === "windows" ? (
        <>
          <label className="form-field">
            <span>{t("connections.herdrPath")}</span>
            <input
              value={draft.remoteHerdrPath}
              maxLength={1024}
              onChange={(event) =>
                update("remoteHerdrPath", event.target.value)
              }
              placeholder={t("connections.herdrPathPlaceholder")}
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label className="form-field">
            <span>{t("connections.herdrSession")}</span>
            <input
              value={draft.remoteSession}
              onChange={(event) => update("remoteSession", event.target.value)}
              placeholder="default"
              maxLength={64}
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
        </>
      ) : (
        <>
          <label className="form-field">
            <span>{t("connections.remoteControlPath")}</span>
            <input
              value={draft.remoteControlSocketPath}
              onChange={(event) =>
                update("remoteControlSocketPath", event.target.value)
              }
              placeholder={t("connections.remoteControlPlaceholder")}
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label className="form-field">
            <span>{t("connections.remoteRenderPath")}</span>
            <input
              value={draft.remoteClientSocketPath}
              onChange={(event) =>
                update("remoteClientSocketPath", event.target.value)
              }
              placeholder={t("connections.remoteRenderPlaceholder")}
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
        </>
      )}
      <label className="connection-profile-checkbox">
        <input
          type="checkbox"
          checked={draft.autoConnect}
          onChange={(event) => update("autoConnect", event.target.checked)}
        />
        {t("connections.autoConnectLabel")}
      </label>
      <p className="connection-profile-security-note">
        {draft.remotePlatform === "windows"
          ? t("connections.windowsNote")
          : t("connections.unixNote")}
        {t("connections.sshAuthNote")}
      </p>
      {feedback ? (
        <div
          id="connection-profile-feedback"
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className={
            feedback.kind === "error" ? "modal-error" : "modal-message"
          }
        >
          {feedback.message}
        </div>
      ) : null}
      <div className="modal-actions">
        <button
          type="button"
          onClick={() => onTest(draft)}
          disabled={!!pending}
        >
          {pending === "test-form"
            ? t("connections.testing")
            : t("connections.testConnection")}
        </button>
        <button type="button" onClick={onCancel} disabled={!!pending}>
          Cancel
        </button>
        <button type="submit" disabled={!!pending}>
          {pending === "save"
            ? t("connections.saving")
            : isEditing
              ? t("connections.save")
              : t("connections.addConnection")}
        </button>
      </div>
    </form>
  );
}

export function ConnectionManagerDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const connections = useStoreSelector((snapshot) => snapshot.connections);
  const [editing, setEditing] = useState<
    ConnectionSummary | "new-local" | "new-ssh" | null
  >(null);
  const [removeTarget, setRemoveTarget] = useState<ConnectionSummary | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const requestToken = useRef(0);
  const mounted = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeEditing = useCallback(() => {
    requestToken.current += 1;
    setPending(null);
    setFeedback(null);
    setEditing(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const appRoot = document.getElementById("root");
    const rootWasInert = appRoot?.inert ?? false;
    const rootAriaHidden = appRoot?.getAttribute("aria-hidden") ?? null;
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }
    return () => {
      mounted.current = false;
      requestToken.current += 1;
      if (appRoot) {
        appRoot.inert = rootWasInert;
        if (rootAriaHidden === null) appRoot.removeAttribute("aria-hidden");
        else appRoot.setAttribute("aria-hidden", rootAriaHidden);
      }
      if (returnFocus?.isConnected) {
        window.requestAnimationFrame(() => returnFocus.focus());
      }
    };
  }, []);

  useEffect(() => {
    const initialFocus =
      dialogRef.current?.querySelector<HTMLElement>("[data-initial-focus]") ??
      dialogRef.current;
    return focusDialogElement(initialFocus);
  }, [editing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        trapDialogTab(event, dialogRef.current);
        return;
      }
      if (event.key !== "Escape") return;
      event.preventDefault();
      // The removal ConfirmDialog handles its own Escape via its capture
      // listener; do not close the whole manager behind it.
      if (pending || removeTarget) return;
      if (editing) closeEditing();
      else onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [closeEditing, editing, onClose, pending, removeTarget]);

  const performAction = async (
    key: string,
    operation: () => Promise<unknown>,
    success: string,
  ) => {
    const token = ++requestToken.current;
    const isCurrent = () => mounted.current && requestToken.current === token;
    setPending(key);
    setFeedback(null);
    try {
      const result = await operation();
      await store.refreshConnections().catch(() => undefined);
      if (!isCurrent()) return undefined;
      const tested = result as { version?: unknown; protocol?: unknown };
      const suffix =
        typeof tested.protocol === "number"
          ? ` Herdr ${typeof tested.version === "string" ? tested.version : ""} (protocol ${tested.protocol})`.trimEnd()
          : "";
      setFeedback({ kind: "success", message: `${success}${suffix}` });
      return result;
    } catch (error) {
      await store.refreshConnections().catch(() => undefined);
      if (isCurrent()) {
        setFeedback({ kind: "error", message: connectionErrorDetail(error) });
      }
      return undefined;
    } finally {
      if (isCurrent()) setPending(null);
    }
  };

  const formConnection =
    editing && typeof editing === "object" ? editing : undefined;
  const editingSsh = editing === "new-ssh" || formConnection?.type === "ssh";
  const testProfile = (profile: unknown) => {
    void performAction(
      "test-form",
      () => bridge.call("connections.test", { profile }),
      t("connections.testSucceeded"),
    );
  };
  const saveProfile = (profile: unknown) => {
    void performAction(
      "save",
      () =>
        formConnection
          ? bridge.call("connections.update", {
              id: formConnection.id,
              profile,
            })
          : bridge.call("connections.create", { profile }),
      formConnection
        ? t("connections.connectionUpdated")
        : t("connections.connectionAdded"),
    ).then((result) => {
      if (result && mounted.current) setEditing(null);
    });
  };
  if (editing) {
    return (
      <div
        className="modal-backdrop"
        onMouseDown={pending ? undefined : onClose}
      >
        <div
          ref={dialogRef}
          className="modal connection-manager-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="connection-profile-form-title"
          aria-busy={!!pending}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {editingSsh ? (
            <SshProfileForm
              key={formConnection?.id ?? "new-ssh"}
              connection={formConnection}
              pending={pending}
              feedback={feedback}
              onCancel={closeEditing}
              onTest={(draft) => {
                try {
                  testProfile(sshConnectionProfilePayload(draft));
                } catch (error) {
                  setFeedback({
                    kind: "error",
                    message: connectionErrorDetail(error),
                  });
                }
              }}
              onSave={(draft) => {
                try {
                  saveProfile(sshConnectionProfilePayload(draft));
                } catch (error) {
                  setFeedback({
                    kind: "error",
                    message: connectionErrorDetail(error),
                  });
                }
              }}
            />
          ) : (
            <ProfileForm
              key={formConnection?.id ?? "new-local"}
              connection={formConnection}
              pending={pending}
              feedback={feedback}
              onCancel={closeEditing}
              onTest={(draft) => {
                try {
                  testProfile(localConnectionProfilePayload(draft));
                } catch (error) {
                  setFeedback({
                    kind: "error",
                    message: connectionErrorDetail(error),
                  });
                }
              }}
              onSave={(draft) => {
                try {
                  saveProfile(localConnectionProfilePayload(draft));
                } catch (error) {
                  setFeedback({
                    kind: "error",
                    message: connectionErrorDetail(error),
                  });
                }
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={pending ? undefined : onClose}>
      <div
        ref={dialogRef}
        className="modal connection-manager-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connection-manager-title"
        aria-busy={!!pending}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id="connection-manager-title">
              {t("connections.managerTitle")}
            </h2>
            <p>{t("connections.managerSubtitle")}</p>
          </div>
          <CloseButton onClick={onClose} disabled={!!pending} />
        </div>
        <BrowserTransportStatus />
        <div className="connection-manager-toolbar">
          <button
            type="button"
            onClick={() => setEditing("new-local")}
            disabled={!!pending}
          >
            <Plus size={14} /> {t("connections.addLocalButton")}
          </button>
          <button
            type="button"
            onClick={() => setEditing("new-ssh")}
            disabled={!!pending}
          >
            <Plus size={14} /> {t("connections.addSshButton")}
          </button>
        </div>
        {feedback ? (
          <div
            role={feedback.kind === "error" ? "alert" : "status"}
            aria-live="polite"
            className={
              feedback.kind === "error" ? "modal-error" : "modal-message"
            }
          >
            {feedback.message}
          </div>
        ) : null}
        <div className="connection-manager-list">
          {connections.map((connection) => {
            const capabilities = connectionProfileCapabilities(connection);
            const status = connectionLifecycleLabel(connection.state);
            return (
              <section className="connection-manager-card" key={connection.id}>
                <div className="connection-manager-card-head">
                  <span
                    className={`connection-runtime-dot ${runtimeStateClass(connection)}`}
                  />
                  <div>
                    <strong>{connection.label}</strong>
                    <span>{connectionTypeLabel(connection)}</span>
                  </div>
                  <div className="connection-profile-badges">
                    {connection.is_default ? (
                      <span>
                        <Star size={11} /> {t("connections.badgeDefault")}
                      </span>
                    ) : null}
                    {connection.read_only ? (
                      <span>{t("connections.badgeReadOnly")}</span>
                    ) : null}
                    <span>{status}</span>
                  </div>
                </div>
                <div className="connection-profile-paths">
                  {connection.type === "ssh" ? (
                    <>
                      <code title={connection.ssh_destination}>
                        {t("connections.destLabel", {
                          value: connection.ssh_destination ?? "",
                        })}
                      </code>
                      {connection.remote_platform === "windows" ? (
                        <>
                          <code>
                            {t("connections.herdrLabel", {
                              value:
                                connection.remote_herdr_path ||
                                t("connections.autoHerdrExe"),
                            })}
                          </code>
                          <code>
                            {t("connections.sessionLabel", {
                              value:
                                connection.remote_session ||
                                t("connections.sessionDefault"),
                            })}
                          </code>
                        </>
                      ) : (
                        <>
                          <code
                            title={
                              connection.remote_control_socket_path ||
                              t("connections.inferredTitle")
                            }
                          >
                            {t("connections.remoteControlLabel", {
                              value:
                                connection.remote_control_socket_path ||
                                t("connections.autoRemoteControl"),
                            })}
                          </code>
                          <code
                            title={
                              connection.remote_client_socket_path ||
                              t("connections.inferredTitle")
                            }
                          >
                            {t("connections.remoteRenderLabel", {
                              value:
                                connection.remote_client_socket_path ||
                                t("connections.autoRemoteRender"),
                            })}
                          </code>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <code title={connection.control_socket_path}>
                        {t("connections.controlLabel", {
                          value:
                            connection.control_socket_path ??
                            t("connections.legacyConfig"),
                        })}
                      </code>
                      <code title={connection.client_socket_path}>
                        {t("connections.renderLabel", {
                          value:
                            connection.client_socket_path ??
                            t("connections.legacyConfig"),
                        })}
                      </code>
                    </>
                  )}
                </div>
                <div className="connection-profile-policy">
                  {connection.auto_connect === undefined
                    ? t("connections.policyLegacy")
                    : connection.auto_connect
                      ? t("connections.policyAuto")
                      : t("connections.policyManual")}
                </div>
                {connection.error?.message ? (
                  <div className="connection-profile-error">
                    <CircleAlert size={13} /> {connection.error.message}
                  </div>
                ) : null}
                <ConnectionHerdrInfo
                  key={`${connection.id}:${connection.generation}`}
                  connection={connection}
                />
                <div className="connection-profile-actions">
                  <button
                    type="button"
                    disabled={!!pending}
                    onClick={() =>
                      void performAction(
                        `test-${connection.id}`,
                        () =>
                          bridge.call("connections.test", {
                            id: connection.id,
                          }),
                        t("connections.testSucceeded"),
                      )
                    }
                  >
                    {pending === `test-${connection.id}`
                      ? t("connections.testing")
                      : t("connections.test")}
                  </button>
                  {capabilities.canEdit ? (
                    <button
                      type="button"
                      disabled={!!pending}
                      onClick={() => setEditing(connection)}
                    >
                      <Pencil size={13} /> {t("connections.edit")}
                    </button>
                  ) : null}
                  {capabilities.canSetDefault ? (
                    <button
                      type="button"
                      disabled={!!pending}
                      onClick={() =>
                        void performAction(
                          `default-${connection.id}`,
                          () =>
                            bridge.call("connections.set_default", {
                              id: connection.id,
                            }),
                          t("connections.defaultChanged"),
                        )
                      }
                    >
                      {t("connections.setDefault")}
                    </button>
                  ) : null}
                  {capabilities.canConnect ? (
                    <button
                      type="button"
                      disabled={!!pending}
                      onClick={() =>
                        void performAction(
                          `connect-${connection.id}`,
                          () =>
                            bridge.call("connections.connect", {
                              id: connection.id,
                            }),
                          t("connections.connectStarted"),
                        )
                      }
                    >
                      {t("connections.connect")}
                    </button>
                  ) : null}
                  {capabilities.canReconnect ? (
                    <button
                      type="button"
                      disabled={!!pending}
                      onClick={() =>
                        void performAction(
                          `reconnect-${connection.id}`,
                          () =>
                            reconnectConnectionProfile({
                              connectionId: connection.id,
                              call: (method, params) =>
                                bridge.call(method, params),
                            }),
                          t("connections.connectRestarted"),
                        )
                      }
                    >
                      {t("connections.reconnect")}
                    </button>
                  ) : null}
                  {capabilities.canDisconnect ? (
                    <button
                      type="button"
                      disabled={!!pending}
                      onClick={() =>
                        void performAction(
                          `disconnect-${connection.id}`,
                          () =>
                            bridge.call("connections.disconnect", {
                              id: connection.id,
                            }),
                          t("connections.disconnectNotice"),
                        )
                      }
                    >
                      {t("connections.disconnect")}
                    </button>
                  ) : null}
                  {!connection.read_only ? (
                    <button
                      type="button"
                      className="danger"
                      disabled={!!pending || !capabilities.canRemove}
                      aria-describedby={
                        connection.is_default
                          ? `connection-remove-help-${connection.id}`
                          : undefined
                      }
                      onClick={() => setRemoveTarget(connection)}
                    >
                      {t("connections.remove")}
                    </button>
                  ) : null}
                </div>
                {connection.is_default && !connection.read_only ? (
                  <p
                    id={`connection-remove-help-${connection.id}`}
                    className="connection-profile-policy"
                  >
                    {t("connections.removeDefaultHelp")}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
        <ConfirmDialog
          open={!!removeTarget}
          title={t("connections.removeConnectionTitle")}
          message={
            removeTarget
              ? t("connections.removeConnectionNamed", {
                  name: removeTarget.label,
                })
              : t("connections.removeConnectionThis")
          }
          confirmLabel={t("connections.remove")}
          danger
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => {
            const target = removeTarget;
            setRemoveTarget(null);
            if (!target) return;
            void performAction(
              `remove-${target.id}`,
              () => bridge.call("connections.remove", { id: target.id }),
              t("connections.connectionRemoved"),
            );
          }}
        />
      </div>
    </div>
  );
}

export function ConnectionSwitcher() {
  const t = useT();
  const state = useStoreSelector(
    (snapshot) => ({
      activeConnectionId: snapshot.activeConnectionId,
      connectionPaused: snapshot.connectionPaused,
      connections: snapshot.connections,
      defaultConnectionId: snapshot.defaultConnectionId,
      status: snapshot.status,
    }),
    shallowEqual,
  );
  const [open, setOpen] = useState(false);
  useCloseGlobalMenuForDialog(open, setOpen);
  const [manageOpen, setManageOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialMenuFocus = useRef<"active" | "first" | "last">("active");
  const openingManager = useRef(false);
  const menuExitFocus = useRef<HTMLElement | null>(null);
  const selectionRequestRef = useRef(0);
  const closeManager = useCallback(() => {
    setManageOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const active =
    state.connections.find(
      (connection) => connection.id === state.activeConnectionId,
    ) ??
    ({
      id: state.activeConnectionId,
      label:
        state.activeConnectionId === "startup-default"
          ? t("connections.badgeDefault")
          : state.activeConnectionId,
      source: "startup-config",
      is_default: state.defaultConnectionId === state.activeConnectionId,
      state: "disconnected",
      generation: 0,
    } satisfies ConnectionSummary);

  const browserWarning = state.connectionPaused
    ? t("connections.browserSyncPaused")
    : state.status === "disconnected"
      ? t("connections.browserDisconnected")
      : null;

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitemradio"]:not(:disabled), [role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
  const focusInitialMenuItem = () => {
    const items = menuItems();
    if (items.length === 0) return;
    const target =
      initialMenuFocus.current === "last"
        ? items[items.length - 1]
        : initialMenuFocus.current === "first"
          ? items[0]
          : (items.find(
              (item) => item.getAttribute("aria-checked") === "true",
            ) ?? items[0]);
    target.focus();
  };
  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const candidates = tabbableElements(document).filter(
        (element) => !menuRef.current?.contains(element),
      );
      const triggerIndex = triggerRef.current
        ? candidates.indexOf(triggerRef.current)
        : -1;
      const targetIndex = event.shiftKey ? triggerIndex - 1 : triggerIndex + 1;
      menuExitFocus.current =
        triggerIndex >= 0 && targetIndex >= 0 && targetIndex < candidates.length
          ? candidates[targetIndex]
          : triggerRef.current;
      setOpen(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = menuItems();
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowUp"
            ? (current <= 0 ? items.length : current) - 1
            : (current + 1) % items.length;
    items[next].focus();
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) initialMenuFocus.current = "active";
          setOpen(nextOpen);
        }}
      >
        <div className="connection-switcher">
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className={`connection-switcher-trigger ${open ? "is-active" : ""} ${browserWarning ? "has-browser-warning" : ""}`}
              aria-label={`${active.label}, ${connectionTypeLabel(active)}, ${connectionLifecycleLabel(active.state)}${browserWarning ? `, ${browserWarning}` : ""}`}
              title={browserWarning ?? undefined}
              aria-haspopup="menu"
              aria-expanded={open}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                  return;
                }
                event.preventDefault();
                initialMenuFocus.current =
                  event.key === "ArrowUp" ? "last" : "first";
                setOpen(true);
              }}
            >
              <span
                className={`connection-runtime-dot ${runtimeStateClass(active)}`}
              />
              <span className="connection-switcher-label">{active.label}</span>
              {browserWarning ? (
                <CircleAlert
                  className="connection-switcher-warning"
                  size={13}
                  aria-hidden="true"
                />
              ) : null}
              <span className="connection-switcher-meta">
                {connectionTypeLabel(active)} /{" "}
                {connectionLifecycleLabel(active.state)}
              </span>
              <ChevronDown size={13} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            ref={menuRef}
            className="connection-switcher-popover"
            role="menu"
            aria-label={t("connections.ariaConnections")}
            align="start"
            collisionPadding={8}
            onKeyDown={onMenuKeyDown}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              window.requestAnimationFrame(focusInitialMenuItem);
            }}
            onCloseAutoFocus={(event) => {
              // A dialog owns focus, including dialogs inside the mobile app.
              if (document.querySelector(".modal-backdrop:not([hidden])")) {
                openingManager.current = false;
                menuExitFocus.current = null;
                event.preventDefault();
                return;
              }
              if (openingManager.current) {
                openingManager.current = false;
                event.preventDefault();
                return;
              }
              const target = menuExitFocus.current;
              if (!target) return;
              menuExitFocus.current = null;
              event.preventDefault();
              window.requestAnimationFrame(() => {
                const fallback = triggerRef.current;
                const destination =
                  target.isConnected && isActuallyTabbable(target)
                    ? target
                    : fallback;
                destination?.focus();
                if (
                  document.activeElement !== destination &&
                  fallback?.isConnected
                ) {
                  fallback.focus();
                }
              });
            }}
          >
            <BrowserTransportStatus onAction={() => setOpen(false)} />
            <div className="connection-switcher-list">
              {state.connections.map((connection) => (
                <button
                  type="button"
                  role="menuitemradio"
                  tabIndex={-1}
                  aria-checked={connection.id === state.activeConnectionId}
                  className="connection-switcher-option"
                  key={connection.id}
                  onClick={() => {
                    setOpen(false);
                    const selectionRequest = ++selectionRequestRef.current;
                    void selectConnectionProfile({
                      connection,
                      select: (id) => store.selectConnection(id),
                      call: (method, params) => bridge.call(method, params),
                      refresh: () => store.refreshConnections(),
                    })
                      .then(() => {
                        if (
                          selectionRequestRef.current !== selectionRequest ||
                          store.get().activeConnectionId !== connection.id
                        ) {
                          return;
                        }
                        store.notify({
                          kind: "success",
                          message: t("connections.selectedNotice", {
                            name: connection.label,
                          }),
                        });
                      })
                      .catch((error) => {
                        if (
                          selectionRequestRef.current !== selectionRequest ||
                          store.get().activeConnectionId !== connection.id
                        ) {
                          return;
                        }
                        store.notify({
                          kind: "error",
                          message: t("connections.failedToConnect", {
                            name: connection.label,
                          }),
                          detail: connectionErrorDetail(error),
                        });
                      });
                  }}
                >
                  <span
                    className={`connection-runtime-dot ${runtimeStateClass(connection)}`}
                  />
                  <span>
                    <strong>{connection.label}</strong>
                    <small>
                      {connectionTypeLabel(connection)} /{" "}
                      {connectionLifecycleLabel(connection.state)}
                      {connection.read_only
                        ? " / " + t("connections.badgeReadOnly")
                        : ""}
                    </small>
                  </span>
                  {connection.is_default ? (
                    <Star
                      size={12}
                      aria-label={t("connections.badgeDefault")}
                    />
                  ) : null}
                  {connection.id === state.activeConnectionId ? (
                    <Check size={14} aria-label={t("connections.activeAria")} />
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="connection-switcher-manage"
              onClick={() => {
                openingManager.current = true;
                setOpen(false);
                setManageOpen(true);
              }}
            >
              <Server size={14} /> {t("connections.manageConnections")}
            </button>
          </PopoverContent>
        </div>
      </Popover>
      {manageOpen && typeof document !== "undefined"
        ? createPortal(
            <ConnectionManagerDialog onClose={closeManager} />,
            document.body,
          )
        : null}
    </>
  );
}
