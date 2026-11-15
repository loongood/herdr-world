import { useState, type ReactNode } from "react";
import {
  appearanceFor,
  AVATAR_CHOICES,
  type AppearanceFields,
} from "../../../shared/appearance";
import {
  tabCardKey,
  TERMINAL_COLOR_NAMES,
} from "../../../shared/terminalColor";
import { ColorSwatches } from "../components/ColorSwatch";
import { useT } from "../i18n";
import { AppearanceAvatar } from "./AppearanceAvatar";
import {
  renameAppearanceTab,
  saveAppearance,
  useAppearanceDocument,
  type AppearanceIdentity,
} from "./appearance";
import type { ManagedWindowControls } from "./windows/WindowControls";
import "./appearance.css";

export type TerminalAppearanceEditorProps = {
  connectionId: string;
  generation: number;
  tabId: string;
  paneId: string;
  terminalId: string;
  tabTerminals?: readonly string[];
  workspaceIds: readonly string[];
  tabName: string;
  color: NonNullable<ManagedWindowControls["color"]>;
  disabled?: boolean;
  children?: ReactNode;
};
/** Separate native-name and metadata saves keep failures attributable and drafts intact. */
export function TerminalAppearanceEditor(props: TerminalAppearanceEditorProps) {
  const {
    connectionId,
    generation,
    tabId,
    paneId,
    terminalId,
    workspaceIds,
    tabName,
    color,
    disabled,
    children,
  } = props;
  const t = useT();
  const document = useAppearanceDocument();
  const tab: AppearanceIdentity = {
    connection_id: connectionId,
    connection_generation: generation,
    kind: "tab",
    native_id: tabId,
    color_key: tabCardKey(connectionId, tabId, new Set(workspaceIds)),
    witness: [...(props.tabTerminals ?? [terminalId])],
  };
  const pane: AppearanceIdentity = {
    connection_id: connectionId,
    connection_generation: generation,
    kind: "pane",
    native_id: paneId,
    witness: [terminalId],
  };
  const savedStatus = appearanceFor(document?.appearance, tab)?.status ?? "";
  const avatar = appearanceFor(document?.appearance, pane)?.avatar;
  // A draft is null until edited, so a field shows the shared value. Deriving
  // it, rather than copying the value in an effect, keeps a remote change that
  // lands just before a keystroke from overwriting what the keystroke typed.
  const [nameDraft, setNameDraft] = useState<string | null>(null),
    [statusDraft, setStatusDraft] = useState<string | null>(null);
  const name = nameDraft ?? tabName,
    status = statusDraft ?? savedStatus;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  const save = async (target: AppearanceIdentity, fields: AppearanceFields) => {
    const failure = await saveAppearance(target, fields);
    if (failure) throw new Error(failure);
  };
  return (
    <section
      className="terminal-appearance-editor"
      aria-label={t("terminal.appearanceAria")}
    >
      <fieldset disabled={disabled || busy}>
        <legend>{t("appearance.tabAppearance")}</legend>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await renameAppearanceTab(tab, name);
              setNameDraft(null);
            }, t("appearance.nativeTabNameSaved"));
          }}
        >
          <label>
            {t("appearance.tabName")}
            <input
              aria-label={t("appearance.tabName")}
              value={name}
              maxLength={160}
              onChange={(event) => setNameDraft(event.target.value)}
            />
          </label>
          <button type="submit" disabled={!name.trim() || nameDraft === null}>
            {t("appearance.saveName")}
          </button>
        </form>
        <ColorSwatches
          label={t("inspector.terminalColour")}
          palette={color.palette}
          current={color.current}
          onColor={(id) => {
            if (
              id !== null &&
              !(TERMINAL_COLOR_NAMES as readonly string[]).includes(id)
            )
              return;
            void run(
              () => save(tab, { color: id as AppearanceFields["color"] }),
              t("appearance.tabColourSaved"),
            );
          }}
        />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await save(tab, { status });
              setStatusDraft(null);
            }, t("appearance.tabStatusSaved"));
          }}
        >
          <label>
            {t("appearance.statusMessage")}
            <input
              aria-label={t("appearance.tabStatusMessage")}
              value={status}
              maxLength={160}
              onChange={(event) => setStatusDraft(event.target.value)}
            />
          </label>
          <button type="submit" disabled={statusDraft === null}>
            {t("appearance.saveStatus")}
          </button>
          <button
            type="button"
            disabled={!savedStatus && !status}
            onClick={() =>
              void run(async () => {
                await save(tab, { status: null });
                setStatusDraft(null);
              }, t("appearance.tabStatusReset"))
            }
          >
            {t("appearance.clearStatus")}
          </button>
        </form>
        <div role="group" aria-label={t("appearance.paneAvatar")}>
          <strong>{t("appearance.paneAvatar")}</strong>
          <div className="appearance-avatars">
            {AVATAR_CHOICES.map((choice) => (
              <button
                type="button"
                key={choice.id}
                aria-label={t("appearance.avatarAria", { name: choice.name })}
                aria-pressed={avatar === choice.id}
                onClick={() =>
                  void run(
                    () => save(pane, { avatar: choice.id }),
                    t("appearance.paneAvatarSaved"),
                  )
                }
              >
                <AppearanceAvatar id={choice.id} />
                <span>{choice.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!avatar}
            onClick={() =>
              void run(
                () => save(pane, { avatar: null }),
                t("appearance.paneAvatarReset"),
              )
            }
          >
            {t("appearance.defaultAvatar")}
          </button>
        </div>
        {children}
      </fieldset>
      {disabled ? <p>{t("appearance.unavailableWhileStale")}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
    </section>
  );
}
