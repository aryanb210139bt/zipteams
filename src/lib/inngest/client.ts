import { EventSchemas, Inngest } from "inngest";

type CallUploadedEvent = { data: { callId: string } };

type Events = {
  "call/uploaded": CallUploadedEvent;
};

export const inngest = new Inngest({
  id: "calliq",
  schemas: new EventSchemas().fromRecord<Events>(),
});
