import { describe, expect, test } from "bun:test";
import {
  detectLocale,
  htmlLangFor,
  normalizeLanguage,
  resolveLocale,
  serializeLanguage,
} from "./locales";

describe("locale detection", () => {
  test("maps Chinese region and script tags to the matching script", () => {
    expect(detectLocale(["zh-TW"])).toBe("zh-Hant");
    expect(detectLocale(["zh-HK"])).toBe("zh-Hant");
    expect(detectLocale(["zh-MO"])).toBe("zh-Hant");
    expect(detectLocale(["zh-Hant-TW"])).toBe("zh-Hant");
    expect(detectLocale(["zh-CN"])).toBe("zh-Hans");
    expect(detectLocale(["zh-SG"])).toBe("zh-Hans");
    expect(detectLocale(["zh"])).toBe("zh-Hans");
  });

  test("maps English and falls back to English for unknown languages", () => {
    expect(detectLocale(["en-US"])).toBe("en");
    expect(detectLocale(["en"])).toBe("en");
    expect(detectLocale(["fr-FR"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });

  test("honors the user's language order", () => {
    expect(detectLocale(["fr-FR", "zh-CN"])).toBe("zh-Hans");
    expect(detectLocale(["en-GB", "zh-TW"])).toBe("en");
    expect(detectLocale(["zh-TW", "en-US"])).toBe("zh-Hant");
  });
});

describe("language preference normalization", () => {
  test("keeps stored locales and auto", () => {
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("zh-Hans")).toBe("zh-Hans");
    expect(normalizeLanguage("zh-Hant")).toBe("zh-Hant");
    expect(normalizeLanguage("auto")).toBe("auto");
  });

  test("falls back to auto for missing or unknown values", () => {
    expect(normalizeLanguage(null)).toBe("auto");
    expect(normalizeLanguage("")).toBe("auto");
    expect(normalizeLanguage("fr")).toBe("auto");
    expect(normalizeLanguage("zh")).toBe("auto");
  });

  test("serializes back to storage values", () => {
    expect(serializeLanguage("auto")).toBe("auto");
    expect(serializeLanguage("zh-Hant")).toBe("zh-Hant");
  });
});

describe("preference resolution", () => {
  test("auto defers to detected languages", () => {
    expect(resolveLocale("auto", ["zh-TW"])).toBe("zh-Hant");
    expect(resolveLocale("auto", ["en-US"])).toBe("en");
    expect(resolveLocale("auto", [])).toBe("en");
  });

  test("an explicit choice overrides detection", () => {
    expect(resolveLocale("zh-Hans", ["en-US"])).toBe("zh-Hans");
    expect(resolveLocale("en", ["zh-TW"])).toBe("en");
  });
});

describe("document language tags", () => {
  test("maps locales to BCP 47 document tags", () => {
    expect(htmlLangFor("en")).toBe("en");
    expect(htmlLangFor("zh-Hans")).toBe("zh-CN");
    expect(htmlLangFor("zh-Hant")).toBe("zh-TW");
  });
});
