import { describe, expect, test } from "bun:test";
import { t } from "./i18n";
import {
  buildGitFileMenuItems,
  buildGitRepoMenuItems,
  countWorkingEntries,
  gitFileConfirmCopy,
  gitFolderConfirmCopy,
  gitRepoConfirmCopy,
} from "./gitActions";
import type { GitDiffEntry } from "./types";

function entry(kind: GitDiffEntry["kind"]): GitDiffEntry {
  return { path: "src/a.ts", kind, status: kind };
}

describe("buildGitFileMenuItems", () => {
  test("untracked files get stage and delete", () => {
    expect(buildGitFileMenuItems([entry("untracked")])).toEqual([
      { action: "stage", label: t("worktree.stageFile") },
      {
        action: "delete_untracked",
        label: t("worktree.deleteUntracked"),
        danger: true,
        destructive: true,
      },
    ]);
  });

  test("unstaged files get stage and discard", () => {
    expect(buildGitFileMenuItems([entry("unstaged")])).toEqual([
      { action: "stage", label: t("worktree.stageChanges") },
      {
        action: "discard_unstaged",
        label: t("worktree.discardUnstaged"),
        danger: true,
        destructive: true,
      },
    ]);
  });

  test("staged files get unstage only", () => {
    expect(buildGitFileMenuItems([entry("staged")])).toEqual([
      { action: "unstage", label: t("worktree.unstageChanges") },
    ]);
  });

  test("staged + unstaged files get both parts covered", () => {
    expect(buildGitFileMenuItems([entry("staged"), entry("unstaged")])).toEqual(
      [
        { action: "stage", label: t("worktree.stageChanges") },
        { action: "unstage", label: t("worktree.unstageChanges") },
        {
          action: "discard_unstaged",
          label: t("worktree.discardUnstaged"),
          danger: true,
          destructive: true,
        },
      ],
    );
  });

  test("conflicted files get mark resolved", () => {
    expect(buildGitFileMenuItems([entry("conflicted")])).toEqual([
      { action: "stage", label: t("worktree.markResolved") },
    ]);
  });

  test("plural labels for folder menus", () => {
    expect(
      buildGitFileMenuItems(
        [entry("staged"), entry("unstaged"), entry("untracked")],
        true,
      ),
    ).toEqual([
      { action: "stage", label: t("worktree.stageFiles") },
      { action: "unstage", label: t("worktree.unstageAllChanges") },
      {
        action: "discard_unstaged",
        label: t("worktree.discardAllUnstaged"),
        danger: true,
        destructive: true,
      },
      {
        action: "delete_untracked",
        label: t("worktree.deleteUntrackedFiles"),
        danger: true,
        destructive: true,
      },
    ]);
  });
});

describe("countWorkingEntries", () => {
  test("counts only working-tree kinds", () => {
    expect(
      countWorkingEntries([
        entry("staged"),
        entry("unstaged"),
        entry("unstaged"),
        entry("untracked"),
        entry("conflicted"),
        entry("branch"),
        entry("last-step"),
      ]),
    ).toEqual({ staged: 1, unstaged: 2, untracked: 1, conflicted: 1 });
  });
});

describe("buildGitRepoMenuItems", () => {
  test("derives affected counts per action", () => {
    const items = buildGitRepoMenuItems({
      staged: 2,
      unstaged: 3,
      untracked: 4,
      conflicted: 1,
    });
    expect(items.map((item) => [item.action, item.count])).toEqual([
      ["stage_all", 8],
      ["unstage_all", 2],
      ["discard_all_unstaged", 3],
      ["delete_all_untracked", 4],
    ]);
    expect(items[2]).toMatchObject({ danger: true, destructive: true });
    expect(items[3]).toMatchObject({ danger: true, destructive: true });
  });
});

describe("confirm copy", () => {
  test("only destructive file actions confirm", () => {
    expect(gitFileConfirmCopy("stage", "a.ts")).toBeNull();
    expect(gitFileConfirmCopy("discard_unstaged", "a.ts")).toMatchObject({
      confirmLabel: t("worktree.confirmDiscard"),
    });
    expect(gitFileConfirmCopy("delete_untracked", "a.ts")).toMatchObject({
      confirmLabel: t("worktree.confirmDelete"),
    });
  });

  test("repo confirmations mention kept work", () => {
    expect(gitRepoConfirmCopy("stage_all", 3)).toBeNull();
    expect(gitRepoConfirmCopy("discard_all_unstaged", 2)?.message).toBe(
      t("worktree.discardRepoMessage", {
        files: t("worktree.fileCount", { count: 2 }),
      }),
    );
    expect(gitRepoConfirmCopy("delete_all_untracked", 1)?.message).toContain(
      t("worktree.oneFile"),
    );
  });

  test("folder confirmations name the directory and file count", () => {
    expect(gitFolderConfirmCopy("stage", "src", 2)).toBeNull();
    const copy = gitFolderConfirmCopy("discard_unstaged", "src/app", 3);
    expect(copy?.message).toBe(
      t("worktree.discardFolderMessage", {
        files: t("worktree.fileCount", { count: 3 }),
        path: "src/app",
      }),
    );
    expect(
      gitFolderConfirmCopy("delete_untracked", "src", 1)?.message,
    ).toContain(t("worktree.oneFile"));
  });
});
