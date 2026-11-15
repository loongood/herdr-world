import { t, type TranslationKey } from "../../i18n";

type KindKey = Extract<TranslationKey, `groups.kind.${string}`>;
type KindPluralKey = Extract<TranslationKey, `groups.kindPlural.${string}`>;
type KindNameKey = Extract<TranslationKey, `groups.kindName.${string}`>;
type StatusKey = Extract<TranslationKey, `groups.status.${string}`>;
type RoleKey = Extract<TranslationKey, `groups.role.${string}`>;
type ResolutionKey = Extract<TranslationKey, `groups.resolution.${string}`>;
type OpKey = Extract<TranslationKey, `groups.op.${string}`>;

const KIND_KEYS: Record<string, KindKey> = {
  all: "groups.kind.all",
  pod: "groups.kind.pod",
  team: "groups.kind.team",
  room: "groups.kind.room",
  desk: "groups.kind.desk",
};
const KIND_PLURAL_KEYS: Record<string, KindPluralKey> = {
  all: "groups.kindPlural.all",
  pod: "groups.kindPlural.pod",
  team: "groups.kindPlural.team",
  room: "groups.kindPlural.room",
  desk: "groups.kindPlural.desk",
};
const KIND_NAME_KEYS: Record<string, KindNameKey> = {
  pod: "groups.kindName.pod",
  team: "groups.kindName.team",
  room: "groups.kindName.room",
  desk: "groups.kindName.desk",
};
const STATUS_KEYS: Record<string, StatusKey> = {
  needs_you: "groups.status.needsYou",
  failed: "groups.status.failed",
  working: "groups.status.working",
  finished: "groups.status.finished",
  quiet: "groups.status.quiet",
  unknown: "groups.status.unknown",
};
const ROLE_KEYS: Record<string, RoleKey> = {
  lead: "groups.role.lead",
  builder: "groups.role.builder",
  reviewer: "groups.role.reviewer",
};
const RESOLUTION_KEYS: Record<string, ResolutionKey> = {
  present: "groups.resolution.present",
  away: "groups.resolution.away",
  ambiguous: "groups.resolution.ambiguous",
};
const OP_KEYS: Record<string, OpKey> = {
  create: "groups.op.create",
  join: "groups.op.join",
  leave: "groups.op.leave",
  set_roles: "groups.op.setRoles",
  set_attrs: "groups.op.setAttrs",
  delete: "groups.op.delete",
  promote: "groups.op.promote",
  interest: "groups.op.interest",
};

/** The display name of a Group kind ("Pod", "Team", …). */
export function groupKindLabel(kind: string): string {
  const key = KIND_KEYS[kind];
  return key ? t(key) : `${kind[0]?.toUpperCase()}${kind.slice(1)}`;
}

/** The plural display name used by empty-state sentences. */
export function groupKindPlural(kind: string): string {
  const key = KIND_PLURAL_KEYS[kind];
  return key ? t(key) : `${kind}s`;
}

/** The inline, lowercase kind name used inside sentences. */
export function groupKindName(kind: string): string {
  const key = KIND_NAME_KEYS[kind];
  return key ? t(key) : kind;
}

/** The shared agent status words a Group counts its members by. */
export function groupStatusLabel(status: string): string {
  const key = STATUS_KEYS[status];
  return key ? t(key) : status;
}

/** The role a member holds in its Group. */
export function groupRoleLabel(role: string): string {
  const key = ROLE_KEYS[role];
  return key ? t(key) : role;
}

/** How confidently the World knows a member's current session. */
export function groupResolutionLabel(resolution: string): string {
  const key = RESOLUTION_KEYS[resolution];
  return key ? t(key) : resolution;
}

/** The recorded Board operation, without its "group." prefix. */
export function groupOpLabel(op: string): string {
  const name = op.replace("group.", "");
  const key = OP_KEYS[name];
  return key ? t(key) : name.replace(/_/g, " ");
}
