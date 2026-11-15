import type { AssistantSnapshot } from "../../../shared/assistant";
import {
  assistantChatSelection,
  thinkingForModel,
  thinkingLabel,
  thinkingOptions,
} from "../assistantModels";
import { useT } from "../i18n";
import { ThemedSelect } from "./ThemedSelect";
import "./AssistantChatControls.css";

export function AssistantChatControls({
  snapshot,
  disabled,
  mobile,
  onChange,
  onSelectedClose,
}: {
  snapshot: AssistantSnapshot;
  disabled: boolean;
  mobile: boolean;
  onChange: (params: Record<string, unknown>) => void;
  onSelectedClose: () => void;
}) {
  const config = snapshot.config;
  const modelKey = (provider: string, id: string) =>
    JSON.stringify([provider, id]);
  const models = snapshot.models.filter((model) =>
    snapshot.providers.some(
      (provider) => provider.id === model.provider && provider.configured,
    ),
  );
  const current = models.find(
    (model) => model.provider === config.provider && model.id === config.model,
  );
  const options = models.map((model) => ({
    value: modelKey(model.provider, model.id),
    label: model.label,
    detail:
      snapshot.providers.find((provider) => provider.id === model.provider)
        ?.label ?? model.provider,
    keywords: [model.id, model.provider],
  }));
  const efforts = thinkingOptions(current, config);
  const staleEffort =
    !!config.thinking_level &&
    !!current?.thinking_levels &&
    !current.thinking_levels.includes(config.thinking_level);
  const effective = config.thinking_level ?? current?.default_thinking_level;
  const supported = snapshot.chat_selection === true;
  const t = useT();
  const unavailable = !supported
    ? t("assistant.controlsUpdateNeeded")
    : !models.length
      ? t("assistant.controlsConnectProvider")
      : t("assistant.chooseModel");
  return (
    <div
      className="assistant-chat-controls"
      aria-label={t("assistant.controlsAria")}
    >
      <ThemedSelect
        value={modelKey(config.provider, config.model)}
        options={options}
        aria-label={t("assistant.chatModelAria")}
        title={
          current
            ? t("assistant.chatModelTitle", {
                label: current.label,
                provider: current.provider,
              })
            : unavailable
        }
        placeholder={
          current?.label ??
          (config.model
            ? t("assistant.modelUnavailable", { model: config.model })
            : unavailable)
        }
        disabled={disabled || !supported || !models.length}
        className="assistant-chat-model"
        contentClassName={`assistant-chat-select ${mobile ? "is-mobile" : ""}`}
        side="top"
        searchPlaceholder={t("assistant.searchModels")}
        onSelectedClose={onSelectedClose}
        onChange={(value) => {
          const model = models.find(
            (model) => modelKey(model.provider, model.id) === value,
          );
          if (!model || value === modelKey(config.provider, config.model))
            return;
          onChange({
            provider: model.provider,
            model: model.id,
            thinking_level: thinkingForModel(config, model) ?? null,
            expected: assistantChatSelection(snapshot),
          });
        }}
      />
      <ThemedSelect
        value={config.thinking_level ?? "default"}
        options={efforts}
        aria-label={t("assistant.thinkingEffortAria")}
        title={
          efforts.length
            ? t("assistant.effortTitleNext")
            : current
              ? t("assistant.effortTitleNone")
              : unavailable
        }
        placeholder={
          staleEffort
            ? t("assistant.effortUnavailable", {
                label: thinkingLabel(config.thinking_level!),
              })
            : effective
              ? t("assistant.effortPrefix", {
                  label: thinkingLabel(effective),
                })
              : t("assistant.effortUnavailableShort")
        }
        disabled={disabled || !supported || !efforts.length}
        className="assistant-chat-effort"
        contentClassName={`assistant-chat-select ${mobile ? "is-mobile" : ""}`}
        side="top"
        onSelectedClose={onSelectedClose}
        onChange={(value) => {
          if (value === (config.thinking_level ?? "default")) return;
          onChange({
            provider: config.provider,
            model: config.model,
            thinking_level: value === "default" ? null : value,
            expected: assistantChatSelection(snapshot),
          });
        }}
      />
      {snapshot.running ? (
        <span className="assistant-chat-next" role="status">
          {t("assistant.nextMessage")}
        </span>
      ) : null}
    </div>
  );
}
