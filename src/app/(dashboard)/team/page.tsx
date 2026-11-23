import type { Metadata } from "next";
import { ActionButton } from "@/components/app/action-button";
import { BackendRequired } from "@/components/app/backend-required";
import { PageHeader } from "@/components/app/page-header";
import { RecordCount } from "@/components/app/record-count";
import { StatusPill } from "@/components/app/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  InviteMemberForm,
  MemberRoleForm,
} from "@/features/team/components/team-forms";
import {
  removeMember,
  revokeInvitation,
} from "@/features/team/actions";
import { getTeam } from "@/features/team/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Team",
};

export default async function TeamPage() {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Team"
        description="Store memberships, invitations, roles, and the activity log."
      />
    );
  }

  const context = await requireMemberContext();
  const canManage = can(context.membership.role, "team:manage");
  const team = await getTeam(context.membership.storeId);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Team"
        description="Roles are enforced by the server and RLS. Admins cannot grant ownership."
        status={
          <RecordCount value={team.members.length} label="members" />
        }
      />

      {canManage ? (
        <section
          aria-labelledby="invite-title"
          className="flex flex-col gap-3 border-y border-border py-4"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="invite-title" className="text-sm font-semibold">
              Invite a member
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              Invitations are one-time links hashed in the database. No email is
              sent by the app.
            </p>
          </div>
          <InviteMemberForm />
        </section>
      ) : null}

      <section aria-labelledby="members-title" className="flex flex-col gap-3">
        <h2 id="members-title" className="text-sm font-semibold">
          Members
        </h2>
        <div className="ledger-table">
          <Table className="min-w-0 sm:min-w-[36rem] lg:min-w-[44rem]">
            <TableHeader className="bg-secondary/55">
              <TableRow>
                <TableHead scope="col">Member</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">Role</TableHead>
                <TableHead scope="col" className="hidden sm:table-cell">Status</TableHead>
                <TableHead scope="col" className="hidden sm:table-cell">Joined</TableHead>
                {canManage ? <TableHead scope="col">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.map((member) => {
                const isSelf = member.userId === context.userId;
                return (
                  <TableRow key={member.id} className="h-13">
                    <TableCell className="max-w-[11rem] md:max-w-none">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {member.name}
                          {isSelf ? (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {member.email}
                        </span>
                        <span className="mt-1 sm:hidden">
                          <StatusPill
                            label={member.status}
                            tone={
                              member.status === "active" ? "success" : "warning"
                            }
                          />
                        </span>
                        <div className="mt-2 md:hidden">
                          {canManage && !isSelf ? (
                            <MemberRoleForm
                              memberId={member.id}
                              role={member.role}
                              canGrantOwner={context.membership.role === "owner"}
                            />
                          ) : (
                            <span className="text-xs capitalize text-muted-foreground">
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {canManage && !isSelf ? (
                        <MemberRoleForm
                          memberId={member.id}
                          role={member.role}
                          canGrantOwner={context.membership.role === "owner"}
                        />
                      ) : (
                        <span className="text-sm capitalize">{member.role}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusPill
                        label={member.status}
                        tone={member.status === "active" ? "success" : "warning"}
                      />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    {canManage ? (
                      <TableCell>
                        {!isSelf ? (
                          <ActionButton
                            action={removeMember}
                            payload={{ memberId: member.id }}
                            label="Remove"
                            pendingLabel="Removing"
                            variant="ghost"
                            destructive
                            confirm={{
                              title: `Remove ${member.name}?`,
                              description:
                                "This revokes access to the store immediately. The last owner cannot be removed.",
                              confirmLabel: "Remove member",
                            }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {canManage ? (
        <>
          <section
            aria-labelledby="invitations-title"
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="invitations-title" className="text-sm font-semibold">
                Invitations
              </h2>
              <p className="text-xs text-muted-foreground">
                Pending links expire after 7 days and are bound to the invited
                email.
              </p>
            </div>
            {team.invitations.length === 0 ? (
              <p className="border-y border-dashed border-border py-6 text-sm text-muted-foreground">
                No invitations yet.
              </p>
            ) : (
              <div className="ledger-table">
                <Table className="min-w-0 sm:min-w-[32rem] lg:min-w-[42rem]">
                  <TableHeader className="bg-secondary/55">
                    <TableRow>
                      <TableHead scope="col">Email</TableHead>
                      <TableHead scope="col">Role</TableHead>
                      <TableHead scope="col" className="hidden sm:table-cell">Status</TableHead>
                      <TableHead scope="col" className="hidden sm:table-cell">Expires</TableHead>
                      <TableHead scope="col">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.invitations.map((invitation) => (
                      <TableRow key={invitation.id} className="h-12">
                        <TableCell className="text-xs">
                          {invitation.email}
                        </TableCell>
                        <TableCell className="text-xs capitalize">
                          {invitation.role}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            label={invitation.displayStatus}
                            tone={
                              invitation.displayStatus === "pending"
                                ? "warning"
                                : invitation.displayStatus === "accepted"
                                  ? "success"
                                  : "neutral"
                            }
                          />
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                          {formatDate(invitation.expires_at)}
                        </TableCell>
                        <TableCell>
                          {invitation.displayStatus === "pending" ? (
                            <ActionButton
                              action={revokeInvitation}
                              payload={{ invitationId: invitation.id }}
                              label="Revoke"
                              pendingLabel="Revoking"
                              variant="ghost"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section aria-labelledby="activity-title" className="flex flex-col gap-3">
            <h2 id="activity-title" className="text-sm font-semibold">
              Activity
            </h2>
            {team.activity.length === 0 ? (
              <p className="border-y border-dashed border-border py-6 text-sm text-muted-foreground">
                No recorded activity yet.
              </p>
            ) : (
              <ul className="flex flex-col border-y border-border">
                {team.activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5 text-xs last:border-0"
                  >
                    <span>
                      <span className="font-medium">{entry.actorName}</span>{" "}
                      <span className="text-muted-foreground">
                        {entry.action.replaceAll(".", " ").replaceAll("_", " ")}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        · {entry.entity_type}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
