import { afterAll, expect, test } from "bun:test";
import type { Window as HappyWindow } from "happy-dom";

// Module state (current language, loaded dictionary) lives for the whole
// process, so the behavior runs in an isolated child with a fresh DOM.
if (process.env.HERDR_WORLD_I18N_DOM_TEST !== "1") {
  test("language module behavior in an isolated runtime", async () => {
    const child = Bun.spawn([process.execPath, "test", import.meta.path], {
      env: { ...process.env, HERDR_WORLD_I18N_DOM_TEST: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (code !== 0) throw new Error(`${stdout}\n${stderr}`);
    expect(code).toBe(0);
  }, 15_000);
} else {
  await registerDomTests();
}

async function registerDomTests() {
  const { Window } = await import("happy-dom");
  const browser = new Window({ url: "http://localhost" });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "StorageEvent",
    "localStorage",
    "sessionStorage",
  ] as const) {
    Object.defineProperty(globalThis, key, {
      value: key === "window" ? browser : browser[key as keyof typeof browser],
      writable: true,
      configurable: true,
    });
  }
  afterAll(async () => {
    await (browser as unknown as HappyWindow).happyDOM.close();
  });

  const { worldLocalStorage } = await import("../browserStorage");
  // A reload starts here: the saved preference already resolves the locale,
  // while the dictionary is still the static English one until it is
  // restored. Preset storage before importing the module.
  worldLocalStorage.setItem("language", "zh-Hans");
  const {
    getCurrentLocale,
    getLanguagePreference,
    reloadLanguageFromStorage,
    restoreActiveDictionary,
    setLanguage,
    t,
  } = await import("./index");

  test("restoreActiveDictionary loads the saved language after a reload", async () => {
    expect(getCurrentLocale()).toBe("zh-Hans");
    expect(getLanguagePreference()).toBe("zh-Hans");
    expect(t("config.title")).toBe("Configuration");
    await restoreActiveDictionary();
    expect(t("config.title")).toBe("设置");
    expect(t("views.town")).toBe("小镇");
  });

  test("reloads a stored preference over browser detection", async () => {
    worldLocalStorage.setItem("language", "zh-Hans");
    await reloadLanguageFromStorage();
    expect(getCurrentLocale()).toBe("zh-Hans");
    expect(t("config.title")).toBe("设置");
    expect(document.documentElement.lang).toBe("zh-CN");
  });

  test("setLanguage switches text, html lang and persists the choice", async () => {
    await setLanguage("zh-Hant");
    expect(getCurrentLocale()).toBe("zh-Hant");
    expect(t("config.title")).toBe("設定");
    expect(document.documentElement.lang).toBe("zh-TW");
    expect(getLanguagePreference()).toBe("zh-Hant");
    expect(worldLocalStorage.getItem("language")).toBe("zh-Hant");
  });

  test("t falls back to English on auto without Chinese browsers", async () => {
    await setLanguage("auto");
    expect(t("views.town")).toBe("Town");
    expect(document.documentElement.lang).toBe("en");
  });

  test("t interpolates named parameters", async () => {
    await setLanguage("zh-Hans");
    expect(t("views.goTo", { view: "看板" })).toBe("前往 看板");
    await setLanguage("en");
    expect(t("config.resetScale", { scale: 100 })).toBe(
      "Reset interface scale, currently 100%",
    );
  });

  test("reload honors cross-tab writes and removal", async () => {
    worldLocalStorage.setItem("language", "zh-Hans");
    await reloadLanguageFromStorage();
    expect(getCurrentLocale()).toBe("zh-Hans");
    expect(t("config.title")).toBe("设置");
    worldLocalStorage.removeItem("language");
    await reloadLanguageFromStorage();
    expect(getLanguagePreference()).toBe("auto");
  });
}
