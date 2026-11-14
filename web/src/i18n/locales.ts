/** Supported interface languages. English is the baseline dictionary. */
export const LOCALES = ["en", "zh-Hans", "zh-Hant"] as const;
export type Locale = (typeof LOCALES)[number];
export type LanguagePreference = Locale | "auto";

/**
 * Switcher options. Each language names itself, so the list reads the same
 * in every interface language; "auto" is translated where it is shown.
 */
export const LANGUAGE_OPTIONS: readonly {
  value: LanguagePreference;
  label: string;
}[] = [
  { value: "auto", label: "Automatic" },
  { value: "en", label: "English" },
  { value: "zh-Hans", label: "简体中文" },
  { value: "zh-Hant", label: "繁體中文" },
];

/** BCP 47 tags for `<html lang>`, so screen readers and fonts follow along. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
};

/** BCP 47 tags handed to Intl formatters. */
export const INTL_TAGS: Record<Locale, string> = {
  en: "en-US",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
};

export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const tag = language.toLowerCase();
    if (
      tag === "zh-tw" ||
      tag === "zh-hk" ||
      tag === "zh-mo" ||
      tag.startsWith("zh-hant")
    )
      return "zh-Hant";
    if (tag.startsWith("zh")) return "zh-Hans";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export function normalizeLanguage(value: string | null): LanguagePreference {
  return value !== null && (LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : "auto";
}

export function serializeLanguage(value: LanguagePreference): string {
  return value;
}

export function resolveLocale(
  preference: LanguagePreference,
  languages: readonly string[],
): Locale {
  return preference === "auto" ? detectLocale(languages) : preference;
}

export function htmlLangFor(locale: Locale): string {
  return HTML_LANG[locale];
}
