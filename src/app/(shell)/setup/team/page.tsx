import { getCurrentUser } from "@/lib/auth";
import { getOrgUsers } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initialOf } from "@/lib/utils";

const ROLE_BADGE: Record<string, { label: string; variant: "positive" | "outline" | "neutral" }> = {
  admin: { label: "Super Admin", variant: "positive" },
  qa_reviewer: { label: "QA Reviewer", variant: "outline" },
  associate: { label: "Active", variant: "neutral" },
};

export default async function TeamPage() {
  const user = await getCurrentUser();
  const users = await getOrgUsers(user.orgId);
  const admins = users.filter((u) => u.role === "admin" || u.role === "qa_reviewer");
  const members = users.filter((u) => u.role === "associate");

  function UserRow({ u }: { u: (typeof users)[number] }) {
    const badge = ROLE_BADGE[u.role];
    return (
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
        <Avatar>
          <AvatarFallback>{initialOf(u.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">{u.name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Manage Team" description="The canonical agent roster — reused as Conversation/Contact Owner, Assignee, and in the Leaderboard." />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold">Admins</h2>
          <Card className="p-0">
            {admins.map((u) => (
              <UserRow key={u.id} u={u} />
            ))}
          </Card>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold">Members</h2>
          <Card className="p-0">
            {members.map((u) => (
              <UserRow key={u.id} u={u} />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
