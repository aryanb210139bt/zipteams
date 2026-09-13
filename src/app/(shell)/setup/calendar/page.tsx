import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PROVIDERS = ["Google Calendar", "Outlook"];

export default function CalendarPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Sync your Calendar" description="Working hours and calendar sync for scheduling follow-up meetings." />
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:p-6">
        {PROVIDERS.map((name) => (
          <Card key={name} className="items-center gap-3 text-center">
            <span className="text-sm font-medium">{name}</span>
            <Button size="sm" className="w-full">
              Connect
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
