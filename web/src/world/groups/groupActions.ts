import { t } from "../../i18n";
import { groupKindLabel, groupStatusLabel } from "./groupLabels";
import type { GroupOp } from "../../../../shared/groupOps";
import {
  agentAddress,
  parseAgentAddress,
  groupRefKey,
  hasExclusivePodRole,
  parseGroupRef,
  type GroupRef,
} from "../../../../shared/groups";
import {
  type GroupView,
  type GroupViewMember,
  type GroupTerminalObservation,
} from "../../../../shared/groupViews";

export const WORLD_GROUPS_OPEN_EVENT = "herdr-world:groups-open";
export function openGroups(key?: string) {
  window.dispatchEvent(
    new CustomEvent(WORLD_GROUPS_OPEN_EVENT, { detail: key }),
  );
}
export const groupTitle = (group: Pick<GroupView, "kind" | "name">) =>
  `${groupKindLabel(group.kind)} · ${group.name}`;
export const groupStatusText = (group: GroupView) =>
  Object.entries(group.counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) =>
      t("groups.countStatus", { count, status: groupStatusLabel(status) }),
    )
    .join(" · ") || t("groups.statusUnknown");
export const groupPrText = (group: GroupView) => {
  if (group.workState === "unknown") return t("groups.prUnknown");
  const count = `${group.openPullRequests.length}${group.openPrLimit === null ? "" : `/${group.openPrLimit}`}`;
  return group.workState === "stale"
    ? t("groups.openPrsCached", { count })
    : t("groups.openPrs", { count });
};
export function memberRef(
  group: GroupView,
  terminal: GroupTerminalObservation,
  terminals: readonly GroupTerminalObservation[],
): GroupRef {
  if (group.owner !== "world")
    throw new Error(t("groups.errors.herdrMembership"));
  if (group.kind === "team")
    return {
      connection_id: terminal.connectionId,
      terminal_id: terminal.terminalId,
    };
  if (!terminal.name) throw new Error(t("groups.errors.noHerdrName"));
  if (
    terminals.filter(
      (entry) =>
        entry.connectionId === terminal.connectionId &&
        entry.name === terminal.name,
    ).length !== 1
  )
    throw new Error(t("groups.errors.duplicateName"));
  return agentAddress(terminal.connectionId, terminal.name);
}
/** Revalidate the selection's captured identity rather than adopting a new occupant. */
export function selectedMemberRef(
  group: GroupView,
  selected: GroupTerminalObservation,
  terminals: readonly GroupTerminalObservation[],
): GroupRef {
  const matches = terminals.filter(
    (terminal) =>
      terminal.connectionId === selected.connectionId &&
      terminal.generation === selected.generation &&
      terminal.terminalId === selected.terminalId &&
      terminal.paneId === selected.paneId &&
      terminal.name === selected.name &&
      (terminal.sessionFingerprint ?? null) ===
        (selected.sessionFingerprint ?? null),
  );
  if (matches.length !== 1) throw new Error(t("groups.errors.agentChanged"));
  return memberRef(group, selected, terminals);
}
export type GroupEditPlan = {
  ops: GroupOp[];
  confirmation?: string;
  replace?: boolean;
  revision?: number;
  /** Forms keep their draft until the revision-bound write returns successfully. */
  onComplete?(error: string | null): void;
};
export function groupMemberEdit(
  group: GroupView,
  ref: GroupRef,
  roles: string[],
  groups: readonly GroupView[],
  edit = false,
): GroupEditPlan {
  if (!group.stored) throw new Error(t("groups.errors.herdrMembershipShort"));
  const parsed = parseGroupRef(ref);
  if (group.kind === "pod" && typeof parsed !== "string")
    throw new Error(t("groups.errors.podNeedsAddress"));
  if (group.kind === "team" && (typeof parsed === "string" || roles.length))
    throw new Error(t("groups.errors.teamNeedsTerminal"));
  const conflict =
    group.kind === "pod" && hasExclusivePodRole(roles)
      ? groups.find(
          (other) =>
            other.id !== group.id &&
            other.kind === "pod" &&
            other.members.some(
              (member) =>
                groupRefKey(member.ref as GroupRef) === groupRefKey(parsed) &&
                hasExclusivePodRole(member.roles),
            ),
        )
      : undefined;
  const op: GroupOp = edit
    ? { op: "group.set_roles", id: group.id, refs: [parsed], roles }
    : { op: "group.join", id: group.id, refs: [parsed], roles };
  return {
    ops: [op],
    ...(conflict
      ? {
          replace: true,
          confirmation: t("groups.errors.exclusiveRole", {
            agent:
              typeof parsed === "string"
                ? parseAgentAddress(parsed).name
                : t("groups.errors.thisAgent"),
            group: conflict.name,
          }),
        }
      : {}),
  };
}
export function confirmedGroupOps(plan: GroupEditPlan): GroupOp[] {
  return plan.ops.map((op) => ({
    ...op,
    ...((op.op === "group.join" ||
      op.op === "group.set_roles" ||
      op.op === "group.promote") &&
    plan.replace === true
      ? { replace: true }
      : {}),
    sender: { basis: "unknown", via: "browser" },
  }));
}
export function groupPromotion(
  group: GroupView,
  name: string,
  groups: readonly GroupView[],
): GroupEditPlan {
  if (group.kind !== "team" || !group.stored)
    throw new Error(t("groups.errors.onlyStoredTeam"));
  const mapping = group.members.map((member: GroupViewMember) => {
    const match =
      member.resolution === "present" && member.matches.length === 1
        ? member.matches[0]
        : undefined;
    if (
      !match?.name ||
      typeof member.ref === "string" ||
      "tab_id" in member.ref
    )
      throw new Error(t("groups.errors.teamMembersNamed"));
    const to = agentAddress(match.connectionId, match.name);
    if (
      groups.some(
        (pod) =>
          pod.kind === "pod" &&
          pod.members.some(
            (entry) => entry.ref === to && hasExclusivePodRole(entry.roles),
          ),
      )
    )
      throw new Error(
        t("groups.errors.podRoleConflict", { agent: match.name }),
      );
    return { from: member.ref, to, roles: ["builder"] };
  });
  return {
    ops: [{ op: "group.promote", id: group.id, name, mapping }],
    confirmation: t("groups.errors.promoteConfirm", {
      name,
      mapping:
        mapping
          .map((entry) => `${entry.from.terminal_id} → ${entry.to}`)
          .join("; ") || t("groups.errors.emptyTeam"),
    }),
  };
}
