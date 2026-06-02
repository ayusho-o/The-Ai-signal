import type { IntegrationDefinition } from "@/types";

// STUBBED

export const zapierIntegration: IntegrationDefinition = {
  id: "zapier",
  displayName: "Zapier",
  description: "Send structured payloads to Zapier webhook URLs. STUBBED.",
  authType: "webhook_secret",
  implemented: false,
  triggers: [
    { event: "created", description: "Any record created" },
    { event: "updated", description: "Any record updated" },
    { event: "status_changed", description: "Status change" },
  ],
  actions: [
    {
      id: "trigger_zap",
      name: "Trigger Zap",
      description: "POST a payload to a Zapier webhook URL",
      inputSchema: [
        { name: "zapWebhookUrl", type: "string", required: true, description: "Zapier webhook URL" },
        { name: "data", type: "json", required: true, description: "Structured data to send" },
      ],
      outputSchema: [
        { name: "status", type: "string", required: true, description: "success | failed" },
      ],
    },
  ],
};
