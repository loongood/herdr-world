import { t } from "./i18n/core";
import { CLAUDE_CODE_PROVIDER } from "../../shared/assistant";
import type { TranslationKey } from "./i18n/en";
import type {
  AssistantChatSelection,
  AssistantConfig,
  AssistantSnapshot,
  AssistantThinkingLevel,
} from "../../shared/assistant";

const thinkingLabelKeys: Record<AssistantThinkingLevel, TranslationKey> = {
  off: "assistant.thinkingOff",
  minimal: "assistant.thinkingMinimal",
  low: "assistant.thinkingLow",
  medium: "assistant.thinkingMedium",
  high: "assistant.thinkingHigh",
  xhigh: "assistant.thinkingExtraHigh",
  max: "assistant.thinkingMaximum",
};

/** The thinking level's display name in the active language. */
export function thinkingLabel(level: AssistantThinkingLevel): string {
  return t(thinkingLabelKeys[level]);
}

export function assistantChatSelection(
  snapshot: AssistantSnapshot,
): AssistantChatSelection {
  const { provider, model, credential_source, thinking_level } =
    snapshot.config;
  return {
    instance_id: snapshot.instance_id,
    provider,
    model,
    credential_source,
    ...(thinking_level ? { thinking_level } : {}),
  };
}

export function sameAssistantSelection(
  a: AssistantSnapshot,
  b: AssistantSnapshot,
) {
  return (
    JSON.stringify(assistantChatSelection(a)) ===
    JSON.stringify(assistantChatSelection(b))
  );
}

export function thinkingForModel(
  config: AssistantConfig,
  model: AssistantSnapshot["models"][number] | undefined,
): AssistantThinkingLevel | undefined {
  return config.thinking_level &&
    model?.thinking_levels?.includes(config.thinking_level)
    ? config.thinking_level
    : undefined;
}

export function thinkingOptions(
  model: AssistantSnapshot["models"][number] | undefined,
  config?: AssistantConfig,
) {
  const levels = model?.thinking_levels ?? [];
  return model?.default_thinking_level &&
    (levels.length > 1 ||
      (config?.thinking_level && !levels.includes(config.thinking_level)))
    ? [
        {
          value: "default",
          label: t("assistant.thinkingDefaultOption", {
            label: thinkingLabel(model.default_thinking_level),
          }),
        },
        ...levels.map((value) => ({ value, label: thinkingLabel(value) })),
      ]
    : [];
}

export function credentialStatus(
  provider: AssistantSnapshot["providers"][number],
) {
  if (provider.id === CLAUDE_CODE_PROVIDER)
    return provider.configured
      ? t("assistant.credentialBridgeSignIn")
      : t("assistant.credentialBridgeCommandMissing");
  if (!provider.configured) return t("assistant.credentialNone");
  return provider.credential_method === "oauth"
    ? t("assistant.credentialOauth")
    : provider.credential_method === "api_key"
      ? t("assistant.credentialApiKey")
      : t("assistant.credentialSaved");
}
