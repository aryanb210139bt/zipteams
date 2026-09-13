import { getCurrentUser } from "@/lib/auth";
import { getFilterOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { UploadForm } from "@/components/upload/upload-form";

export default async function UploadPage() {
  const user = await getCurrentUser();
  const { associates } = await getFilterOptions(user.orgId);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader title="Upload Calls" description="Bulk CSV upload or a single call — either kicks off the same async pipeline." />
      <div className="p-4 md:p-6">
        <UploadForm associates={associates} />
      </div>
    </div>
  );
}
