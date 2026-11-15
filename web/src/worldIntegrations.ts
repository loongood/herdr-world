import { t } from "./i18n";

/** World's own skill per harness on the service's host (`world.integration.list`). */
export type WorldIntegration = {
  harness: string;
  state: "current" | "outdated" | "not_installed" | "unsupported";
  version?: number;
  available_version: number;
  path?: string;
  reason?: string;
  /** Other harnesses that read, and lose on removal, the same file. */
  shared_with: string[];
};

const STATES = ["current", "outdated", "not_installed", "unsupported"];
const version = (value: unknown) =>
  Number.isSafeInteger(value) && (value as number) >= 0;

export function parseWorldIntegrations(result: unknown): WorldIntegration[] {
  const items = (result as { integrations?: unknown } | null)?.integrations;
  if (
    !Array.isArray(items) ||
    !items.every(
      (item) =>
        item &&
        typeof item.harness === "string" &&
        item.harness &&
        STATES.includes(item.state) &&
        (item.version === undefined || version(item.version)) &&
        version(item.available_version) &&
        (item.state === "unsupported"
          ? typeof item.reason === "string"
          : typeof item.path === "string" && item.path) &&
        Array.isArray(item.shared_with) &&
        item.shared_with.every((name: unknown) => typeof name === "string"),
    )
  )
    throw new Error(t("worldIntegrations.invalidList"));
  return items;
}

/** Herdr names a few harnesses with underscores (antigravity_cli); World with hyphens. */
export const worldHarnessFor = (herdrTarget: string) =>
  herdrTarget.replace(/_/g, "-");

export function worldStateLabel(item: WorldIntegration) {
  const installed =
    item.version === undefined
      ? ""
      : t("worldIntegrations.versionSuffix", { version: item.version });
  switch (item.state) {
    case "current":
      return `${t("worldIntegrations.stateCurrent")}${installed}`;
    case "outdated":
      return item.version === undefined
        ? t("worldIntegrations.stateOutdatedAvailable", {
            version: item.available_version,
          })
        : t("worldIntegrations.stateOutdated", {
            current: item.version,
            available: item.available_version,
          });
    case "not_installed":
      return t("worldIntegrations.stateNotInstalled");
    default:
      return t("worldIntegrations.stateUnsupported", {
        reason: item.reason ?? "",
      });
  }
}

/** The confirmation text, naming every harness that shares the file. */
export function worldChangePrompt(
  item: WorldIntegration,
  action: "install" | "uninstall",
  label: (harness: string) => string,
) {
  const name = label(item.harness);
  const others = item.shared_with.map(label);
  const separator = t("worldIntegrations.listSeparator");
  const conjunction = t("worldIntegrations.listAnd");
  const sharedNames = others.length
    ? `${name}${separator}${others.join(conjunction)}`
    : name;
  const shared = others.length
    ? ` ${t("worldIntegrations.sharedFile", { names: sharedNames })}`
    : "";
  if (action === "uninstall")
    return (
      t("worldIntegrations.uninstallTitle", { name }) +
      "\n\n" +
      t("worldIntegrations.deleteNote", { path: item.path ?? "" }) +
      (others.length
        ? `${shared}${t("worldIntegrations.sharedLoss", {
            others: others.join(conjunction),
          })}`
        : "") +
      t("worldIntegrations.herdrUnchanged")
    );
  return (
    t("worldIntegrations.installTitle", {
      verb:
        item.state === "outdated"
          ? t("agents.verbUpdate")
          : t("agents.verbInstall"),
      name,
    }) +
    "\n\n" +
    t("worldIntegrations.writeNote", { path: item.path ?? "" }) +
    (others.length ? `${shared}${t("worldIntegrations.sharedApply")}` : "") +
    t("worldIntegrations.newSessionNote")
  );
}
