import { MessageCircle } from "lucide-react";

export default function LeadWhatsAppPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <MessageCircle className="size-8 text-muted-foreground" />
      <h2 className="text-sm font-semibold">WhatsApp thread not available</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This sub-tab wasn&apos;t captured from the source product (PRD §9.7) and no WhatsApp channel is wired up yet.
        Connect one from Setup &gt; Connect your WhatsApp once a provider (Gupshup, Exotel, MCUBE, …) is configured.
      </p>
    </div>
  );
}
