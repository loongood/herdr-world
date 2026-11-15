/**
 * The app layer of the i18n module: the stored language preference, the
 * React hooks and the translate function the interface uses. The core
 * (`./core`) holds the dictionaries and the locale state, so headless model
 * modules can read translated words without a framework.
 */
import { useEffect, useSyncExternalStore } from "react";
import { subscribeLocalStorage, worldLocalStorage } from "../browserStorage";
import * as core from "./core";
import {
  HTML_LANG,
  type LanguagePreference,
  type Locale,
  normalizeLanguage,
  serializeLanguage,
} from "./locales";

export const LANGUAGE_KEY = core.LANGUAGE_KEY;

// The saved preference resolves the locale before the app mounts.
core.initializeLanguage(
  normalizeLanguage(worldLocalStorage.getItem(LANGUAGE_KEY)),
);

export async function setLanguage(next: LanguagePreference): Promise<void> {
  try {
    worldLocalStorage.setItem(LANGUAGE_KEY, serializeLanguage(next));
  } catch {
    // The in-memory preference still applies when storage is unavailable.
  }
  const target = await core.setLanguage(next);
  document.documentElement.lang = HTML_LANG[target];
}

/** A storage event from another tab: re-read and re-resolve. */
export function reloadLanguageFromStorage(): Promise<void> {
  return setLanguage(
    normalizeLanguage(worldLocalStorage.getItem(LANGUAGE_KEY)),
  );
}

export function useLocale(): Locale {
  // The locale is module state, so server rendering reads the same snapshot.
  return useSyncExternalStore(
    core.subscribe,
    core.getCurrentLocale,
    core.getCurrentLocale,
  );
}

/** The stored preference ("auto" or a locale) — what the switcher shows. */
export function useLanguage(): LanguagePreference {
  return useSyncExternalStore(
    core.subscribe,
    core.getLanguagePreference,
    core.getLanguagePreference,
  );
}

/** Reactive `t`: subscribes the caller so a language switch re-renders it. */
export function useT(): typeof core.t {
  useSyncExternalStore(
    core.subscribe,
    core.getCurrentLocale,
    core.getCurrentLocale,
  );
  return core.t;
}

/** App mounts this once: initial `<html lang>` plus cross-tab following. */
export function useLanguageSync(): Locale {
  const current = useLocale();
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[core.getCurrentLocale()];
    void core.restoreActiveDictionary();
    return subscribeLocalStorage((key) => {
      if (key !== LANGUAGE_KEY) return;
      void reloadLanguageFromStorage();
    });
  }, []);
  return current;
}

export const getCurrentLocale = core.getCurrentLocale;
export const getLanguagePreference = core.getLanguagePreference;
export const restoreActiveDictionary = core.restoreActiveDictionary;
export const t = core.t;
export type Translate = core.Translate;
export type { LanguagePreference, Locale };
export type { TranslationKey } from "./core";
export { isTranslationKey } from "./core";
