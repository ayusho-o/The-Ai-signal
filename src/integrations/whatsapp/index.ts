import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED: Full registry metadata
// Uses Twilio's WhatsApp API (twilio.com/whatsapp)
// Actual HTTP calls stubbed — implement with twilio Node SDK

export const whatsappIntegration: IntegrationDefinition = {
  id: "whatsapp",
  displayName: "WhatsApp (via Twilio)",
  description:
    "Send WhatsApp template messages, notifications, and trigger conversations via Twilio WhatsApp API",
  authType: "api_key",
  implemented: true,
  triggers: [
    {
      event: "created",
      description: "Triggered when a record is created",
    },
    {
      event: "updated",
      description: "Triggered when a record is updated",
    },
    {
      event: "status_changed",
      description: "Triggered when a record status changes",
    },
  ],
  actions: [
    {
      id: "send_template_message",
      name: "Send Template Message",
      description: "Send a pre-approved WhatsApp template message",
      inputSchema: [
        { name: "to", type: "string", required: true, description: "Recipient WhatsApp number in E.164 format (e.g. +1234567890)" },
        { name: "templateSid", type: "string", required: true, description: "Twilio content template SID" },
        { name: "templateVariables", type: "json", required: false, description: "Key-value pairs for template variable substitution" },
        { name: "from", type: "string", required: false, description: "Twilio WhatsApp sender number (defaults to env config)" },
      ],
      outputSchema: [
        { name: "messageSid", type: "string", required: true, description: "Twilio message SID" },
        { name: "status", type: "string", required: true, description: "Message delivery status" },
      ],
    },
    {
      id: "send_notification",
      name: "Send Notification",
      description: "Send a free-form text WhatsApp notification",
      inputSchema: [
        { name: "to", type: "string", required: true, description: "Recipient WhatsApp number" },
        { name: "message", type: "string", required: true, description: "Notification text (max 4096 chars)" },
      ],
      outputSchema: [
        { name: "messageSid", type: "string", required: true, description: "Twilio message SID" },
      ],
    },
    {
      id: "trigger_conversation",
      name: "Trigger Conversation",
      description: "Initiate a WhatsApp conversation flow",
      inputSchema: [
        { name: "to", type: "string", required: true, description: "Recipient WhatsApp number" },
        { name: "conversationTemplate", type: "string", required: true, description: "Conversation template name" },
        { name: "context", type: "json", required: false, description: "Contextual data passed to the conversation" },
      ],
      outputSchema: [
        { name: "conversationSid", type: "string", required: true, description: "Twilio Conversations SID" },
      ],
    },
  ],
};
