import { Crown, Volume2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  type ChimeSettings,
  DEFAULT_CHIMES,
  MOTIFS,
  type Motif,
  TIMBRE_LABELS,
  TIMBRES,
  type Timbre,
} from "../../../shared/chimes";
import {
  type ChimeDevice,
  chimeDevice,
  setChimeDevice,
} from "../chimes/chimeCenter";
import { previewChime } from "../chimes/player";
import { CloseButton } from "../components/CloseButton";
import { useT } from "../i18n";
import { useLayer } from "../layerStack";
import {
  profileFor,
  saveChimes,
  setTownMaster,
  type TerminalKey,
  type TerminalTarget,
  useAgentProfiles,
} from "./agentProfiles";
import type { WorldLeafObject, WorldObject } from "./worldObject";
import "./agentProfiles.css";

const leafName = (leaf: WorldLeafObject) =>
  leaf.agentName ?? leaf.agentLabel ?? leaf.tabLabel ?? leaf.terminalId;
const keyOf = (leaf: WorldLeafObject): TerminalTarget => ({
  connection_id: leaf.connectionId,
  terminal_id: leaf.terminalId,
  connection_generation: leaf.generation,
  pane_id: leaf.pane.pane_id,
});
const sameKey = (a: TerminalKey | null, leaf: WorldLeafObject) =>
  Boolean(
    a &&
      a.connection_id === leaf.connectionId &&
      a.terminal_id === leaf.terminalId,
  );

/**
 * Settings → Sounds: this device's sound (not synced), the owner's chimes
 * (synced across browsers) and who the Town master is.
 */
export function SoundsDialog({
  world,
  onClose,
}: {
  world: WorldObject;
  onClose(): void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useLayer(true, () => onClose(), { element: () => ref.current });
  const { document } = useAgentProfiles();
  const chimes = document?.chimes ?? DEFAULT_CHIMES;
  const [device, setDevice] = useState<ChimeDevice>(chimeDevice);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<WorldLeafObject | null>(null);
  const [chosen, setChosen] = useState("");

  const agents = useMemo(
    () => world.leaves.filter((leaf) => leaf.kind === "agent"),
    [world.leaves],
  );
  const holder = document?.town_master ?? null;
  const holderLeaf = agents.find((leaf) => sameKey(holder, leaf)) ?? null;
  // Agents launched from a profile that offers the role, not yet holding it.
  const suggested = agents.filter(
    (leaf) =>
      !sameKey(holder, leaf) &&
      profileFor(document, leaf.connectionId, leaf.terminalId)?.town_master,
  );

  const updateDevice = (next: ChimeDevice) => {
    setDevice(next);
    setChimeDevice(next);
  };
  const write = async (run: () => Promise<unknown>) => {
    setError(null);
    try {
      await run();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const updateChimes = (next: ChimeSettings) => write(() => saveChimes(next));
  const assign = (leaf: WorldLeafObject) => {
    // Moving the role from a live holder asks first.
    if (holder && holderLeaf && !sameKey(holder, leaf)) {
      setMoving(leaf);
      return;
    }
    void write(() => setTownMaster(keyOf(leaf), true));
  };
  const test = (motif: Motif, timbre: Timbre = chimes.timbres.crew) =>
    void previewChime(timbre, motif, device.volume);
  const motifLabel = (motif: Motif) =>
    t(
      motif === "needs_you"
        ? "sounds.motifNeedsYou"
        : motif === "for_you"
          ? "sounds.motifForYou"
          : "sounds.motifFinished",
    );

  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        className="modal sounds-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("sounds.title")}
      >
        <div className="modal-head">
          <h2>{t("sounds.title")}</h2>
          <CloseButton onClick={onClose} label={t("sounds.closeAria")} />
        </div>

        <section aria-label={t("sounds.deviceSection")}>
          <h3>{t("sounds.deviceSection")}</h3>
          <label className="profile-check">
            <input
              type="checkbox"
              checked={device.on}
              onChange={(event) =>
                updateDevice({ ...device, on: event.target.checked })
              }
            />
            {t("sounds.playHere")}
          </label>
          <label className="agent-field">
            <span>{t("sounds.volume")}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={device.volume}
              onChange={(event) =>
                updateDevice({ ...device, volume: Number(event.target.value) })
              }
            />
          </label>
          <div className="sounds-row">
            {MOTIFS.map((motif) => (
              <button key={motif} type="button" onClick={() => test(motif)}>
                <Volume2 size={13} aria-hidden="true" /> {motifLabel(motif)}
              </button>
            ))}
          </div>
          <p className="agent-launcher-note">{t("sounds.deviceNote")}</p>
        </section>

        <section aria-label={t("sounds.chimesSection")}>
          <h3>{t("sounds.chimesSection")}</h3>
          {(["town_master", "crew"] as const).map((klass) => {
            const other =
              klass === "crew"
                ? chimes.timbres.town_master
                : chimes.timbres.crew;
            return (
              <label key={klass} className="agent-field">
                <span>
                  {klass === "crew" ? t("sounds.crew") : t("sounds.townMaster")}
                </span>
                <span className="profile-chime">
                  <select
                    value={chimes.timbres[klass]}
                    onChange={(event) =>
                      void updateChimes({
                        ...chimes,
                        timbres: {
                          ...chimes.timbres,
                          [klass]: event.target.value as Timbre,
                        },
                      })
                    }
                  >
                    {TIMBRES.filter((timbre) => timbre !== other).map(
                      (timbre) => (
                        <option key={timbre} value={timbre}>
                          {TIMBRE_LABELS[timbre]}
                        </option>
                      ),
                    )}
                  </select>
                  <button
                    type="button"
                    title={t("sounds.previewTitle")}
                    onClick={() => test("needs_you", chimes.timbres[klass])}
                  >
                    <Volume2 size={13} aria-hidden="true" />{" "}
                    {t("sounds.preview")}
                  </button>
                </span>
              </label>
            );
          })}
          <p className="agent-launcher-note">{t("sounds.chimesNote")}</p>
          {MOTIFS.map((motif) => (
            <label key={motif} className="profile-check">
              <input
                type="checkbox"
                checked={chimes.motifs[motif]}
                onChange={(event) =>
                  void updateChimes({
                    ...chimes,
                    motifs: { ...chimes.motifs, [motif]: event.target.checked },
                  })
                }
              />
              {motifLabel(motif)}
            </label>
          ))}
        </section>

        <section aria-label={t("sounds.townMaster")}>
          <h3>{t("sounds.townMaster")}</h3>
          {holder ? (
            <p className="sounds-row">
              <Crown size={14} aria-hidden="true" />
              {holderLeaf
                ? t("sounds.holderIs", {
                    name: leafName(holderLeaf),
                    space: holderLeaf.spaceLabel,
                  })
                : t("sounds.holderClosed")}
              <button
                type="button"
                onClick={() => void write(() => setTownMaster(null))}
              >
                {t("sounds.clear")}
              </button>
            </p>
          ) : (
            <p>{t("sounds.none")}</p>
          )}
          {suggested.map((leaf) => (
            <p key={leaf.id} className="sounds-row">
              {t("sounds.suggest", {
                name: leafName(leaf),
                space: leaf.spaceLabel,
              })}
              <button type="button" onClick={() => assign(leaf)}>
                <Crown size={13} aria-hidden="true" /> {t("sounds.make")}
              </button>
            </p>
          ))}
          {moving ? (
            <p className="sounds-row agent-launcher-login-row">
              {t("sounds.moveFrom", {
                from: holderLeaf ? leafName(holderLeaf) : "",
                to: leafName(moving),
              })}
              <button
                type="button"
                onClick={() => {
                  const leaf = moving;
                  setMoving(null);
                  void write(() => setTownMaster(keyOf(leaf), true));
                }}
              >
                {t("sounds.move")}
              </button>
              <button type="button" onClick={() => setMoving(null)}>
                {t("sounds.cancel")}
              </button>
            </p>
          ) : null}
          <div className="sounds-row">
            <select
              aria-label={t("sounds.chooserAria")}
              value={chosen}
              onChange={(event) => setChosen(event.target.value)}
            >
              <option value="">{t("sounds.chooseAgent")}</option>
              {agents
                .filter((leaf) => !sameKey(holder, leaf))
                .map((leaf) => (
                  <option key={leaf.id} value={leaf.id}>
                    {leafName(leaf)} · {leaf.spaceLabel}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!chosen}
              onClick={() => {
                const leaf = agents.find(
                  (candidate) => candidate.id === chosen,
                );
                if (leaf) assign(leaf);
                setChosen("");
              }}
            >
              <Crown size={13} aria-hidden="true" /> {t("sounds.make")}
            </button>
          </div>
          <p className="agent-launcher-note">{t("sounds.masterNote")}</p>
        </section>

        <section aria-label="Notes">
          <p className="agent-launcher-note">
            {t("sounds.notesForYouPrefix")}
            <code>herdr notification show &lt;title&gt;</code>
            {t("sounds.notesForYouMid")}
            <code>--sound</code>
            {t("sounds.notesForYouSuffix")}
          </p>
          <p className="agent-launcher-note">
            {t("sounds.notesHerdrPrefix")}
            <code>[ui.sound] enabled = false</code>
            {t("sounds.notesHerdrMid")}
            <code>config.toml</code>
            {t("sounds.notesHerdrSuffix")}
          </p>
        </section>
        {error ? (
          <p className="agent-launcher-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
