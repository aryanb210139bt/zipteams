import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function MyProfilePage() {
  const user = await getCurrentUser();
  const [first, ...rest] = user.name.split(" ");

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="My Profile" />
      <div className="p-4 md:p-6">
        <Card className="max-w-2xl">
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First Name" defaultValue={first} />
            <Field label="Last Name" defaultValue={rest.join(" ")} />
            <Field label="Email" defaultValue={user.email} disabled />
            <Field label="Employee ID" placeholder="—" />
            <Field label="Phone Number" placeholder="+91 " />
            <Field label="Time Zone" defaultValue="Asia/Kolkata" />
            <Field label="Languages used on calls" placeholder="English, Hindi" />
            <Field label="Preferred workspace" defaultValue="Default" disabled />
            <div className="sm:col-span-2">
              <Button type="button" variant="teal">
                Save
              </Button>
            </div>
          </form>
        </Card>
        <p className="mt-3 max-w-2xl text-xs text-muted-foreground">
          Profile edits aren&apos;t persisted in this scaffold (no dedicated users-settings table yet) — this mirrors the
          source product&apos;s field layout (PRD §10.2) so the form is ready to wire up.
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
