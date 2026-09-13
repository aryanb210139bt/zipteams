import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CONNECT = ["CallHippo", "Ozonetel", "TeleCMI"];
const COMING_SOON = ["3CX", "Aircall", "CallRail"];

export default function CallingSoftwarePage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Connect your calling software" />
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:p-6">
        {CONNECT.map((name) => (
          <Card key={name} className="items-center gap-3 text-center">
            <span className="text-sm font-medium">{name}</span>
            <Button size="sm" className="w-full">
              Connect
            </Button>
          </Card>
        ))}
        {COMING_SOON.map((name) => (
          <Card key={name} className="items-center gap-3 text-center opacity-60">
            <span className="text-sm font-medium">{name}</span>
            <Badge variant="neutral" className="w-full justify-center py-1.5">
              Coming Soon
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
