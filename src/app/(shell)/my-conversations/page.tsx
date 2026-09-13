import { getCurrentUser } from "@/lib/auth";
import { getLeadsTable } from "@/lib/db/queries";
import { parsePage } from "@/lib/filters";
import { PageHeader } from "@/components/shared/page-header";
import { LeadsTable } from "@/components/leads/leads-table";
import { Pagination } from "@/components/shared/pagination";

export default async function MyConversationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const page = parsePage(sp);
  const leadsTable = await getLeadsTable(user.orgId, { associateIds: [user.id] }, page, 10);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader title="My Conversations" description="Leads owned by you." />
      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-border bg-card">
          <LeadsTable rows={leadsTable.rows} />
          <Pagination page={leadsTable.page} pageSize={leadsTable.pageSize} total={leadsTable.total} />
        </div>
      </div>
    </div>
  );
}
