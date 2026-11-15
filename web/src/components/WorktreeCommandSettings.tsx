import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { useConnectionClient } from "../useConnectionClient";
import "./WorktreeCommandSettings.css";

/** Edits the default commands that create and remove worktrees. */
export function WorktreeCommandSettings() {
  const t = useT();
  const client = useConnectionClient();
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savedRemove, setSavedRemove] = useState("");
  const [draftRemove, setDraftRemove] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(() =>
    t("components.worktreeCommand.loading"),
  );

  useEffect(() => {
    let cancelled = false;
    client
      .call("settings.get")
      .then((result) => {
        if (cancelled || !client.isCurrent()) return;
        const command = result?.settings?.worktree_command ?? "";
        const removeCommand = result?.settings?.worktree_remove_command ?? "";
        setSaved(command);
        setDraft(command);
        setSavedRemove(removeCommand);
        setDraftRemove(removeCommand);
        setStatus("");
      })
      .catch((error) => {
        if (!cancelled) setStatus((error as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const save = async () => {
    setSaving(true);
    setStatus(t("components.worktreeCommand.saving"));
    try {
      const result = await client.call("settings.worktree_command.update", {
        command: draft,
        remove_command: draftRemove,
      });
      const command = result?.worktree_command ?? "";
      const removeCommand = result?.worktree_remove_command ?? "";
      setSaved(command);
      setDraft(command);
      setSavedRemove(removeCommand);
      setDraftRemove(removeCommand);
      setStatus(t("components.worktreeCommand.saved"));
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changed = draft.trim() !== saved || draftRemove.trim() !== savedRemove;

  return (
    <form
      className="worktree-command-settings"
      aria-busy={saved === null || saving}
      onSubmit={(event) => {
        event.preventDefault();
        if (changed) void save();
      }}
    >
      <label htmlFor="worktree-command-default">
        {t("components.worktreeCommand.newCommand")}
      </label>
      <input
        id="worktree-command-default"
        type="text"
        value={draft}
        placeholder="git recworktree add {path} --branch {branch} --base {base}"
        disabled={saved === null || saving}
        spellCheck={false}
        autoComplete="off"
        aria-describedby="worktree-command-hint"
        onChange={(event) => setDraft(event.target.value)}
      />
      <p id="worktree-command-hint" className="worktree-command-hint">
        {t("components.worktreeCommand.hint")}
      </p>
      <label htmlFor="worktree-remove-command-default">
        {t("components.worktreeCommand.removeLabel")}
      </label>
      <input
        id="worktree-remove-command-default"
        type="text"
        value={draftRemove}
        placeholder="git recworktree remove {path} {force}"
        disabled={saved === null || saving}
        spellCheck={false}
        autoComplete="off"
        aria-describedby="worktree-remove-command-hint"
        onChange={(event) => setDraftRemove(event.target.value)}
      />
      <p id="worktree-remove-command-hint" className="worktree-command-hint">
        {t("components.worktreeCommand.removeHint")}
      </p>
      <div className="worktree-command-actions">
        <span role="status">{status}</span>
        <button type="submit" disabled={saved === null || saving || !changed}>
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
