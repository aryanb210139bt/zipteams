import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { LeadsquaredForm } from "@/components/setup/leadsquared-form";

export default async function LeadsquaredPage() {
  const user = await getCurrentUser();
  const org = await db.query.organizations.findFirst();
  if (!org || org.id !== user.orgId) return null;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Leadsquared" description="Connect your CRM to receive automated score/verdict activity on each lead." />
      <div className="p-4 md:p-6">
        <LeadsquaredForm config={org.leadsquaredConfig} />
      </div>
    </div>
  );
}
