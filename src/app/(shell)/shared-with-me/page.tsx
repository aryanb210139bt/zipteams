import { PageHeader } from "@/components/shared/page-header";
import { TbdPanel } from "@/components/shared/tbd-panel";

export default function SharedWithMePage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Shared With Me" />
      <TbdPanel title="Nothing shared with you yet" note="This page wasn't captured from the source product's screenshots (PRD §2/§12)." />
    </div>
  );
}
