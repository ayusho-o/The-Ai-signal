import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED

export const webhookIntegration: IntegrationDefinition = {
  id: "webhook",
  displayName: "Webhook (Generic)",
  description:
    "POST structured payloads to any configured URL with HMAC signature",
  authType: "webhook_secret",
  implemented: true,
  triggers: [
    { event: "created", description: "Any record created" },
    { event: "updated", description: "Any record updated" },
    { event: "deleted", description: "Any record deleted" },
    { event: "status_changed", description: "Any status change" },
  ],
  actions: [
    {
      id: "post_payload",
      name: "POST Payload",
      description: "Send a JSON payload to a configured endpoint with HMAC-SHA256 signature",
      inputSchema: [
        { name: "url", type: "string", required: true, description: "Target webhook URL" },
        { name: "payload", type: "json", required: true, description: "JSON body to POST" },
        { name: "secret", type: "string", required: false, description: "HMAC secret for signature header X-Webhook-Signature" },
        { name: "headers", type: "json", required: false, description: "Additional headers to include" },
        { name: "retryOnFailure", type: "boolean", required: false, description: "Retry on 4xx/5xx (default: true)" },
      ],
      outputSchema: [
        { name: "statusCode", type: "integer", required: true, description: "HTTP response status code" },
        { name: "success", type: "boolean", required: true, description: "Whether delivery succeeded" },
        { name: "responseBody", type: "string", required: false, description: "Response body from endpoint" },
      ],
    },
  ],
};
