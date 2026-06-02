import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED: Full registry metadata

export const twilioSmsIntegration: IntegrationDefinition = {
  id: "twilio_sms",
  displayName: "Twilio SMS",
  description: "Send SMS notifications and OTP flows via Twilio",
  authType: "api_key",
  implemented: true,
  triggers: [
    { event: "created", description: "Record created" },
    { event: "status_changed", description: "Status change" },
  ],
  actions: [
    {
      id: "send_sms",
      name: "Send SMS",
      description: "Send an SMS to a phone number",
      inputSchema: [
        { name: "to", type: "string", required: true, description: "Recipient phone number (E.164 format)" },
        { name: "body", type: "string", required: true, description: "SMS message body (max 1600 chars)" },
        { name: "from", type: "string", required: false, description: "Sender Twilio number (defaults to env config)" },
      ],
      outputSchema: [
        { name: "messageSid", type: "string", required: true, description: "Twilio message SID" },
        { name: "status", type: "string", required: true, description: "Delivery status" },
      ],
    },
    {
      id: "trigger_otp",
      name: "Trigger OTP Flow",
      description: "Send a one-time password via Twilio Verify",
      inputSchema: [
        { name: "to", type: "string", required: true, description: "Recipient phone number" },
        { name: "channel", type: "string", required: false, description: "sms | call | email (default: sms)" },
      ],
      outputSchema: [
        { name: "verificationSid", type: "string", required: true, description: "Twilio Verify SID" },
        { name: "status", type: "string", required: true, description: "pending | approved | canceled" },
      ],
    },
  ],
};
