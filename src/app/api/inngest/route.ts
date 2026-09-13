import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { callPipeline } from "@/lib/inngest/functions/call-pipeline";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [callPipeline],
});
