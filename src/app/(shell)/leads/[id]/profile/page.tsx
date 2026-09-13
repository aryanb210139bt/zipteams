import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getLeadDetail } from "@/lib/db/queries";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";

export default async function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getLeadDetail(id);
  if (!detail || detail.lead.orgId !== user.orgId) notFound();

  const company = detail.lead.companyId ? await db.query.companies.findFirst({ where: eq(t.companies.id, detail.lead.companyId) }) : null;
  const { lead } = detail;

  const fields: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email ?? "—"],
    ["Phone", lead.phone ?? "—"],
    ["Company", company?.name ?? "—"],
    ["Lead Stage", lead.leadStage.replace(/_/g, " ")],
    ["Lead Stage Category", lead.leadStageCategory.toUpperCase()],
    ["Disposition Status", lead.dispositionStatus ?? "—"],
    ["Email Status", lead.emailStatus ?? "—"],
    ["WhatsApp Status", lead.whatsappStatus ?? "—"],
    ["Created", new Date(lead.createdAt).toLocaleString()],
  ];

  return (
    <div className="p-4 md:p-6">
      <Card className="max-w-2xl">
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        The full custom-field schema for this tab wasn&apos;t captured from the source product (PRD §9.7) — this shows the
        structured fields the data model already tracks.
      </p>
    </div>
  );
}
