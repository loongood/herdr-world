import type { GitDiffEntry } from "./types";
import { t } from "./i18n";

export type GitFileAction =
  | "stage"
  | "unstage"
  | "discard_unstaged"
  | "delete_untracked";

export type GitRepoAction =
  | "stage_all"
  | "unstage_all"
  | "discard_all_unstaged"
  | "delete_all_untracked";

export type GitFileMenuItem = {
  action: GitFileAction;
  label: string;
  danger?: boolean;
  destructive?: boolean;
};

export type GitRepoMenuItem = {
  action: GitRepoAction;
  label: string;
  count: number;
  danger?: boolean;
  destructive?: boolean;
};

export type GitWorkingCounts = {
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
};

// Builds the Git menu for one changed file from every summary entry sharing
// its path, so combined states (staged + unstaged) get the matching actions.
// `plural` rewords labels for folder menus acting on many files at once.
export function buildGitFileMenuItems(
  entries: Pick<GitDiffEntry, "kind">[],
  plural = false,
): GitFileMenuItem[] {
  const kinds = new Set(entries.map((entry) => entry.kind));
  const items: GitFileMenuItem[] = [];
  if (kinds.has("untracked")) {
    items.push({
      action: "stage",
      label: plural ? t("worktree.stageFiles") : t("worktree.stageFile"),
    });
  } else if (kinds.has("conflicted")) {
    items.push({
      action: "stage",
      label: plural
        ? t("worktree.markAllResolved")
        : t("worktree.markResolved"),
    });
  } else if (kinds.has("unstaged")) {
    items.push({
      action: "stage",
      label: plural
        ? t("worktree.stageAllChanges")
        : t("worktree.stageChanges"),
    });
  }
  if (kinds.has("staged")) {
    items.push({
      action: "unstage",
      label: plural
        ? t("worktree.unstageAllChanges")
        : t("worktree.unstageChanges"),
    });
  }
  if (kinds.has("unstaged")) {
    items.push({
      action: "discard_unstaged",
      label: plural
        ? t("worktree.discardAllUnstaged")
        : t("worktree.discardUnstaged"),
      danger: true,
      destructive: true,
    });
  }
  if (kinds.has("untracked")) {
    items.push({
      action: "delete_untracked",
      label: plural
        ? t("worktree.deleteUntrackedFiles")
        : t("worktree.deleteUntracked"),
      danger: true,
      destructive: true,
    });
  }
  return items;
}

export function countWorkingEntries(entries: GitDiffEntry[]): GitWorkingCounts {
  const counts: GitWorkingCounts = {
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0,
  };
  for (const entry of entries) {
    if (
      entry.kind === "staged" ||
      entry.kind === "unstaged" ||
      entry.kind === "untracked" ||
      entry.kind === "conflicted"
    ) {
      counts[entry.kind] += 1;
    }
  }
  return counts;
}

export function buildGitRepoMenuItems(
  counts: GitWorkingCounts,
): GitRepoMenuItem[] {
  return [
    {
      action: "stage_all",
      label: t("worktree.repoStageAll"),
      count: counts.unstaged + counts.untracked + counts.conflicted,
    },
    {
      action: "unstage_all",
      label: t("worktree.repoUnstageAll"),
      count: counts.staged,
    },
    {
      action: "discard_all_unstaged",
      label: t("worktree.repoDiscardAllUnstaged"),
      count: counts.unstaged,
      danger: true,
      destructive: true,
    },
    {
      action: "delete_all_untracked",
      label: t("worktree.repoDeleteAllUntracked"),
      count: counts.untracked,
      danger: true,
      destructive: true,
    },
  ];
}

export function gitFileActionSuccessMessage(action: GitFileAction) {
  switch (action) {
    case "stage":
      return t("worktree.fileStaged");
    case "unstage":
      return t("worktree.changesUnstaged");
    case "discard_unstaged":
      return t("worktree.unstagedDiscarded");
    case "delete_untracked":
      return t("worktree.untrackedDeleted");
  }
}

export function gitRepoActionSuccessMessage(action: GitRepoAction) {
  switch (action) {
    case "stage_all":
      return t("worktree.allChangesStaged");
    case "unstage_all":
      return t("worktree.allChangesUnstaged");
    case "discard_all_unstaged":
      return t("worktree.allUnstagedDiscarded");
    case "delete_all_untracked":
      return t("worktree.allUntrackedDeleted");
  }
}

export function gitFileActionLabel(action: GitFileAction) {
  switch (action) {
    case "stage":
      return t("worktree.actionStage");
    case "unstage":
      return t("worktree.actionUnstage");
    case "discard_unstaged":
      return t("worktree.actionDiscardUnstaged");
    case "delete_untracked":
      return t("worktree.actionDeleteUntracked");
  }
}

export function gitFileConfirmCopy(action: GitFileAction, path: string) {
  switch (action) {
    case "discard_unstaged":
      return {
        title: t("worktree.discardChangesTitle"),
        message: t("worktree.discardFileMessage", { path }),
        confirmLabel: t("worktree.confirmDiscard"),
      };
    case "delete_untracked":
      return {
        title: t("worktree.deleteUntrackedFileTitle"),
        message: t("worktree.deleteFileMessage", { path }),
        confirmLabel: t("worktree.confirmDelete"),
      };
    default:
      return null;
  }
}

export function gitFolderConfirmCopy(
  action: GitFileAction,
  path: string,
  count: number,
) {
  const files =
    count === 1 ? t("worktree.oneFile") : t("worktree.fileCount", { count });
  switch (action) {
    case "discard_unstaged":
      return {
        title: t("worktree.discardChangesTitle"),
        message: t("worktree.discardFolderMessage", { files, path }),
        confirmLabel: t("worktree.confirmDiscard"),
      };
    case "delete_untracked":
      return {
        title: t("worktree.deleteUntrackedFilesTitle"),
        message: t("worktree.deleteFolderMessage", { files, path }),
        confirmLabel: t("worktree.confirmDelete"),
      };
    default:
      return null;
  }
}

export function gitRepoConfirmCopy(action: GitRepoAction, count: number) {
  const files =
    count === 1 ? t("worktree.oneFile") : t("worktree.fileCount", { count });
  switch (action) {
    case "discard_all_unstaged":
      return {
        title: t("worktree.discardAllUnstagedTitle"),
        message: t("worktree.discardRepoMessage", { files }),
        confirmLabel: t("worktree.confirmDiscardAll"),
      };
    case "delete_all_untracked":
      return {
        title: t("worktree.deleteAllUntrackedTitle"),
        message: t("worktree.deleteRepoMessage", { files }),
        confirmLabel: t("worktree.confirmDeleteAll"),
      };
    default:
      return null;
  }
}
