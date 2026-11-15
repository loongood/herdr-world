import { type TranslationKey, t } from "../../i18n";
import type { TownLensId } from "./townLens";

type LensNameKey = Extract<TranslationKey, `lens.name.${string}`>;
type LensHintKey = Extract<TranslationKey, `lens.hint.${string}`>;

/** Each lens's name, in the dictionary, so it can be translated. */
export const TOWN_LENS_NAME_KEYS: Record<TownLensId, LensNameKey> = {
  attention: "lens.name.attention",
  idle: "lens.name.idle",
  spend: "lens.name.spend",
  pulls: "lens.name.pulls",
  quests: "lens.name.quests",
  harness: "lens.name.harness",
};

/** What each lens shows, for the chooser and screen readers. */
export const TOWN_LENS_HINT_KEYS: Record<TownLensId, LensHintKey> = {
  attention: "lens.hint.attention",
  idle: "lens.hint.idle",
  spend: "lens.hint.spend",
  pulls: "lens.hint.pulls",
  quests: "lens.hint.quests",
  harness: "lens.hint.harness",
};

export function townLensName(id: TownLensId): string {
  return t(TOWN_LENS_NAME_KEYS[id]);
}

export function townLensHint(id: TownLensId): string {
  return t(TOWN_LENS_HINT_KEYS[id]);
}
