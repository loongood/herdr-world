import { useT } from "../i18n";
import {
  harnessLabel,
  readinessNote,
  type LauncherCatalog,
} from "./agentProfiles";

/** Evidence describes the last check, not profile configuration or enablement. */
export function HarnessReadinessSummary({
  catalog,
}: {
  catalog: LauncherCatalog;
}) {
  const t = useT();
  return (
    <div
      className="agent-launcher-note"
      aria-label={t("launcher.readinessAria")}
    >
      <p>{t("launcher.readinessNote")}</p>
      <ul>
        {catalog.readiness.map((ready) => (
          <li key={ready.kind}>
            {harnessLabel(ready.kind)}:{" "}
            {readinessNote(ready.kind, catalog)?.text ??
              t("launcher.installedSignedIn")}
            {". "}
            {t("launcher.probeLabel")}{" "}
            {ready.probe.observed_at === null ? (
              t("launcher.timeUnknown")
            ) : (
              <time dateTime={new Date(ready.probe.observed_at).toISOString()}>
                {t("launcher.observed")}{" "}
                {new Date(ready.probe.observed_at).toLocaleTimeString()}
              </time>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
