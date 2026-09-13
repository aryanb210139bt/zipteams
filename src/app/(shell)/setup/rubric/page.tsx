import { eq, asc, inArray } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { RubricEditor } from "@/components/setup/rubric-editor";

export default async function RubricPage() {
  const user = await getCurrentUser();
  const categories = await db.select().from(t.rubricCategories).where(eq(t.rubricCategories.orgId, user.orgId)).orderBy(asc(t.rubricCategories.sortOrder));
  const categoryIds = categories.map((c) => c.id);
  const parameters = categoryIds.length
    ? await db.select().from(t.rubricParameters).where(inArray(t.rubricParameters.categoryId, categoryIds)).orderBy(asc(t.rubricParameters.sortOrder))
    : [];

  const categoriesWithParams = categories.map((c) => ({ ...c, parameters: parameters.filter((p) => p.categoryId === c.id) }));

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Rubric Editor" description="Add, edit, and reweight the audit rubric's categories and parameters." />
      <div className="p-4 md:p-6">
        <RubricEditor categories={categoriesWithParams} />
      </div>
    </div>
  );
}
