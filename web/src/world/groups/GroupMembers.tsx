import { useState } from "react";
import { AgentIcon } from "../../components/AgentIcon";
import { useT } from "../../i18n";
import {
  groupKindName,
  groupResolutionLabel,
  groupRoleLabel,
} from "./groupLabels";
import { parseGroupRef, type GroupRef } from "../../../../shared/groups";
import type {
  GroupTerminalObservation,
  GroupView,
  GroupViewMember,
} from "../../../../shared/groupViews";
import {
  groupMemberEdit,
  type GroupEditPlan,
  memberRef,
  selectedMemberRef,
} from "./groupActions";
import { GroupEditFeedback } from "./GroupEditFeedback";

export function MemberPortrait({
  member,
  reviewer = false,
  harness,
}: {
  member: GroupViewMember;
  reviewer?: boolean;
  harness?(terminal: GroupTerminalObservation): string | undefined;
}) {
  const t = useT();
  return (
    <span
      className={`group-portrait${reviewer ? " is-reviewer" : ""}${member.resolution === "present" ? "" : " is-away"}`}
      title={`${member.label} · ${reviewer ? t("groups.reviewerTitle") : member.roles.map(groupRoleLabel).join(", ") || t("groups.memberTitle")} · ${groupResolutionLabel(member.resolution)}`}
    >
      <AgentIcon
        compact
        agent={member.matches[0] && harness?.(member.matches[0])}
      />
    </span>
  );
}

export function GroupMembers({
  group,
  groups,
  terminals,
  busy,
  revision,
  onPlan,
  onError,
  onOpen,
  harness,
}: {
  group: GroupView;
  groups: readonly GroupView[];
  terminals: readonly GroupTerminalObservation[];
  busy: boolean;
  revision: number;
  onPlan(plan: GroupEditPlan): void;
  onError(message: string): void;
  onOpen(terminal: GroupTerminalObservation): void;
  harness(terminal: GroupTerminalObservation): string | undefined;
}) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<{
    terminal: GroupTerminalObservation;
    ref: GroupRef;
  } | null>(null);
  const [addRevision, setAddRevision] = useState(revision);
  const [addError, setAddError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("builder");
  const [editing, setEditing] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleRevision, setRoleRevision] = useState(revision);
  const [roleError, setRoleError] = useState<string | null>(null);
  const t = useT();
  const sections =
    group.kind === "pod" ? ["lead", "builder", "reviewer", "other"] : ["other"];
  const apply = (action: () => void, onFailure: (message: string) => void) => {
    try {
      action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onError(message);
      onFailure(message);
    }
  };
  const eligible = terminals.filter(
    (terminal) =>
      group.kind !== "team" ||
      !group.members.length ||
      (typeof group.members[0]!.ref !== "string" &&
        group.members[0]!.ref.connection_id === terminal.connectionId),
  );
  return (
    <section className="group-members" aria-label={t("groups.membersAria")}>
      <div className="group-section-heading">
        <h3>{t("groups.membersTitle")}</h3>
        {group.stored && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setAdding(!adding);
              setAddRevision(revision);
              setAddError(null);
              setSelected(null);
              setAddress("");
            }}
          >
            {t("groups.add")}
          </button>
        )}
      </div>
      {adding && (
        <form
          className="group-edit"
          onSubmit={(event) => {
            event.preventDefault();
            apply(() => {
              if (!address.trim() && selected)
                selectedMemberRef(group, selected.terminal, eligible);
              const ref = address.trim()
                ? parseGroupRef(address.trim())
                : selected?.ref;
              if (!ref) throw new Error(t("groups.chooseAgent"));
              const plan = groupMemberEdit(
                group,
                ref,
                group.kind === "team" ? [] : [role],
                groups,
              );
              onPlan({
                ...plan,
                revision: addRevision,
                onComplete: (error) => {
                  setAddError(error);
                  if (!error) {
                    setAdding(false);
                    setAddress("");
                    setSelected(null);
                  }
                },
              });
            }, setAddError);
          }}
        >
          <GroupEditFeedback
            error={addError}
            changed={revision !== addRevision}
            current={t("groups.currentMembers", {
              group: group.name,
              members:
                group.members
                  .map(
                    (member) =>
                      `${member.label}${member.roles.length ? ` (${member.roles.map(groupRoleLabel).join(", ")})` : ""}`,
                  )
                  .join("; ") || t("groups.currentNone"),
            })}
            onReview={() => {
              setAddRevision(revision);
              setAddError(null);
            }}
          />
          <label>
            {t("groups.currentAgent")}
            <select
              value={
                selected
                  ? `${selected.terminal.connectionId}\0${selected.terminal.terminalId}`
                  : ""
              }
              onChange={(event) => {
                setSelected(null);
                setAddError(null);
                const terminal = eligible.find(
                  (entry) =>
                    `${entry.connectionId}\0${entry.terminalId}` ===
                    event.target.value,
                );
                if (terminal)
                  apply(
                    () =>
                      setSelected({
                        terminal: { ...terminal },
                        ref: memberRef(group, terminal, terminals),
                      }),
                    setAddError,
                  );
              }}
            >
              <option value="">{t("groups.choose")}</option>
              {eligible.map((terminal) => (
                <option
                  key={`${terminal.connectionId}\0${terminal.terminalId}`}
                  value={`${terminal.connectionId}\0${terminal.terminalId}`}
                >
                  {terminal.name ?? terminal.terminalId} ·{" "}
                  {terminal.connectionId} · {terminal.deskId}
                </option>
              ))}
            </select>
          </label>
          {group.kind === "pod" && (
            <>
              <label>
                {t("groups.qualifiedAddress")}
                <input
                  value={address}
                  placeholder="agent://connection-a/name"
                  onChange={(event) => setAddress(event.target.value)}
                />
              </label>
              <label>
                {t("groups.roleLabel")}
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  {["builder", "lead", "reviewer"].map((role) => (
                    <option key={role}>{groupRoleLabel(role)}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button disabled={busy}>{t("groups.addMember")}</button>
          <button type="button" onClick={() => setAdding(false)}>
            {t("common.cancel")}
          </button>
        </form>
      )}
      {group.owner === "herdr" && (
        <p className="group-hint">{t("groups.herdrOwned")}</p>
      )}
      {sections.map((section) => {
        const members = group.members.filter((member) =>
          section === "other"
            ? group.kind !== "pod" ||
              !member.roles.some((role) =>
                ["lead", "builder", "reviewer"].includes(role),
              )
            : member.roles.includes(section),
        );
        return members.length ? (
          <div key={section}>
            <h4>
              {section === "other"
                ? t("groups.membersTitle")
                : section === "lead"
                  ? t("groups.sectionLead")
                  : section === "builder"
                    ? t("groups.sectionBuilders")
                    : t("groups.sectionReviewers")}
            </h4>
            {members.map((member) => {
              const key = JSON.stringify(member.ref);
              const ref = member.ref as GroupRef;
              return (
                <div
                  className={`group-member${member.resolution === "away" ? " is-away" : ""}`}
                  key={key}
                >
                  <MemberPortrait
                    member={member}
                    reviewer={section === "reviewer"}
                    harness={harness}
                  />
                  <div className="group-member-name">
                    <b title={member.label}>{member.label}</b>
                    <small>
                      {member.resolution === "ambiguous"
                        ? t("groups.memberAmbiguous", {
                            count: member.matches.length,
                            name: member.label,
                          })
                        : member.resolution === "away"
                          ? t("groups.memberAway")
                          : t("groups.memberPresent")}
                    </small>
                  </div>
                  {member.matches.map((match) => (
                    <button
                      key={`${match.connectionId}\0${match.paneId}`}
                      type="button"
                      onClick={() => onOpen(match)}
                    >
                      {member.resolution === "ambiguous"
                        ? t("groups.inspect", {
                            connection: match.connectionId,
                            pane: match.paneId,
                          })
                        : t("groups.open")}
                    </button>
                  ))}
                  {group.stored && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          onPlan({
                            ops: [
                              { op: "group.leave", id: group.id, refs: [ref] },
                            ],
                            confirmation: member.roles.some((role) =>
                              ["lead", "reviewer"].includes(role),
                            )
                              ? t("groups.removeConfirm", {
                                  member: member.label,
                                  roles: member.roles
                                    .map(groupRoleLabel)
                                    .join(", "),
                                  group: group.name,
                                })
                              : undefined,
                          })
                        }
                      >
                        {t("groups.removeFrom", {
                          kind: groupKindName(group.kind),
                        })}
                      </button>
                      {group.kind === "pod" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditing(key);
                            setRoles([...member.roles]);
                            setRoleRevision(revision);
                            setRoleError(null);
                          }}
                        >
                          {t("groups.roles")}
                        </button>
                      )}
                      {editing === key && (
                        <form
                          className="group-role-edit"
                          onSubmit={(event) => {
                            event.preventDefault();
                            apply(() => {
                              onPlan({
                                ...groupMemberEdit(
                                  group,
                                  ref,
                                  roles,
                                  groups,
                                  true,
                                ),
                                revision: roleRevision,
                                onComplete: (error) => {
                                  setRoleError(error);
                                  if (!error) setEditing(null);
                                },
                              });
                            }, setRoleError);
                          }}
                        >
                          <GroupEditFeedback
                            error={roleError}
                            changed={revision !== roleRevision}
                            current={t("groups.currentRoles", {
                              member: member.label,
                              roles:
                                member.roles.map(groupRoleLabel).join(", ") ||
                                t("groups.currentNone"),
                            })}
                            onReview={() => {
                              setRoleRevision(revision);
                              setRoleError(null);
                            }}
                          />
                          {[
                            ...new Set([
                              "lead",
                              "builder",
                              "reviewer",
                              ...member.roles,
                            ]),
                          ].map((role) => (
                            <label key={role}>
                              <input
                                type="checkbox"
                                checked={roles.includes(role)}
                                onChange={(event) =>
                                  setRoles(
                                    event.target.checked
                                      ? [...roles, role]
                                      : roles.filter((value) => value !== role),
                                  )
                                }
                              />
                              {groupRoleLabel(role)}
                            </label>
                          ))}
                          <button disabled={busy}>
                            {t("groups.saveRoles")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                          >
                            {t("common.cancel")}
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : null;
      })}
      {!group.members.length && (
        <p className="group-hint">{t("groups.noMembers")}</p>
      )}
    </section>
  );
}
