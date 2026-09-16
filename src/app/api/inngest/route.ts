import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { callPipeline } from "@/lib/inngest/functions/call-pipeline";
import { leadsquaredSync } from "@/lib/inngest/functions/leadsquared-sync";
import { storageCleanup } from "@/lib/inngest/functions/storage-cleanup";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [callPipeline, leadsquaredSync, storageCleanup],
});
