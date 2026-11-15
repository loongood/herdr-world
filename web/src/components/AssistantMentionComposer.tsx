import { AtSign, Bot, Folder, LoaderCircle, RefreshCw, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ASSISTANT_MAX_MENTIONS,
  type AssistantMention,
  type AssistantMentionTarget,
  type AssistantWorkspace,
  type AssistantWorkspaceRef,
} from "../../../shared/assistant";
import { getAssistantMentions } from "../assistant";
import {
  assistantMentionKey,
  assistantMentionQuery,
  insertAssistantMention,
} from "../assistantMentions";
import { useT } from "../i18n";
import "./AssistantMentionComposer.css";

export function AssistantMentionComposer({
  value,
  mentions,
  workspaces,
  currentWorkspace,
  draftKey,
  inputRef,
  mobile,
  onChange,
  onSubmit,
  onOpenMention,
  onCompositionChange,
}: {
  value: string;
  mentions: AssistantMention[];
  workspaces: AssistantWorkspace[];
  currentWorkspace?: AssistantWorkspaceRef;
  draftKey: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  mobile: boolean;
  onChange: (
    text: string,
    mentions?: AssistantMention[],
    inputType?: string,
    edit?: { start: number; end: number; inputType?: string },
  ) => void;
  /** `queue` is set for Alt+Enter, which queues while Ranger answers. */
  onSubmit: (options?: { queue: boolean }) => void;
  onOpenMention: (target: AssistantMentionTarget) => void;
  onCompositionChange: (composing: boolean) => void;
}) {
  const [picker, setPicker] =
    useState<ReturnType<typeof assistantMentionQuery>>(null);
  const [category, setCategory] = useState<"all" | "workspace" | "agent">(
    "all",
  );
  const [targets, setTargets] = useState<AssistantMentionTarget[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const composing = useRef(false);
  const edit = useRef<
    { start: number; end: number; inputType?: string } | undefined
  >(undefined);
  const browsing = useRef(false);
  const dismissed = useRef("");
  const caret = useRef<number | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const t = useT();
  const open = picker !== null;
  const mentionedWorkspaces = mentions.filter(
    (mention) => mention.kind === "workspace",
  );
  const scope = workspaces
    .filter(
      (workspace) =>
        !mentionedWorkspaces.length ||
        mentionedWorkspaces.some(
          (mention) =>
            mention.connection_id === workspace.connection_id &&
            mention.workspace_id === workspace.workspace_id,
        ),
    )
    .map(({ connection_id, workspace_id }) => ({ connection_id, workspace_id }))
    .sort((a, b) => {
      const current = (ref: AssistantWorkspaceRef) =>
        ref.connection_id === currentWorkspace?.connection_id &&
        ref.workspace_id === currentWorkspace?.workspace_id;
      return Number(current(b)) - Number(current(a));
    });
  const scopeSignature = JSON.stringify(scope);
  const workspaceSignature = JSON.stringify(workspaces);
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const capture = (event: InputEvent) => {
      edit.current = {
        start: input.selectionStart,
        end: input.selectionEnd,
        inputType: event.inputType,
      };
    };
    input.addEventListener("beforeinput", capture);
    return () => input.removeEventListener("beforeinput", capture);
  }, [inputRef]);
  const immediate = useMemo(
    () =>
      (JSON.parse(workspaceSignature) as AssistantWorkspace[]).map(
        (workspace): AssistantMentionTarget => ({
          kind: "workspace",
          connection_id: workspace.connection_id,
          workspace_id: workspace.workspace_id,
          runtime_generation: workspace.runtime_generation,
          connection_label: workspace.connection_label,
          workspace_label: workspace.label,
          label: workspace.label,
        }),
      ),
    [workspaceSignature],
  );
  useEffect(() => {
    setPicker(null);
    setTargets(null);
    dismissed.current = "";
  }, [draftKey]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setTargets(null);
    setErrors([]);
    setTruncated(false);
    void getAssistantMentions(JSON.parse(scopeSignature)).then(
      (catalog) => {
        if (cancelled) return;
        const listed = new Set(catalog.targets.map(assistantMentionKey));
        setTargets([
          ...catalog.targets,
          ...immediate.filter(
            (target) => !listed.has(assistantMentionKey(target)),
          ),
        ]);
        setErrors(catalog.errors);
        setTruncated(catalog.truncated ?? false);
        setLoading(false);
      },
      (cause: unknown) => {
        if (cancelled) return;
        setErrors([cause instanceof Error ? cause.message : String(cause)]);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, scopeSignature, immediate, draftKey, retry]);
  useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value, mentions, inputRef]);

  const query = picker?.query.toLocaleLowerCase() ?? "";
  const candidates = (targets ?? immediate)
    .filter(
      (target) =>
        (category === "all" || target.kind === category) &&
        [
          target.label,
          target.connection_label,
          target.workspace_label,
          ...(target.kind === "agent" ? [target.agent, target.pane_id] : []),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
    )
    .sort((a, b) => {
      const current = (target: AssistantMentionTarget) =>
        target.connection_id === currentWorkspace?.connection_id &&
        target.workspace_id === currentWorkspace?.workspace_id;
      return Number(current(b)) - Number(current(a));
    });
  const selected =
    candidates[Math.min(active, Math.max(0, candidates.length - 1))];
  useEffect(() => {
    setActive(0);
  }, [query, category, targets]);
  useEffect(() => {
    list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  const close = () => {
    browsing.current = false;
    dismissed.current = `${value}:${inputRef.current?.selectionStart}`;
    setPicker(null);
  };
  const updatePicker = (input: HTMLTextAreaElement, changed = false) => {
    if (browsing.current && !changed) return;
    browsing.current = false;
    if (
      composing.current ||
      dismissed.current === `${input.value}:${input.selectionStart}`
    )
      return;
    const next = assistantMentionQuery(
      input.value,
      input.selectionStart,
      input.selectionEnd,
    );
    setPicker(
      next &&
        !mentions.some(
          (mention) => next.start >= mention.start && next.start < mention.end,
        )
        ? next
        : null,
    );
  };
  const select = (target: AssistantMentionTarget) => {
    if (!picker || loading || !targets || composing.current) return;
    if (mentions.length >= ASSISTANT_MAX_MENTIONS) {
      setErrors([t("assistant.mentionLimit", { max: ASSISTANT_MAX_MENTIONS })]);
      return;
    }
    const next = insertAssistantMention(
      value,
      mentions,
      target,
      picker.start,
      picker.end,
    );
    if (next.text.length > 20_000) {
      setErrors([t("assistant.mentionTooLong")]);
      return;
    }
    const input = inputRef.current;
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(picker.start, picker.end);
    // Native insertion keeps text undo on browsers that support insertText.
    try {
      document.execCommand?.("insertText", false, `@${target.label} `);
    } catch {
      // Controlled insertion below also works when native insertText is unavailable.
    }
    edit.current = undefined;
    caret.current = next.caret;
    onChange(next.text, next.mentions);
    setPicker(null);
    browsing.current = false;
    dismissed.current = "";
  };
  const keepFocus = (event: React.MouseEvent) => event.preventDefault();
  return (
    <div className="assistant-compose-input assistant-mention-compose">
      <div className="assistant-mention-editor">
        {open ? (
          <div className="assistant-mention-picker">
            <div className="assistant-mention-picker-head">
              <div
                className="assistant-mention-categories"
                role="group"
                aria-label={t("assistant.mentionTypesAria")}
              >
                {(["all", "workspace", "agent"] as const).map((kind) => (
                  <button
                    type="button"
                    key={kind}
                    aria-pressed={category === kind}
                    onMouseDown={keepFocus}
                    onClick={() => setCategory(kind)}
                  >
                    {kind === "all"
                      ? t("assistant.mentionAll")
                      : kind === "workspace"
                        ? t("assistant.mentionWorkspaces")
                        : t("assistant.mentionAgents")}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="assistant-mention-close"
                aria-label={t("assistant.mentionCloseAria")}
                onMouseDown={keepFocus}
                onClick={close}
              >
                <X size={13} />
              </button>
            </div>
            <div
              ref={list}
              id={id}
              role="listbox"
              aria-label={t("assistant.mentionListAria")}
              aria-busy={loading}
              className="assistant-mention-options"
            >
              {candidates.map((target, index) => (
                <button
                  type="button"
                  role="option"
                  id={`${id}-${index}`}
                  key={assistantMentionKey(target)}
                  tabIndex={-1}
                  aria-selected={target === selected}
                  disabled={loading || !targets}
                  onMouseDown={keepFocus}
                  onClick={() => select(target)}
                >
                  {target.kind === "agent" ? (
                    <Bot size={15} />
                  ) : (
                    <Folder size={15} />
                  )}
                  <span>
                    <strong>{target.label}</strong>
                    <small>
                      {target.connection_label} &middot;{" "}
                      {target.workspace_label}
                      {target.kind === "agent"
                        ? ` / ${target.pane_id.slice(0, 8)}`
                        : ""}
                    </small>
                  </span>
                  <span className="assistant-mention-kind">
                    {target.kind === "agent"
                      ? target.agent
                      : t("assistant.mentionKindWorkspace")}
                  </span>
                </button>
              ))}
            </div>
            {loading ? (
              <p className="assistant-mention-notice" role="status">
                <LoaderCircle size={12} className="assistant-spinner" />{" "}
                {t("assistant.mentionLoading")}
              </p>
            ) : null}
            {!loading && !candidates.length && !errors.length ? (
              <p className="assistant-mention-notice" role="status">
                {t("assistant.mentionNoMatch")}
              </p>
            ) : null}
            {errors.map((error) => (
              <p className="assistant-mention-notice" role="status" key={error}>
                {error}
              </p>
            ))}
            {!loading && errors.length ? (
              <button
                type="button"
                className="assistant-mention-retry"
                onMouseDown={keepFocus}
                onClick={() => setRetry((count) => count + 1)}
              >
                <RefreshCw size={12} /> {t("needsYou.retry")}
              </button>
            ) : null}
            {truncated ? (
              <p className="assistant-mention-notice" role="status">
                {t("assistant.mentionTruncatedNote")}
              </p>
            ) : null}
            <div className="assistant-mention-picker-foot">
              {t("assistant.mentionFootNote")}
            </div>
          </div>
        ) : null}
        <textarea
          ref={inputRef}
          aria-label={t("assistant.messageRangerAria")}
          placeholder={t("assistant.messageRangerPlaceholder")}
          enterKeyHint={mobile ? "send" : undefined}
          rows={3}
          maxLength={20_000}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-activedescendant={
            open && selected && targets && !loading
              ? `${id}-${candidates.indexOf(selected)}`
              : undefined
          }
          onChange={() => {}}
          onInput={(event) => {
            const edited = edit.current;
            edit.current = undefined;
            dismissed.current = "";
            onChange(
              event.currentTarget.value,
              undefined,
              (event.nativeEvent as InputEvent).inputType,
              edited,
            );
            updatePicker(event.currentTarget, true);
          }}
          onSelect={(event) => updatePicker(event.currentTarget)}
          onCompositionStart={() => {
            composing.current = true;
            onCompositionChange(true);
            setPicker(null);
          }}
          onCompositionEnd={(event) => {
            composing.current = false;
            onCompositionChange(false);
            updatePicker(event.currentTarget);
          }}
          onKeyDown={(event) => {
            if (
              event.nativeEvent.isComposing ||
              composing.current ||
              event.keyCode === 229
            )
              return;
            if (open && event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            }
            if (
              open &&
              !event.shiftKey &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                event.stopPropagation();
                if (candidates.length)
                  setActive(
                    (index) =>
                      (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        candidates.length) %
                      candidates.length,
                  );
                return;
              }
              if (event.key === "Enter" || (event.key === "Tab" && selected)) {
                event.preventDefault();
                event.stopPropagation();
                if (selected && !event.repeat) select(selected);
                return;
              }
            }
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!event.repeat) onSubmit({ queue: event.altKey });
            }
          }}
        />
        <button
          type="button"
          className="assistant-mention-trigger"
          aria-label={t("assistant.mentionTriggerAria")}
          title={t("assistant.mentionTriggerTitle")}
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onMouseDown={keepFocus}
          onClick={() => {
            if (open) {
              close();
              return;
            }
            const input = inputRef.current;
            browsing.current = true;
            input?.focus({ preventScroll: true });
            setCategory("all");
            setPicker({
              start: input?.selectionStart ?? value.length,
              end: input?.selectionEnd ?? value.length,
              query: "",
            });
          }}
        >
          <AtSign size={15} />
        </button>
      </div>
      {mentions.length ? (
        <div
          className="assistant-mention-tray"
          aria-label={t("assistant.mentionTrayAria")}
        >
          {mentions.map((mention) => (
            <span
              className="assistant-mention-chip"
              key={`${mention.start}:${assistantMentionKey(mention)}`}
            >
              <button
                type="button"
                title={t("assistant.mentionChipTitle", {
                  kind:
                    mention.kind === "agent"
                      ? mention.agent
                      : t("assistant.mentionKindWorkspace"),
                  connection: mention.connection_label,
                  workspace: mention.workspace_label,
                })}
                onClick={() => onOpenMention(mention)}
              >
                {mention.kind === "agent" ? (
                  <Bot size={12} />
                ) : (
                  <Folder size={12} />
                )}
                <span>
                  {mention.label}
                  <small>
                    {mention.connection_label} / {mention.workspace_label}
                  </small>
                </span>
              </button>
              <button
                type="button"
                aria-label={t("assistant.removeReferenceAria", {
                  label: mention.label,
                })}
                onMouseDown={keepFocus}
                onClick={() =>
                  onChange(
                    value,
                    mentions.filter((ref) => ref !== mention),
                  )
                }
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
