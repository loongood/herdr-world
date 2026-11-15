import { useEffect, useMemo, useState } from "react";
import {
  freshHerdrIdentity,
  herdrCompatibility,
  type HerdrServerIdentity,
} from "../../../shared/herdrIdentity";
import { bridge, type ConnectionSummary } from "../api";
import { useT } from "../i18n";
import { connectionHttpResource } from "../connectionHttp";
import { useStoreSelector } from "../store";

/** Read-only version evidence for this exact card, independent of selected host. */
export function ConnectionHerdrInfo({
  connection,
}: {
  connection: ConnectionSummary;
}) {
  const t = useT();
  const transport = useStoreSelector((state) => state.status);
  const transportGeneration = useStoreSelector(
    (state) => state.connectionGeneration,
  );
  const client = useMemo(() => {
    // A reconnect retires the browser lease even if the host ID is unchanged.
    void transport;
    void transportGeneration;
    return bridge.connection(connection.id, connection.generation);
  }, [connection.id, connection.generation, transport, transportGeneration]);
  const owner = JSON.stringify([
    client.connectionId,
    client.generation,
    client.serverRuntimeGeneration,
  ]);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    owner: string;
    observation: HerdrServerIdentity | null;
    loading: boolean;
  } | null>(null);
  const [expired, setExpired] = useState(true);
  const ready = connection.state === "ready" && client.isCurrent();

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    if (!ready) return;
    setResult({ owner, observation: null, loading: true });
    const timeout = window.setTimeout(() => {
      if (!active) return;
      active = false;
      abort.abort();
      setResult({ owner, observation: null, loading: false });
    }, 8000);
    void connectionHttpResource(
      client,
      "/herdr-info",
      async (response) => {
        const observation = freshHerdrIdentity(
          await response.json(),
          Date.now(),
        );
        if (!observation)
          throw new Error(t("components.connectionHerdr.identityUnavailable"));
        return observation;
      },
      { signal: abort.signal },
    ).then(
      (observation) => {
        window.clearTimeout(timeout);
        if (active) setResult({ owner, observation, loading: false });
      },
      () => {
        window.clearTimeout(timeout);
        if (active) setResult({ owner, observation: null, loading: false });
      },
    );
    return () => {
      active = false;
      abort.abort();
      window.clearTimeout(timeout);
    };
  }, [client, owner, ready, retry, t]);

  const observation = result?.owner === owner ? result.observation : null;
  useEffect(() => {
    setExpired(!observation);
    if (!observation) return;
    // Retire even while idle. A clock adjustment cannot keep the old label live.
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(0, observation.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [observation]);
  const fresh =
    ready && !expired ? freshHerdrIdentity(observation, Date.now()) : null;
  const compatibility = fresh ? herdrCompatibility(fresh.protocol) : null;
  const loading = ready && result?.owner === owner && result.loading;
  return (
    <div
      className="connection-profile-version"
      aria-label={t("components.connectionHerdr.versionAria", {
        label: connection.label,
      })}
    >
      <p role="status">
        {fresh ? (
          <>
            {t("components.connectionHerdr.running", {
              version: fresh.version,
              protocol: fresh.protocol,
            })}{" "}
            {compatibility === "supported"
              ? t("components.connectionHerdr.supported")
              : compatibility === "too-old"
                ? t("components.connectionHerdr.tooOld")
                : compatibility === "too-new"
                  ? t("components.connectionHerdr.tooNew")
                  : t("components.connectionHerdr.incompatible")}
          </>
        ) : observation ? (
          t("components.connectionHerdr.lastObserved", {
            version: observation.version,
            protocol: observation.protocol,
          })
        ) : loading ? (
          t("components.connectionHerdr.checkingHost")
        ) : (
          t("components.connectionHerdr.versionUnknown")
        )}
      </p>
      {observation ? (
        <p>
          {t("components.connectionHerdr.checkedLabel")}{" "}
          <time dateTime={new Date(observation.readAt).toISOString()}>
            {new Date(observation.readAt).toLocaleTimeString()}
          </time>
          {t("components.connectionHerdr.expiresAfter")}
        </p>
      ) : null}
      {!ready ? <p>{t("components.connectionHerdr.reconnectHint")}</p> : null}
      <button
        type="button"
        disabled={!ready || loading}
        onClick={() => setRetry((value) => value + 1)}
      >
        {loading
          ? t("components.connectionHerdr.checkingVersion")
          : t("components.connectionHerdr.checkVersionAgain")}
      </button>
      <p>{t("components.connectionHerdr.installedBinaryUnknown")}</p>
      <p>{t("components.connectionHerdr.upgradeUnavailable")}</p>
    </div>
  );
}
