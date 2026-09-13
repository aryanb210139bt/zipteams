import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INTEGRATION_CONFIG } from "../integration-config";

export default async function IntegrationProviderPage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const config = INTEGRATION_CONFIG[provider];
  if (!config) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={`Connect your ${config.title}`} description={config.subtitle} />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 md:p-6">
        {config.connect.map((name) => (
          <Card key={name} className="items-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-sm font-semibold">{name.slice(0, 2)}</div>
            <span className="text-sm font-medium">{name}</span>
            <Button size="sm" className="w-full">
              Connect
            </Button>
          </Card>
        ))}
        {config.comingSoon.map((name) => (
          <Card key={name} className="items-center gap-3 text-center opacity-60">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-sm font-semibold">{name.slice(0, 2)}</div>
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
