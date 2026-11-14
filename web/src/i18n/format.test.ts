import { afterAll, expect, test } from "bun:test";

// Formatter caching follows the module-level language state, so the
// behavior runs in an isolated child with a fresh DOM.
if (process.env.HERDR_WORLD_I18N_DOM_TEST !== "1") {
  test("date formatting follows the interface language", async () => {
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
  await registerFormatTests();
}

async function registerFormatTests() {
  const { Window } = await import("happy-dom");
  const browser = new Window({ url: "http://localhost" });
  for (const key of [
    "window",
    "document",
    "navigator",
    "localStorage",
  ] as const) {
    Object.defineProperty(globalThis, key, {
      value: key === "window" ? browser : browser[key as keyof typeof browser],
      writable: true,
      configurable: true,
    });
  }
  afterAll(async () => {
    await browser.happyDOM.close();
  });

  const { setLanguage } = await import("./index");
  const { formatDateTime, formatRelativeTime, uiLocale } = await import(
    "./format"
  );

  // Local morning on a fixed date: the rendered string depends on the
  // locale, not the machine's time zone. Morning avoids ICU's "noon"
  // special casing (中午/上午).
  const moment = new Date(2026, 10, 14, 9, 30);

  test("uses en-US formatting for English", async () => {
    await setLanguage("en");
    expect(uiLocale()).toBe("en-US");
    expect(formatDateTime(moment)).toBe("Nov 14, 2026, 9:30 AM");
  });

  test("uses zh-CN formatting for Simplified Chinese", async () => {
    await setLanguage("zh-Hans");
    expect(uiLocale()).toBe("zh-CN");
    expect(formatDateTime(moment)).toBe("2026年11月14日 09:30");
    expect(formatRelativeTime(-3, "minute")).toBe("3分钟前");
  });

  test("uses zh-TW formatting for Traditional Chinese", async () => {
    await setLanguage("zh-Hant");
    expect(uiLocale()).toBe("zh-TW");
    expect(formatDateTime(moment)).toBe("2026年11月14日 上午9:30");
    expect(formatRelativeTime(-3, "minute")).toBe("3 分鐘前");
  });

  test("returns invalid input unchanged", async () => {
    await setLanguage("en");
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });
}
