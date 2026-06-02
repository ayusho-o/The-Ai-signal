import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED: Full integration definition with working registry metadata
// Actual HTTP calls are stubbed — metadata is production-accurate

export const slackIntegration: IntegrationDefinition = {
  id: "slack",
  displayName: "Slack",
  description:
    "Send messages, DMs, and formatted blocks to Slack channels via Incoming Webhooks or Bot API",
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
      description: "Triggered when a record's status field changes",
    },
  ],
  actions: [
    {
      id: "send_channel_message",
      name: "Send Channel Message",
      description: "Post a message to a Slack channel",
      inputSchema: [
        { name: "channel", type: "string", required: true, description: "Channel ID or name (e.g. #general)" },
        { name: "text", type: "string", required: true, description: "Message text" },
        { name: "username", type: "string", required: false, description: "Bot display name" },
        { name: "icon_emoji", type: "string", required: false, description: "Bot icon emoji" },
      ],
      outputSchema: [
        { name: "ts", type: "string", required: true, description: "Message timestamp (unique ID)" },
        { name: "channel", type: "string", required: true, description: "Channel where message was posted" },
      ],
    },
    {
      id: "send_dm",
      name: "Send Direct Message",
      description: "Send a direct message to a specific user",
      inputSchema: [
        { name: "user_id", type: "string", required: true, description: "Slack user ID" },
        { name: "text", type: "string", required: true, description: "Message text" },
      ],
      outputSchema: [
        { name: "ts", type: "string", required: true, description: "Message timestamp" },
      ],
    },
    {
      id: "post_blocks",
      name: "Post Block Kit Message",
      description: "Post a rich formatted message using Slack Block Kit",
      inputSchema: [
        { name: "channel", type: "string", required: true, description: "Channel ID or name" },
        { name: "blocks", type: "json", required: true, description: "Block Kit JSON array" },
        { name: "text", type: "string", required: false, description: "Fallback text for notifications" },
      ],
      outputSchema: [
        { name: "ts", type: "string", required: true, description: "Message timestamp" },
        { name: "channel", type: "string", required: true, description: "Channel ID" },
      ],
    },
  ],
};
