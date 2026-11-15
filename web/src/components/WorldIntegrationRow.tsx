import { useCallback, useEffect, useRef, useState } from "react";
import { bridge } from "../api";
import { useT } from "../i18n";
import {
  parseWorldIntegrations,
  worldChangePrompt,
  worldStateLabel,
  type WorldIntegration,
} from "../worldIntegrations";

/**
 * World's skill rows (world.integration.*): the same installer as
 * `herdr-world integration`, on the World service's own host.
 */
export function useWorldIntegrations(
  enabled: boolean,
  label: (harness: string) => string,
  /** Reload whenever this changes, such as World's connection after a restart. */
  epoch?: unknown,
) {
  const t = useT();
  const [items, setItems] = useState<WorldIntegration[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    void epoch;
    if (!enabled) return;
    const request = ++sequence.current;
    try {
      const next = parseWorldIntegrations(
        await bridge.call("world.integration.list"),
      );
      if (mounted.current && request === sequence.current) {
        setItems(next);
        setLoadError(null);
      }
    } catch (e) {
      if (mounted.current && request === sequence.current) {
        setItems(null);
        setLoadError(
          t("components.integrationRow.loadFailed", {
            error: (e as Error).message,
          }),
        );
      }
    }
  }, [enabled, epoch, t]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const change = async (
    item: WorldIntegration,
    action: "install" | "uninstall",
  ) => {
    if (busy || !window.confirm(worldChangePrompt(item, action, label))) return;
    const verb =
      action === "uninstall"
        ? t("agents.verbUninstall")
        : item.state === "outdated"
          ? t("agents.verbUpdate")
          : t("agents.verbInstall");
    setBusy(item.harness);
    setChangeError(null);
    setMessage(null);
    try {
      await bridge.call(`world.integration.${action}`, {
        harness: item.harness,
      });
      if (mounted.current)
        setMessage(
          t("components.integrationRow.changeCompleted", {
            verb,
            name: label(item.harness),
          }),
        );
    } catch (e) {
      if (mounted.current)
        setChangeError(
          t("components.integrationRow.changeFailed", {
            verb,
            name: label(item.harness),
            error: (e as Error).message,
          }),
        );
    } finally {
      await load();
      if (mounted.current) setBusy(null);
    }
  };

  return {
    items,
    busy,
    error: changeError ?? loadError,
    message,
    load,
    change,
  };
}

export function WorldIntegrationRow({
  item,
  label,
  disabled,
  onChange,
}: {
  item: WorldIntegration;
  label: (harness: string) => string;
  disabled: boolean;
  onChange: (item: WorldIntegration, action: "install" | "uninstall") => void;
}) {
  const t = useT();
  const name = label(item.harness);
  const installable =
    item.state === "not_installed" || item.state === "outdated";
  const removable = item.state === "current" || item.state === "outdated";
  return (
    <div className="agent-integrations-world" data-state={item.state}>
      <div className="agent-integrations-world-copy">
        <span className="agent-integrations-world-name">
          {t("components.integrationRow.skillName")}
        </span>
        <span className="agent-integrations-badge" data-state={item.state}>
          {worldStateLabel(item)}
        </span>
        {item.path ? (
          <code className="agent-integrations-world-path">{item.path}</code>
        ) : null}
        {item.shared_with.length > 0 ? (
          <span className="agent-integrations-world-shared">
            {t("components.integrationRow.sharedWith", {
              names: item.shared_with
                .map(label)
                .join(t("worldIntegrations.listAnd")),
            })}
          </span>
        ) : null}
      </div>
      {installable || removable ? (
        <div className="agent-integrations-actions">
          {installable ? (
            <button
              type="button"
              className={
                item.state === "outdated" ? "agent-integrations-update" : ""
              }
              aria-label={t("components.integrationRow.installAria", {
                verb:
                  item.state === "outdated"
                    ? t("agents.verbUpdate")
                    : t("agents.verbInstall"),
                name,
              })}
              aria-disabled={disabled}
              onClick={() => {
                if (!disabled) onChange(item, "install");
              }}
            >
              {item.state === "outdated"
                ? t("agents.verbUpdate")
                : t("agents.verbInstall")}
            </button>
          ) : null}
          {removable ? (
            <button
              type="button"
              aria-label={t("components.integrationRow.uninstallAria", {
                name,
              })}
              aria-disabled={disabled}
              onClick={() => {
                if (!disabled) onChange(item, "uninstall");
              }}
            >
              {t("agents.verbUninstall")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
