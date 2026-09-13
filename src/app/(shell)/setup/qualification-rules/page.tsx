import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { QualificationRulesPanel } from "@/components/setup/qualification-rules-panel";

export default async function QualificationRulesPage() {
  const user = await getCurrentUser();
  const rules = await db.select().from(t.qualificationRules).where(eq(t.qualificationRules.orgId, user.orgId));

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Qualification Rules" description="Eligibility/qualification logic extracted from calls — editable by admins." />
      <div className="p-4 md:p-6">
        <QualificationRulesPanel rules={rules} />
      </div>
    </div>
  );
}
