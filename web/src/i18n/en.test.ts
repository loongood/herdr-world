import { describe, expect, test } from "bun:test";
import { en, isTranslationKey } from "./en";

function leafEntries(node: unknown, path = ""): string[] {
  if (typeof node === "string") return [path];
  return Object.entries(node as Record<string, unknown>).flatMap(
    ([key, value]) => leafEntries(value, path ? `${path}.${key}` : key),
  );
}

describe("baseline dictionary", () => {
  test("every leaf is a non-empty string", () => {
    const leaves = leafEntries(en).map(
      (key) =>
        [
          key,
          key
            .split(".")
            .reduce<unknown>(
              (node, part) => (node as Record<string, unknown>)[part],
              en,
            ),
        ] as const,
    );
    expect(leaves.length).toBeGreaterThan(40);
    for (const [, value] of leaves) {
      expect(typeof value === "string" && value.length > 0).toBe(true);
    }
  });

  test("recognizes key paths and rejects unknown ones", () => {
    expect(isTranslationKey("config.title")).toBe(true);
    expect(isTranslationKey("views.town")).toBe(true);
    expect(isTranslationKey("status.syncFailed")).toBe(true);
    expect(isTranslationKey("config.nope")).toBe(false);
    expect(isTranslationKey("views")).toBe(false);
  });
});
