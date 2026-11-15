/**
 * The i18n core: the dictionaries, the active locale and the translate
 * function. It has no React and no browser storage, so headless model modules
 * (the Town scene) can read translated words without pulling a framework into
 * their module graph. The app layer (`./index`) owns the stored preference
 * and the React hooks.
 */
import {
  type Dictionary,
  en,
  isTranslationKey,
  type TranslationKey,
} from "./en";
import { type LanguagePreference, type Locale, resolveLocale } from "./locales";

export const LANGUAGE_KEY = "language";

// English ships statically so the interface can always render; the Chinese
// dictionaries load on demand and never enter the first paint bundle.
const loaded: Partial<Record<Locale, Dictionary>> = { en };
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => en,
  "zh-Hans": async () => (await import("./zh-Hans")).zhHans,
  "zh-Hant": async () => (await import("./zh-Hant")).zhHant,
};

async function loadDictionary(target: Locale): Promise<Dictionary> {
  const cached = loaded[target];
  if (cached) return cached;
  try {
    const dictionary = await loaders[target]();
    loaded[target] = dictionary;
    return dictionary;
  } catch (error) {
    console.warn(
      `i18n: dictionary for ${target} failed to load; using English`,
      error,
    );
    return en;
  }
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  const languages = navigator.languages;
  if (languages && languages.length > 0) return languages;
  return navigator.language ? [navigator.language] : [];
}

let preference: LanguagePreference = "auto";
let locale: Locale = resolveLocale(preference, navigatorLanguages());
let dictionary: Dictionary = en;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** The app layer subscribes here, so a language switch re-renders it. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function getCurrentLocale(): Locale {
  return locale;
}

export function getLanguagePreference(): LanguagePreference {
  return preference;
}

/**
 * The stored preference, resolved at start-up: the locale is known before the
 * dictionary loads, so the first paint already names the right language.
 */
export function initializeLanguage(next: LanguagePreference): void {
  preference = next;
  locale = resolveLocale(next, navigatorLanguages());
  emit();
}

/** The chosen language: its locale, its dictionary and the listeners. */
export async function setLanguage(next: LanguagePreference): Promise<Locale> {
  preference = next;
  const target = resolveLocale(next, navigatorLanguages());
  dictionary = await loadDictionary(target);
  locale = target;
  emit();
  return target;
}

/**
 * Loads the active locale's dictionary after a page reload. The module starts
 * on the static English dictionary even when a Chinese preference is saved,
 * so the app mounts this once alongside `useLanguageSync`.
 */
export async function restoreActiveDictionary(): Promise<void> {
  if (locale === "en") return;
  const restored = await loadDictionary(locale);
  if (dictionary !== restored) {
    dictionary = restored;
    emit();
  }
}

function lookup(source: Dictionary, key: string): string | null {
  let node: unknown = source;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node))
      return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : null;
}

export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  // A key that is not a string never names a translation: the caller
  // mistyped it or looked one up in the prototype. Show nothing rather than
  // take the page down.
  if (typeof key !== "string") return "";
  const value = lookup(dictionary, key) ?? lookup(en, key) ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** The translate function's shape, for modules that take one as an argument. */
export type Translate = typeof t;

export type { LanguagePreference, Locale, TranslationKey };
export { isTranslationKey };
