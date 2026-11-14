import { describe, expect, test } from "bun:test";
import { zhHans } from "./zh-Hans";
import { zhHant } from "./zh-Hant";

function leafValues(node: unknown, path = ""): [string, unknown][] {
  if (typeof node === "string") return [[path, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(
    ([key, value]) => leafValues(value, path ? `${path}.${key}` : key),
  );
}

describe.each([
  ["zh-Hans", zhHans],
  ["zh-Hant", zhHant],
] as const)("%s dictionary", (_name, dictionary) => {
  test("translates every English leaf with non-empty text", () => {
    const leaves = leafValues(dictionary);
    expect(leaves.length).toBeGreaterThan(40);
    for (const [, value] of leaves) {
      expect(typeof value === "string" && value.trim().length > 0).toBe(true);
    }
  });

  test("renders the view names from the terminology table", () => {
    expect(dictionary.views.town.length).toBeGreaterThan(0);
    expect(dictionary.views.board.length).toBeGreaterThan(0);
    expect(dictionary.views.desk.length).toBeGreaterThan(0);
    expect(dictionary.views.spaces.length).toBeGreaterThan(0);
  });
});
