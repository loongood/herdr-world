import { useEffect, useId, useRef, useState } from "react";
import type { ConnectionClient } from "../api";
import { useT } from "../i18n";
import { formatUiDateTime } from "../uiLocale";
import "./CodexSessionLink.css";

type Preview = {
  token: string;
  session_id: string;
  cwd: string;
  path: string;
  updated_at: string;
};

export function CodexSessionLink({
  paneId,
  client,
  onLinked,
}: {
  paneId: string;
  client: ConnectionClient;
  onLinked: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const [sessionId, setSessionId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function submit() {
    if (busy || !sessionId.trim() || !client.isCurrent()) return;
    setBusy(true);
    setMessage("");
    try {
      // Sequential SSH checks can exceed 30s; await the backend result or disconnect.
      if (preview) {
        await client.call(
          "agent_session.link",
          {
            pane_id: paneId,
            token: preview.token,
          },
          null,
        );
        if (!mounted.current || !client.isCurrent()) return;
        setPreview(null);
        setMessage(t("components.codexSession.linked"));
        onLinked();
      } else {
        const result = await client.call(
          "agent_session.link_preview",
          {
            pane_id: paneId,
            session_id: sessionId.trim(),
          },
          null,
        );
        if (!mounted.current || !client.isCurrent()) return;
        setPreview(result as Preview);
      }
    } catch (error) {
      if (!mounted.current || !client.isCurrent()) return;
      setPreview(null);
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      if (mounted.current && client.isCurrent()) setBusy(false);
    }
  }

  return (
    <details className="codex-session-link">
      <summary>{t("components.codexSession.title")}</summary>
      <form
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p>{t("components.codexSession.intro")}</p>
        <label htmlFor={inputId}>
          {t("components.codexSession.sessionIdLabel")}
        </label>
        <input
          id={inputId}
          value={sessionId}
          onChange={(event) => {
            setSessionId(event.target.value);
            setPreview(null);
            setMessage("");
          }}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          autoComplete="off"
          spellCheck={false}
          readOnly={busy}
          required
        />
        {preview ? (
          <div className="codex-session-link-preview">
            <span>
              {t("components.codexSession.sessionField", {
                id: preview.session_id,
              })}
            </span>
            <span>
              {t("components.codexSession.directoryField", {
                path: preview.cwd || t("components.codexSession.unknown"),
              })}
            </span>
            <span>
              {t("components.codexSession.updatedField", {
                when: formatUiDateTime(preview.updated_at),
              })}
            </span>
            <span>
              {t("components.codexSession.transcriptField", {
                path: preview.path,
              })}
            </span>
            <p>{t("components.codexSession.confirmNote")}</p>
          </div>
        ) : null}
        <button
          type="submit"
          className="secondary-btn"
          aria-disabled={busy || !sessionId.trim()}
        >
          {busy
            ? preview
              ? t("components.codexSession.linking")
              : t("components.codexSession.checking")
            : preview
              ? t("components.codexSession.confirmTitle")
              : t("components.codexSession.checkSession")}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </details>
  );
}
