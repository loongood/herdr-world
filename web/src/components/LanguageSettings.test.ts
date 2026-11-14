import { afterAll, afterEach, expect, test } from "bun:test";
import type { Root } from "react-dom/client";

if (process.env.HERDR_WORLD_LANGUAGE_DOM_TEST !== "1") {
  test("language controls in an isolated runtime", async () => {
    const child = Bun.spawn([process.execPath, "test", import.meta.path], {
      env: { ...process.env, HERDR_WORLD_LANGUAGE_DOM_TEST: "1" },
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
    "HTMLInputElement",
    "HTMLSelectElement",
    "Element",
    "Node",
    "Event",
    "EventTarget",
    "KeyboardEvent",
    "MouseEvent",
    "localStorage",
    "sessionStorage",
  ] as const) {
    Object.defineProperty(globalThis, key, {
      value: key === "window" ? browser : browser[key as keyof typeof browser],
      writable: true,
      configurable: true,
    });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const { act, createElement: h } = await import("react");
  const { createRoot } = await import("react-dom/client");
  let root: Root | null = null;
  let container: HTMLDivElement;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = null;
    document.body.replaceChildren();
    await browser.happyDOM.whenAsyncComplete();
  });
  afterAll(async () => {
    await browser.happyDOM.close();
  });

  async function mount() {
    const { LanguageSettings } = await import("./LanguageSettings");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(h(LanguageSettings)));
  }

  const select = () => container.querySelector("select")!;

  test("renders the switcher with per-language option names", async () => {
    await mount();
    expect(select()).toBeDefined();
    const values = [...select().options].map((option) => option.value);
    expect(values).toEqual(["auto", "en", "zh-Hans", "zh-Hant"]);
    expect([...select().options].map((option) => option.textContent)).toEqual([
      "Automatic (browser)",
      "English",
      "简体中文",
      "繁體中文",
    ]);
  });

  test("switching persists the choice and updates html lang", async () => {
    await mount();
    // setLanguage is fire-and-forget from onChange; the dictionary import
    // settles on a macrotask, so pump the loop inside act before asserting.
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    await act(async () => {
      select().value = "zh-Hans";
      select().dispatchEvent(new Event("change", { bubbles: true }));
      await settle();
    });
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(
      (globalThis as { localStorage: Storage }).localStorage.getItem(
        "herdr-world:foundation-v2:language",
      ),
    ).toBe("zh-Hans");
    await act(async () => {
      select().value = "en";
      select().dispatchEvent(new Event("change", { bubbles: true }));
      await settle();
    });
    expect(document.documentElement.lang).toBe("en");
  });
}
