export type IntegrationProviderConfig = {
  title: string;
  subtitle: string;
  connect: string[];
  comingSoon: string[];
};

/** PRD §10.4 — repeating "Connect your {X}" template, one config per provider group. */
export const INTEGRATION_CONFIG: Record<string, IntegrationProviderConfig> = {
  crm: {
    title: "CRM",
    subtitle: "Sync leads and push call activity back to your CRM of record.",
    connect: ["HubSpot", "Leadsquared", "Salesforce", "monday.com", "Pipedrive", "Zoho", "Meritto", "Bitrix24"],
    comingSoon: [],
  },
  whatsapp: {
    title: "WhatsApp",
    subtitle: "Ingest WhatsApp conversations alongside calls.",
    connect: ["Gupshup", "Gupshup Enterprise", "Exotel", "MCUBE"],
    comingSoon: ["Gallabox", "Interakt", "Netcore", "MyOperator", "Wati"],
  },
  "voice-bot": {
    title: "Voice Bot",
    subtitle: "Connect an AI voice agent as a conversation source.",
    connect: ["Plivo", "ElevenLabs", "Bolna", "RINGG AI"],
    comingSoon: ["Superbot", "Other"],
  },
  "ad-account": {
    title: "Ad Account",
    subtitle: "Attribute leads back to the ad campaign that generated them.",
    connect: ["Meta", "Google Ads"],
    comingSoon: [],
  },
  "meeting-room": {
    title: "Meeting Room",
    subtitle: "Pick which meeting platform's recordings feed the pipeline.",
    connect: ["Zipteams", "Google Meet", "Zoom", "Microsoft Teams"],
    comingSoon: [],
  },
};
