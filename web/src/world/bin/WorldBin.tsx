import { Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { BinView } from "../../../../shared/bin";
import { tabCardKey } from "../../../../shared/terminalColor";
import { t, useT } from "../../i18n";
import { useLayer } from "../../layerStack";
import { store } from "../../store";
import { tabPinsFor } from "../../tabPins";
import { sharedBoardStore } from "../board/boardDocument";
import type { WorldLeafObject, WorldObject } from "../worldObject";
import { setBinDock } from "./binDock";
import { binAddRequest, binBusLabel, binCloseLabel } from "./binStore";
import { useWorldBin, worldBinStore } from "./useWorldBin";
import { WORLD_BIN_OPEN_EVENT } from "./worldBinEvents";
import "./bin.css";

/**
 * Put an agent in the bin: it is held, and Town's next bus takes it. A
 * pinned desk (`pinnedDesk`) or a tab pinned in Spaces never loses its last
 * pane. True once held.
 */
export async function putInBin(
  leaf: WorldLeafObject,
  view: BinView,
  pinnedDesk: boolean,
) {
  const error = await worldBinStore().add(
    binAddRequest(leaf, view, pinnedDesk, tabPinsFor(leaf.connectionId)),
  );
  if (error)
    store.notify({
      kind: "error",
      message: t("bin.addFailed", { label: leaf.label }),
      detail: error,
    });
  return !error;
}

/**
 * Put an agent in the bin from a view's drag: its tab is kept when its desk
 * is pinned in Town (by the tab's card key) or its tab in Spaces.
 */
export function putAgentInBin(
  leaf: WorldLeafObject,
  view: BinView,
  world: Pick<WorldObject, "spaces">,
) {
  const workspaceIds = new Set(
    world.spaces
      .filter((space) => space.connectionId === leaf.connectionId)
      .map((space) => space.nativeId),
  );
  const pins = sharedBoardStore().get().document?.layout.desk_pins ?? {};
  const key = tabCardKey(leaf.connectionId, leaf.tabId, workspaceIds);
  return putInBin(leaf, view, Boolean(pins[key]));
}

const outcomeWord = (result: string) =>
  t(
    result === "closed"
      ? "bin.outcomeClosed"
      : result === "uncertain"
        ? "bin.outcomeUncertain"
        : "bin.outcomeNotClosed",
  );

/** A clock that ticks each second while `running`. */
function useSecondClock(running: boolean) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    setNow(performance.now());
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

/**
 * The bin in every view: a chip while it holds agents (always in Town and on
 * Board, where agents are dragged onto it), and its tray (from the chip, or
 * Town's stops and bus) listing who waits with the time to the next bus,
 * with Put back and Close now. A stopped bus is let go from the tray, or
 * goes on as the tray closes. Only Town (`bus`) has a bus to speak of;
 * elsewhere the bin says when it closes what it holds. `dock` (Board's hub)
 * stands beside the chip.
 */
export function WorldBin({
  always = false,
  bus: town = false,
  dock,
}: {
  always?: boolean;
  bus?: boolean;
  dock?: ReactNode;
}) {
  const t = useT();
  const bin = useWorldBin();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const held = bin.entries.length + bin.closing.length;
  const now = useSecondClock(open || held > 0);
  const tray = useRef<HTMLElement>(null);
  const chip = useRef<HTMLButtonElement>(null);
  useLayer(open, () => setOpen(false), {
    element: () => tray.current,
    anchors: () => [chip.current],
  });
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(WORLD_BIN_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WORLD_BIN_OPEN_EVENT, onOpen);
  }, []);
  // A bus stopped from Town opens the tray; closing the tray lets it go on.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (!open) setError(null);
    if (wasOpen.current && !open && worldBinStore().get().bus.stopped)
      void worldBinStore().goBus();
    wasOpen.current = open;
  }, [open]);
  const act = (run: () => Promise<string | null>) =>
    void run().then((failed) => setError(failed));
  const bus = town ? binBusLabel(bin, now) : binCloseLabel(bin, now);
  if (!held && !open && !always) return null;
  const chipButton =
    held || always ? (
      <button
        ref={chip}
        type="button"
        className="world-bin-chip"
        // Drag an agent here to put it in the bin (Town and Board).
        data-bin-drop=""
        data-empty={held ? undefined : ""}
        aria-expanded={open}
        aria-label={
          !held
            ? t("bin.chipEmpty")
            : town
              ? held === 1
                ? t("bin.chipAgentsOne", { count: held, bus })
                : t("bin.chipAgentsMany", { count: held, bus })
              : held === 1
                ? t("bin.chipCleaningOne", { count: held, bus })
                : t("bin.chipCleaningMany", { count: held, bus })
        }
        title={t("bin.chipTitle")}
        onClick={() => setOpen((value) => !value)}
      >
        <Trash2 size={15} aria-hidden="true" />
        {!held ? null : town ? (
          <>
            <b>{held}</b>
            <span>{bus}</span>
          </>
        ) : (
          <>
            {t("bin.cleaningUp")} <b>{held}</b>
          </>
        )}
      </button>
    ) : null;
  return (
    <>
      {dock && chipButton ? (
        <div ref={setBinDock} className="world-bin-dock">
          {dock}
          {chipButton}
        </div>
      ) : (
        chipButton
      )}
      {open ? (
        <section
          ref={tray}
          className="world-bin-tray"
          role="dialog"
          aria-label={t("bin.trayAria")}
        >
          <header>
            <strong>{t("bin.trayTitle")}</strong>
            <span>{bus}</span>
            {bin.bus.stopped ? (
              <button
                type="button"
                className="world-bin-go"
                onClick={() => act(() => worldBinStore().goBus())}
              >
                {town ? t("bin.letBusGo") : t("bin.goOn")}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={t("bin.closeAria")}
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </header>
          {held ? (
            <ul>
              {bin.entries.map((entry) => (
                <li key={entry.id} data-bin-entry={entry.id}>
                  <span>
                    <b>{entry.label}</b>
                    <small>
                      {town
                        ? entry.riding
                          ? t("bin.onBus")
                          : t("bin.waitingBus")
                        : entry.riding
                          ? t("bin.closingSoon")
                          : t("bin.waitingClose")}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => act(() => worldBinStore().restore(entry.id))}
                  >
                    {t("bin.putBack")}
                  </button>
                  <button
                    type="button"
                    className="world-bin-close-now"
                    onClick={() =>
                      act(() => worldBinStore().closeNow([entry.id]))
                    }
                  >
                    {t("bin.closeNow")}
                  </button>
                </li>
              ))}
              {bin.closing.map((entry) => (
                <li key={entry.id} data-bin-entry={entry.id}>
                  <span>
                    <b>{entry.label}</b>
                    <small>{t("bin.closing")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="world-bin-empty">
              {town ? t("bin.emptyTown") : t("bin.emptyOther")}
            </p>
          )}
          {error ? (
            <p className="world-bin-error" role="alert">
              {error}
            </p>
          ) : null}
          {bin.outcomes.length ? (
            <ol className="world-bin-outcomes" aria-label={t("bin.recentAria")}>
              {bin.outcomes
                .slice(-3)
                .reverse()
                .map((outcome) => (
                  <li key={outcome.id} data-result={outcome.result}>
                    <b>{outcome.label}</b> {outcomeWord(outcome.result)}
                    {outcome.result !== "closed" && outcome.detail
                      ? `: ${outcome.detail}`
                      : ""}
                  </li>
                ))}
            </ol>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
