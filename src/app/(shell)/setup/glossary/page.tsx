import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { GlossaryPanel } from "@/components/setup/glossary-panel";

export default async function GlossaryPage() {
  const user = await getCurrentUser();
  const terms = await db.select().from(t.glossaryTerms).where(eq(t.glossaryTerms.orgId, user.orgId));

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Glossary / Auto-correct" description="Custom vocabulary fed to the transcription word-boost list, and a post-transcription find/replace pass." />
      <div className="p-4 md:p-6">
        <GlossaryPanel terms={terms} />
      </div>
    </div>
  );
}
