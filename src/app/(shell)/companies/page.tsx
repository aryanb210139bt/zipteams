import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function CompaniesPage() {
  const user = await getCurrentUser();
  const companies = await db.select().from(t.companies).where(eq(t.companies.orgId, user.orgId));

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Companies" description="Top-level B2B accounts — this page's full layout wasn't captured from the source product (PRD §2)." />
      <div className="p-4 md:p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
