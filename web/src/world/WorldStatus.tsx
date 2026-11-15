import { ConnectionSwitcher } from "../components/ConnectionSwitcher";
import { t, useT } from "../i18n";
import { HerdrSetupCard } from "../components/HerdrSetupCard";
import type { WorldRuntimeState } from "./runtimeStore";
import type { WorldObject } from "./worldObject";

const serviceWord = (status: "connecting" | "connected" | "disconnected") =>
  status === "connecting"
    ? t("connections.lifecycleConnecting")
    : status === "connected"
      ? t("connections.lifecycleConnected")
      : t("connections.lifecycleDisconnected");

export function WorldTopbarStatus({
  runtime,
  world,
  selectedHostLabel,
}: {
  runtime: WorldRuntimeState;
  world: WorldObject;
  selectedHostLabel: string;
}) {
  const t = useT();
  const ready = world.hosts.filter(
    (host) =>
      host.hostState === "active" || host.hostState === "ready-inactive",
  ).length;
  const stale = world.hosts.filter((host) => host.stale).length;
  const unknown = world.hosts.filter(
    (host) => !host.connection.snapshot,
  ).length;
  const summary = [
    t("world.statusSummary", {
      host: selectedHostLabel,
      ready,
      spaces: world.coverage.spaces,
      agents: world.coverage.agents,
    }),
    stale ? t("world.statusStale", { count: stale }) : "",
    unknown ? t("world.statusUnknown", { count: unknown }) : "",
    runtime.error ? t("world.statusError") : "",
  ].join("");
  return (
    <div
      className="world-topbar-status"
      aria-label={t("world.statusAria", { summary })}
      aria-live="polite"
      title={summary}
    >
      <span className="world-live-dot" data-status={runtime.status} />
      {runtime.error ? (
        <span className="world-runtime-error" title={runtime.error}>
          {t("world.errorWord")}
        </span>
      ) : null}
    </div>
  );
}

/** The welcome card's words, apart from its store-bound connection switcher. */
export function WorldWelcomeText() {
  const t = useT();
  return (
    <>
      <img src="/herdr-world-logo.svg" alt="" width="68" height="68" />
      <p className="world-eyebrow">{t("world.welcome")}</p>
      <h2 id="world-connection-title">{t("world.addProfile")}</h2>
      <p>{t("world.welcomeBody")}</p>
    </>
  );
}

export function WorldConnectionRequired({
  status,
}: {
  status: "connecting" | "connected" | "disconnected";
}) {
  const t = useT();
  return (
    <section
      className="world-connection-required"
      aria-labelledby="world-connection-title"
    >
      <WorldWelcomeText />
      <ConnectionSwitcher />
      {status !== "connected" ? (
        <small>
          {t("world.serviceStatus", { status: serviceWord(status) })}
        </small>
      ) : null}
    </section>
  );
}

/** Town with no hosts: profiles live under Hosts → Manage connections. */
export function TownNoHosts() {
  const t = useT();
  return (
    <div className="world-empty" role="status">
      <img src="/herdr-world-logo.svg" alt="" width="68" height="68" />
      <h2>{t("world.noSpacesYet")}</h2>
      <p>
        {t("world.noSpacesBody")}{" "}
        <strong>{t("world.manageConnections")}</strong>.
      </p>
    </div>
  );
}

/**
 * Offer local Herdr setup on Town only when the default connection has failed
 * and nothing is ready. A failing local socket keeps its error through
 * error → reconnecting; a normal start or an explicit disconnect has none.
 */
export function localHerdrSetupOffer(world: WorldObject) {
  const local = world.hosts.find((host) => host.connection.isDefault);
  return (
    !!local &&
    local.connection.state !== "ready" &&
    !!local.connection.error &&
    !world.hosts.some((host) => host.connection.state === "ready")
  );
}

export function TownHerdrSetupOffer({
  world,
  aggregate = world,
}: {
  world: WorldObject;
  aggregate?: WorldObject;
}) {
  // Hosts changes presentation, never whether any runtime is already ready.
  if (!localHerdrSetupOffer(aggregate)) return null;
  const local = aggregate.hosts.find((host) => host.connection.isDefault)!;
  return (
    <div className="town-herdr-setup">
      <HerdrSetupCard key={local.connection.connectionId} />
    </div>
  );
}
