import { Copy, Dices, Play, Plus, Save, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCESSORIES,
  type AgentLook,
  type AgentProfile,
  agentNameFor,
  HAIR_STYLES,
  HAIRS,
  HARNESS_CHOICES,
  launchCommandPreview,
  launchPlan,
  OUTFITS,
  PANTS,
  SHIRTS,
  SKINS,
  STARTER_PROFILES,
  TOOL_CHOICES,
} from "../../../shared/agentProfile";
import {
  DEFAULT_CHIMES,
  TIMBRE_LABELS,
  TIMBRES,
  type Timbre,
} from "../../../shared/chimes";
import { chimeDevice } from "../chimes/chimeCenter";
import { previewChime } from "../chimes/player";
import { CloseButton } from "../components/CloseButton";
import { ColorSwatches } from "../components/ColorSwatch";
import { useT } from "../i18n";
import { useLayer } from "../layerStack";
import {
  deleteProfile,
  harnessLabel,
  type LauncherCatalog,
  launcherCatalog,
  readinessNote,
  saveProfile,
  useAgentProfiles,
} from "./agentProfiles";
import { ProfileSprite } from "./ProfileSprite";
import { TERMINAL_COLOR_PALETTE } from "./terminalColor";
import type { WorldObject } from "./worldObject";
import "./agentProfiles.css";

type Tab = "who" | "brain" | "skills" | "brief" | "look";
const TABS: Tab[] = ["who", "brain", "skills", "brief", "look"];
const TAB_LABEL_KEYS: Record<
  Tab,
  | "profileEditor.tabWho"
  | "profileEditor.tabBrain"
  | "profileEditor.tabSkills"
  | "profileEditor.tabBrief"
  | "profileEditor.tabLook"
> = {
  who: "profileEditor.tabWho",
  brain: "profileEditor.tabBrain",
  skills: "profileEditor.tabSkills",
  brief: "profileEditor.tabBrief",
  look: "profileEditor.tabLook",
};
const LOOK_LABEL_KEYS: Record<
  string,
  | "profileEditor.lookShort"
  | "profileEditor.lookLong"
  | "profileEditor.lookBun"
  | "profileEditor.lookCap"
  | "profileEditor.lookShaved"
  | "profileEditor.lookShirt"
  | "profileEditor.lookHoodie"
  | "profileEditor.lookCoat"
  | "profileEditor.lookDress"
  | "profileEditor.lookCaptain"
  | "profileEditor.lookNone"
  | "profileEditor.lookGlasses"
  | "profileEditor.lookHeadset"
  | "profileEditor.lookScarf"
  | "profileEditor.lookBadge"
  | "profileEditor.lookPencil"
> = {
  short: "profileEditor.lookShort",
  long: "profileEditor.lookLong",
  bun: "profileEditor.lookBun",
  cap: "profileEditor.lookCap",
  shaved: "profileEditor.lookShaved",
  shirt: "profileEditor.lookShirt",
  hoodie: "profileEditor.lookHoodie",
  coat: "profileEditor.lookCoat",
  dress: "profileEditor.lookDress",
  captain: "profileEditor.lookCaptain",
  none: "profileEditor.lookNone",
  glasses: "profileEditor.lookGlasses",
  headset: "profileEditor.lookHeadset",
  scarf: "profileEditor.lookScarf",
  badge: "profileEditor.lookBadge",
  pencil: "profileEditor.lookPencil",
};
const pick = <T,>(values: readonly T[]) =>
  values[Math.floor(Math.random() * values.length)]!;

function uniqueId(name: string, taken: ReadonlySet<string>) {
  return agentNameFor(name, taken);
}

/**
 * The profile editor and Town's character creator: who an agent is, its
 * brain (harness and model), skills and tools, starting brief and look, with
 * a live preview and what a launch will run. Opened from World settings,
 * Town and Board.
 */
export function ProfileEditor({
  world,
  initialId,
  onLaunch,
  onClose,
}: {
  world: WorldObject;
  initialId?: string;
  /** Open the launcher with this profile chosen. */
  onLaunch(profileId: string): void;
  onClose(): void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useLayer(true, () => onClose(), { element: () => ref.current });
  const { document, error: loadError } = useAgentProfiles();
  const profiles = document?.profiles ?? [];
  const chimes = document?.chimes ?? DEFAULT_CHIMES;
  const [selectedId, setSelectedId] = useState<string | null>(
    initialId ?? null,
  );
  const [draft, setDraft] = useState<AgentProfile | null>(null);
  const [tab, setTab] = useState<Tab>("who");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showWorld, setShowWorld] = useState(false);

  // The first room's host answers which kinds and skills exist.
  const host = world.spaces.find((space) => space.actionable && !space.stale);
  const [catalog, setCatalog] = useState<LauncherCatalog | null>(null);
  const hostConnection = host?.connectionId;
  const hostGeneration = host?.generation;
  const hostWorkspace = host?.nativeId;
  useEffect(() => {
    if (!hostConnection || hostGeneration === undefined || !hostWorkspace)
      return;
    let current = true;
    launcherCatalog({
      connectionId: hostConnection,
      generation: hostGeneration,
      workspaceId: hostWorkspace,
    })
      .then((next) => current && setCatalog(next))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [hostConnection, hostGeneration, hostWorkspace]);

  const saved = profiles.find((p) => p.id === selectedId) ?? null;
  const firstId = profiles[0]?.id;
  useEffect(() => {
    if (!selectedId && firstId) setSelectedId(firstId);
  }, [firstId, selectedId]);
  useEffect(() => {
    // A new selection (or its first load) starts a fresh draft.
    if (saved && draft?.id !== saved.id) setDraft(structuredClone(saved));
  }, [saved, draft?.id]);

  const dirty = useMemo(
    () => Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );
  const rooms = useMemo(
    () => [...new Set(world.spaces.map((space) => space.label))].sort(),
    [world.spaces],
  );

  const update = (patch: Partial<AgentProfile>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const updateLook = (patch: Partial<AgentLook>) =>
    setDraft((current) =>
      current ? { ...current, look: { ...current.look, ...patch } } : current,
    );

  const persist = async (profile: AgentProfile) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveProfile(profile);
      setSelectedId(profile.id);
      setDraft(structuredClone(profile));
      setMessage(t("profileEditor.saved"));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const create = (from: AgentProfile, name: string) => {
    const ids = new Set(profiles.map((p) => p.id));
    const profile = structuredClone(from);
    delete profile.starter;
    profile.name = name;
    profile.id = uniqueId(name, ids);
    void persist(profile);
  };

  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const kinds = useMemo(() => {
    const listed = catalog?.kinds ?? ["claude", "codex"];
    return draft && !listed.includes(draft.harness)
      ? [draft.harness, ...listed]
      : listed;
  }, [catalog, draft]);
  const choices = draft ? HARNESS_CHOICES[draft.harness] : undefined;
  const skills = useMemo(
    () => [...new Set([...(catalog?.skills ?? []), ...(draft?.skills ?? [])])],
    [catalog, draft?.skills],
  );

  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        className="modal profile-editor"
        role="dialog"
        aria-modal="true"
        aria-label={t("profileEditor.titleAria")}
      >
        <div className="modal-head">
          <h2>{t("profileEditor.title")}</h2>
          <CloseButton onClick={onClose} label={t("profileEditor.closeAria")} />
        </div>
        {loadError && !document ? (
          <p className="agent-launcher-error">{loadError}</p>
        ) : null}
        <div className="profile-editor-grid">
          <aside
            className="profile-roster"
            aria-label={t("profileEditor.profilesAria")}
          >
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="profile-roster-item"
                aria-pressed={profile.id === selectedId}
                onClick={() => {
                  setSelectedId(profile.id);
                  setDraft(structuredClone(profile));
                  setMessage(null);
                  setError(null);
                }}
              >
                <ProfileSprite look={profile.look} scale={2} />
                <span>
                  <b>
                    {profile.name}
                    {profile.starter ? (
                      <i> {t("profileEditor.starter")}</i>
                    ) : null}
                  </b>
                  <small>{harnessLabel(profile.harness)}</small>
                </span>
              </button>
            ))}
            <button
              type="button"
              className="profile-roster-new"
              onClick={() =>
                create(STARTER_PROFILES[1]!, t("profileEditor.launchNew"))
              }
            >
              <Plus size={14} aria-hidden="true" />{" "}
              {t("profileEditor.newProfile")}
            </button>
          </aside>
          {draft ? (
            <section
              className="profile-form"
              aria-label={t("profileEditor.profileAria")}
            >
              <div className="profile-form-head">
                <b>{draft.name || t("profileEditor.unnamed")}</b>
                <button
                  type="button"
                  onClick={() => create(draft, `${draft.name} copy`)}
                >
                  <Copy size={13} aria-hidden="true" />{" "}
                  {t("profileEditor.duplicate")}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        t("profileEditor.deleteConfirm", { name: draft.name }),
                      )
                    )
                      return;
                    try {
                      await deleteProfile(draft.id);
                      setSelectedId(null);
                      setDraft(null);
                    } catch (cause) {
                      setError(
                        cause instanceof Error ? cause.message : String(cause),
                      );
                    }
                  }}
                >
                  <Trash2 size={13} aria-hidden="true" />{" "}
                  {t("profileEditor.delete")}
                </button>
                <button
                  type="button"
                  className="profile-primary"
                  disabled={saving}
                  onClick={async () => {
                    if (!dirty || (await persist(draft))) onLaunch(draft.id);
                  }}
                >
                  <Play size={13} aria-hidden="true" />{" "}
                  {t("profileEditor.launchNew")}
                </button>
              </div>
              <div className="profile-tabs" role="tablist">
                {TABS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {t(TAB_LABEL_KEYS[id])}
                  </button>
                ))}
              </div>
              {tab === "who" ? (
                <div className="profile-pane">
                  <label className="agent-field">
                    <span>{t("profileEditor.nameLabel")}</span>
                    <input
                      value={draft.name}
                      maxLength={32}
                      onChange={(event) => update({ name: event.target.value })}
                    />
                    <small>
                      {t("profileEditor.nameHelpPrefix")}
                      <code>{agentNameFor(draft.name)}</code>
                      {t("profileEditor.nameHelpSuffix")}
                    </small>
                  </label>
                  <label className="agent-field">
                    <span>{t("profileEditor.homeRoom")}</span>
                    <select
                      value={draft.home_room}
                      onChange={(event) =>
                        update({ home_room: event.target.value })
                      }
                    >
                      <option value="">{t("profileEditor.anyRoom")}</option>
                      {[...new Set([draft.home_room, ...rooms])]
                        .filter(Boolean)
                        .map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                    </select>
                    <small>{t("profileEditor.homeRoomHelp")}</small>
                  </label>
                  <label className="agent-field">
                    <span>{t("profileEditor.roleLabel")}</span>
                    <textarea
                      rows={5}
                      value={draft.role}
                      onChange={(event) => update({ role: event.target.value })}
                    />
                    <small>{t("profileEditor.roleHelp")}</small>
                  </label>
                  <div className="agent-field">
                    <span>{t("profileEditor.colour")}</span>
                    <ColorSwatches
                      palette={TERMINAL_COLOR_PALETTE}
                      current={{
                        id: draft.color ?? "",
                        custom: draft.color !== null,
                      }}
                      onColor={(id) =>
                        update({ color: id as AgentProfile["color"] })
                      }
                      label={t("profileEditor.colourAria")}
                    />
                    <small>{t("profileEditor.colourHelp")}</small>
                  </div>
                  <label className="profile-check">
                    <input
                      type="checkbox"
                      checked={draft.town_master}
                      onChange={(event) =>
                        update({ town_master: event.target.checked })
                      }
                    />
                    {t("profileEditor.townMasterCheck")}
                  </label>
                  <small className="agent-launcher-note">
                    {t("profileEditor.townMasterNote")}
                  </small>
                </div>
              ) : null}
              {tab === "brain" ? (
                <div className="profile-pane">
                  <p className="agent-launcher-note">
                    {t("profileEditor.brainNote")}
                  </p>
                  {(() => {
                    const option = (kind: string) => {
                      const note = readinessNote(kind, catalog);
                      return (
                        <label key={kind}>
                          <input
                            type="radio"
                            name="profile-harness"
                            checked={draft.harness === kind}
                            onChange={() =>
                              update({
                                harness: kind,
                                model: "",
                                effort: "",
                                permission: "",
                              })
                            }
                          />
                          <span>
                            <b>{harnessLabel(kind)}</b>
                            {note ? <small>{note.text}</small> : null}
                          </span>
                        </label>
                      );
                    };
                    // Harnesses this host lacks fold away, unless chosen.
                    const missing = (kind: string) =>
                      kind !== draft.harness &&
                      Boolean(readinessNote(kind, catalog)?.blocked);
                    const absent = kinds.filter(missing);
                    return (
                      <div className="profile-radio" role="radiogroup">
                        {kinds.filter((kind) => !missing(kind)).map(option)}
                        {absent.length ? (
                          <details>
                            <summary>
                              {t("profileEditor.absentMore", {
                                count: absent.length,
                              })}
                            </summary>
                            {absent.map(option)}
                          </details>
                        ) : null}
                      </div>
                    );
                  })()}
                  <label className="agent-field">
                    <span>{t("profileEditor.model")}</span>
                    <input
                      list="profile-models"
                      value={draft.model}
                      placeholder={t("profileEditor.harnessDefault")}
                      onChange={(event) =>
                        update({ model: event.target.value.trim() })
                      }
                    />
                    <datalist id="profile-models">
                      {(choices?.models ?? []).map((model) => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                  </label>
                  {choices?.efforts.length ? (
                    <label className="agent-field">
                      <span>{t("profileEditor.effort")}</span>
                      <select
                        value={draft.effort}
                        onChange={(event) =>
                          update({ effort: event.target.value })
                        }
                      >
                        <option value="">
                          {t("profileEditor.harnessDefault")}
                        </option>
                        {choices.efforts.map((effort) => (
                          <option key={effort}>{effort}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {choices ? (
                    <div className="agent-field">
                      <span>{t("profileEditor.permission")}</span>
                      <div className="profile-radio" role="radiogroup">
                        {[
                          ["", t("profileEditor.harnessDefault")] as [
                            string,
                            string,
                          ],
                        ]
                          .concat(choices.permissions)
                          .map(([mode, help]) => (
                            <label key={mode || "default"}>
                              <input
                                type="radio"
                                name="profile-permission"
                                checked={draft.permission === mode}
                                onChange={() => update({ permission: mode })}
                              />
                              <span>
                                <b>{mode || t("profileEditor.modeDefault")}</b>
                                <small>{help}</small>
                              </span>
                            </label>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="agent-launcher-note">
                      {t("profileEditor.noMapping")}
                    </p>
                  )}
                </div>
              ) : null}
              {tab === "skills" ? (
                <div className="profile-pane">
                  <div className="agent-field">
                    <span>{t("profileEditor.skills")}</span>
                    <small>
                      {t("profileEditor.skillsHelpPrefix")}
                      <code>SKILL.md</code>
                      {t("profileEditor.skillsHelpSuffix")}
                    </small>
                    <div className="profile-chips">
                      {skills.length ? (
                        skills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            aria-pressed={draft.skills.includes(skill)}
                            onClick={() =>
                              update({ skills: toggle(draft.skills, skill) })
                            }
                          >
                            {skill}
                          </button>
                        ))
                      ) : (
                        <small>{t("profileEditor.noSkills")}</small>
                      )}
                    </div>
                  </div>
                  <div className="agent-field">
                    <span>{t("profileEditor.tools")}</span>
                    <small>{t("profileEditor.toolsHelp")}</small>
                    <div className="profile-chips">
                      {[...new Set([...TOOL_CHOICES, ...draft.tools])].map(
                        (tool) => (
                          <button
                            key={tool}
                            type="button"
                            aria-pressed={draft.tools.includes(tool)}
                            onClick={() =>
                              update({ tools: toggle(draft.tools, tool) })
                            }
                          >
                            {tool}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              {tab === "brief" ? (
                <div className="profile-pane">
                  <label className="agent-field">
                    <span>{t("profileEditor.briefLabel")}</span>
                    <textarea
                      rows={10}
                      value={draft.brief}
                      onChange={(event) =>
                        update({ brief: event.target.value })
                      }
                    />
                    <small>
                      {t("profileEditor.briefFilled")} <code>{"{{name}}"}</code>{" "}
                      <code>{"{{task}}"}</code> <code>{"{{room}}"}</code>{" "}
                      <code>{"{{spawned_by}}"}</code>
                    </small>
                  </label>
                  <label className="profile-check">
                    <input
                      type="checkbox"
                      checked={draft.send_brief}
                      onChange={(event) =>
                        update({ send_brief: event.target.checked })
                      }
                    />
                    {t("profileEditor.sendBrief")}
                  </label>
                </div>
              ) : null}
              {tab === "look" ? (
                <div className="profile-pane">
                  <LookSwatches
                    label={t("profileEditor.skin")}
                    values={SKINS}
                    current={draft.look.skin}
                    onPick={(skin) => updateLook({ skin })}
                  />
                  <LookOptions
                    label={t("profileEditor.hair")}
                    values={HAIR_STYLES}
                    current={draft.look.hair_style}
                    onPick={(hair_style) => updateLook({ hair_style })}
                  />
                  <LookSwatches
                    label={t("profileEditor.hairColour")}
                    values={HAIRS}
                    current={draft.look.hair}
                    onPick={(hair) => updateLook({ hair })}
                  />
                  <LookOptions
                    label={t("profileEditor.outfit")}
                    values={OUTFITS}
                    current={draft.look.outfit}
                    onPick={(outfit) => updateLook({ outfit })}
                  />
                  <LookSwatches
                    label={t("profileEditor.shirtOrDress")}
                    values={SHIRTS}
                    current={draft.look.shirt}
                    onPick={(shirt) => updateLook({ shirt })}
                  />
                  <LookSwatches
                    label={t("profileEditor.trousers")}
                    values={PANTS}
                    current={draft.look.pants}
                    onPick={(pants) => updateLook({ pants })}
                  />
                  <LookOptions
                    label={t("profileEditor.accessory")}
                    values={ACCESSORIES}
                    current={draft.look.accessory}
                    onPick={(accessory) => updateLook({ accessory })}
                  />
                  <ChimeField
                    current={draft.chime}
                    master={chimes.timbres.town_master}
                    crew={chimes.timbres.crew}
                    onPick={(chime) => update({ chime })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateLook({
                        skin: pick(SKINS),
                        hair: pick(HAIRS),
                        hair_style: pick(HAIR_STYLES),
                        outfit: pick(OUTFITS),
                        shirt: pick(SHIRTS),
                        pants: pick(PANTS),
                        accessory: pick(ACCESSORIES),
                      })
                    }
                  >
                    <Dices size={13} aria-hidden="true" />{" "}
                    {t("profileEditor.surprise")}
                  </button>
                </div>
              ) : null}
              <div className="profile-form-foot" role="status">
                {error ? (
                  <span className="agent-launcher-error">{error}</span>
                ) : message && !dirty ? (
                  <span>{message}</span>
                ) : dirty ? (
                  <span>{t("profileEditor.unsaved")}</span>
                ) : null}
                <button
                  type="button"
                  className="profile-primary"
                  disabled={!dirty || saving}
                  onClick={() => void persist(draft)}
                >
                  <Save size={13} aria-hidden="true" />{" "}
                  {t("profileEditor.save")}
                </button>
              </div>
            </section>
          ) : null}
          {draft ? (
            <div className="profile-side">
              <section
                className="profile-preview"
                aria-label={t("profileEditor.previewAria")}
              >
                <ProfileSprite
                  look={draft.look}
                  scale={6}
                  animate
                  label={t("profileEditor.inTown", { name: draft.name })}
                />
                <span
                  className="profile-tag"
                  style={{
                    borderLeftColor: draft.color
                      ? TERMINAL_COLOR_PALETTE.find((c) => c.id === draft.color)
                          ?.hex
                      : undefined,
                  }}
                >
                  {agentNameFor(draft.name)}
                </span>
              </section>
              <section
                className="profile-launch"
                aria-label={t("profileEditor.launchSectionAria")}
              >
                <div className="agent-launcher-section-head">
                  <h3>{t("profileEditor.launchSectionTitle")}</h3>
                  <button
                    type="button"
                    aria-pressed={showWorld}
                    onClick={() => setShowWorld((v) => !v)}
                  >
                    {showWorld
                      ? t("profileEditor.showHarness")
                      : t("profileEditor.showWorldProfile")}
                  </button>
                </div>
                <pre>
                  {showWorld
                    ? JSON.stringify(draft, null, 2)
                    : `${launchCommandPreview(draft)}\n\n# ${launchPlan(draft, agentNameFor(draft.name)).summary}`}
                </pre>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LookSwatches({
  label,
  values,
  current,
  onPick,
}: {
  label: string;
  values: readonly string[];
  current: string;
  onPick(value: string): void;
}) {
  return (
    <div className="agent-field">
      <span>{label}</span>
      <div className="profile-swatches" role="group" aria-label={label}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            style={{ background: value }}
            aria-label={`${label} ${value}`}
            aria-pressed={current === value}
            onClick={() => onPick(value)}
          />
        ))}
      </div>
    </div>
  );
}

function LookOptions<T extends string>({
  label,
  values,
  current,
  onPick,
}: {
  label: string;
  values: readonly T[];
  current: T;
  onPick(value: T): void;
}) {
  const t = useT();
  return (
    <div className="agent-field">
      <span>{label}</span>
      <div className="profile-chips" role="group" aria-label={label}>
        {values.map((value) => {
          const key = LOOK_LABEL_KEYS[value];
          return (
            <button
              key={value}
              type="button"
              aria-pressed={current === value}
              onClick={() => onPick(value)}
            >
              {key ? t(key) : value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The profile's chime: its class's default, or one of World's sounds except
 * the Town master's, which is the master's alone.
 */
function ChimeField({
  current,
  master,
  crew,
  onPick,
}: {
  current: Timbre | null;
  master: Timbre;
  crew: Timbre;
  onPick(chime: Timbre | null): void;
}) {
  const t = useT();
  return (
    <div className="agent-field">
      <span>{t("profileEditor.chime")}</span>
      <div className="profile-chime">
        <select
          aria-label={t("profileEditor.chimeAria")}
          value={current ?? ""}
          onChange={(event) =>
            onPick((event.target.value || null) as Timbre | null)
          }
        >
          <option value="">
            {t("profileEditor.classDefault", { timbre: TIMBRE_LABELS[crew] })}
          </option>
          {TIMBRES.filter((timbre) => timbre !== master).map((timbre) => (
            <option key={timbre} value={timbre}>
              {TIMBRE_LABELS[timbre]}
            </option>
          ))}
        </select>
        <button
          type="button"
          title={t("profileEditor.playNeedsYou")}
          onClick={() =>
            void previewChime(
              current ?? crew,
              "needs_you",
              chimeDevice().volume,
            )
          }
        >
          <Volume2 size={13} aria-hidden="true" /> {t("profileEditor.preview")}
        </button>
      </div>
      <small>
        {t("profileEditor.chimeNotePrefix")}
        {TIMBRE_LABELS[master]}
        {t("profileEditor.chimeNoteSuffix")}
      </small>
    </div>
  );
}
