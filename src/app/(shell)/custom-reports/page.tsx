import { PageHeader } from "@/components/shared/page-header";
import { TbdPanel } from "@/components/shared/tbd-panel";

export default function CustomReportsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Custom Reports" />
      <TbdPanel title="No custom reports yet" note="This page wasn't captured from the source product's screenshots (PRD §2/§12)." />
    </div>
  );
}
