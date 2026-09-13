import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { CustomFieldsPanel } from "@/components/setup/custom-fields-panel";

export default async function CustomFieldsPage() {
  const user = await getCurrentUser();
  const fields = await db.select().from(t.dataCaptureFields).where(eq(t.dataCaptureFields.orgId, user.orgId)).orderBy(t.dataCaptureFields.sortOrder);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Manage Custom Field" description="The BANT + custom extraction schema applied to every conversation via AI (PRD §9.5)." />
      <div className="p-4 md:p-6">
        <CustomFieldsPanel fields={fields} />
      </div>
    </div>
  );
}
