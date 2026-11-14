import { useEffect, useSyncExternalStore } from "react";
import { subscribeLocalStorage, worldLocalStorage } from "../browserStorage";
import {
  type Dictionary,
  en,
  isTranslationKey,
  type TranslationKey,
} from "./en";
import {
  HTML_LANG,
  type LanguagePreference,
  type Locale,
  normalizeLanguage,
  resolveLocale,
  serializeLanguage,
} from "./locales";

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

let preference: LanguagePreference = normalizeLanguage(
  worldLocalStorage.getItem(LANGUAGE_KEY),
);
let locale: Locale = resolveLocale(preference, navigatorLanguages());
let dictionary: Dictionary = en;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentLocale(): Locale {
  return locale;
}

export function getLanguagePreference(): LanguagePreference {
  return preference;
}

export async function setLanguage(next: LanguagePreference): Promise<void> {
  preference = next;
  try {
    worldLocalStorage.setItem(LANGUAGE_KEY, serializeLanguage(next));
  } catch {
    // The in-memory preference still applies when storage is unavailable.
  }
  const target = resolveLocale(next, navigatorLanguages());
  dictionary = await loadDictionary(target);
  locale = target;
  document.documentElement.lang = HTML_LANG[target];
  emit();
}

/** A storage event from another tab: re-read and re-resolve. */
export function reloadLanguageFromStorage(): Promise<void> {
  return setLanguage(
    normalizeLanguage(worldLocalStorage.getItem(LANGUAGE_KEY)),
  );
}

/**
 * Loads the active locale's dictionary after a page reload. The module starts
 * on the static English dictionary even when a Chinese preference is saved,
 * so the app mounts this once alongside `useLanguageSync`.
 */
export function restoreActiveDictionary(): Promise<void> {
  const active = getCurrentLocale();
  if (active === "en") return Promise.resolve();
  return loadDictionary(active).then((loaded) => {
    if (dictionary !== loaded) {
      dictionary = loaded;
      emit();
    }
  });
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
  const value = lookup(dictionary, key) ?? lookup(en, key) ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getCurrentLocale);
}

/** The stored preference ("auto" or a locale) — what the switcher shows. */
export function useLanguage(): LanguagePreference {
  return useSyncExternalStore(subscribe, getLanguagePreference);
}

/** Reactive `t`: subscribes the caller so a language switch re-renders it. */
export function useT(): typeof t {
  useSyncExternalStore(subscribe, getCurrentLocale);
  return t;
}

/** App mounts this once: initial `<html lang>` plus cross-tab following. */
export function useLanguageSync(): Locale {
  const current = useLocale();
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[getCurrentLocale()];
    void restoreActiveDictionary();
    return subscribeLocalStorage((key) => {
      if (key !== LANGUAGE_KEY) return;
      void reloadLanguageFromStorage();
    });
  }, []);
  return current;
}

export type { LanguagePreference, Locale, TranslationKey };
export { isTranslationKey };
