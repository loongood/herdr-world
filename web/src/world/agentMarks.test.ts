import { expect, test } from "bun:test";
import {
  AGENT_MARKS,
  agentMarkKind,
  agentMarkWord,
  agentStateWord,
} from "./agentMarks";

test("each state has one glyph and one word", () => {
  expect(
    Object.entries(AGENT_MARKS).map(([kind, glyph]) => [kind, glyph]),
  ).toEqual([
    ["working", "•"],
    ["needs", "!"],
    ["asks", "?"],
    ["done", "✓"],
    ["reviewed", "–"],
    ["idle", "–"],
    ["no-signal", "~"],
    ["offline", "×"],
  ]);
  // Only an owner question is ?, so no signal never reads as one.
  expect(
    Object.values(AGENT_MARKS).filter((glyph) => glyph === "?"),
  ).toHaveLength(1);
  expect(agentMarkWord("needs")).toBe("Needs you");
});

test("Herdr statuses map to marks; an ask and an offline host outrank them", () => {
  expect(agentMarkKind("working")).toBe("working");
  expect(agentMarkKind("blocked")).toBe("needs");
  expect(agentMarkKind("done")).toBe("done");
  expect(agentMarkKind("done", { reviewed: true })).toBe("reviewed");
  expect(agentMarkKind("idle")).toBe("idle");
  expect(agentMarkKind("unknown")).toBe("no-signal");
  expect(agentMarkKind(null)).toBe("no-signal");
  expect(agentMarkKind("working", { asking: true })).toBe("asks");
  expect(agentMarkKind("blocked", { asking: true, offline: true })).toBe(
    "offline",
  );
  expect(agentStateWord("blocked")).toBe("Needs you");
  expect(agentStateWord("idle", { asking: true })).toBe("Asks you");
});
