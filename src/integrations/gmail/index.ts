import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED: Full registry metadata
// Actual Gmail API calls are stubbed — use Google OAuth2 + gmail.send scope

export const gmailIntegration: IntegrationDefinition = {
  id: "gmail",
  displayName: "Gmail / Google Workspace",
  description:
    "Send emails, create calendar events, and update Google Sheets via Google Workspace APIs",
  authType: "oauth2",
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
      description: "Triggered on status change events",
    },
  ],
  actions: [
    {
      id: "send_email",
      name: "Send Email",
      description: "Send an email via Gmail",
      inputSchema: [
        { name: "to", type: "string", required: true, description: "Recipient email address(es), comma-separated" },
        { name: "subject", type: "string", required: true, description: "Email subject line" },
        { name: "body", type: "string", required: true, description: "Email body (plain text or HTML)" },
        { name: "cc", type: "string", required: false, description: "CC addresses" },
        { name: "bcc", type: "string", required: false, description: "BCC addresses" },
        { name: "isHtml", type: "boolean", required: false, description: "Whether body is HTML" },
      ],
      outputSchema: [
        { name: "messageId", type: "string", required: true, description: "Gmail message ID" },
        { name: "threadId", type: "string", required: true, description: "Gmail thread ID" },
      ],
    },
    {
      id: "create_calendar_event",
      name: "Create Calendar Event",
      description: "Create a Google Calendar event",
      inputSchema: [
        { name: "title", type: "string", required: true, description: "Event title" },
        { name: "startDateTime", type: "string", required: true, description: "ISO 8601 start datetime" },
        { name: "endDateTime", type: "string", required: true, description: "ISO 8601 end datetime" },
        { name: "attendees", type: "string", required: false, description: "Comma-separated attendee emails" },
        { name: "description", type: "string", required: false, description: "Event description" },
        { name: "location", type: "string", required: false, description: "Event location" },
      ],
      outputSchema: [
        { name: "eventId", type: "string", required: true, description: "Google Calendar event ID" },
        { name: "htmlLink", type: "string", required: true, description: "Link to the calendar event" },
      ],
    },
  ],
};
