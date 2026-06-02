import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED: Full registry metadata
// Actual Stripe API calls stubbed — implement with stripe Node SDK

export const stripeIntegration: IntegrationDefinition = {
  id: "stripe",
  displayName: "Stripe",
  description:
    "Handle payments, subscriptions, customers, and refunds via the Stripe API",
  authType: "api_key",
  implemented: true,
  triggers: [
    {
      event: "created",
      description: "Triggered when an order, subscription, or payment is created",
    },
    {
      event: "updated",
      description: "Triggered when a payment or subscription is updated",
    },
    {
      event: "status_changed",
      description: "Triggered when payment or subscription status changes",
    },
  ],
  actions: [
    {
      id: "create_customer",
      name: "Create Customer",
      description: "Create a new Stripe customer",
      inputSchema: [
        { name: "email", type: "string", required: true, description: "Customer email" },
        { name: "name", type: "string", required: false, description: "Customer full name" },
        { name: "phone", type: "string", required: false, description: "Customer phone" },
        { name: "metadata", type: "json", required: false, description: "Arbitrary key-value metadata" },
      ],
      outputSchema: [
        { name: "customerId", type: "string", required: true, description: "Stripe customer ID (cus_...)" },
      ],
    },
    {
      id: "create_payment_intent",
      name: "Create Payment Intent",
      description: "Create a PaymentIntent for a one-time charge",
      inputSchema: [
        { name: "amount", type: "integer", required: true, description: "Amount in smallest currency unit (e.g. cents)" },
        { name: "currency", type: "string", required: true, description: "ISO 4217 currency code (e.g. usd)" },
        { name: "customerId", type: "string", required: false, description: "Stripe customer ID" },
        { name: "description", type: "string", required: false, description: "Payment description" },
        { name: "metadata", type: "json", required: false, description: "Arbitrary metadata" },
      ],
      outputSchema: [
        { name: "paymentIntentId", type: "string", required: true, description: "Stripe PaymentIntent ID (pi_...)" },
        { name: "clientSecret", type: "string", required: true, description: "Client secret for frontend confirmation" },
        { name: "status", type: "string", required: true, description: "PaymentIntent status" },
      ],
    },
    {
      id: "manage_subscription",
      name: "Manage Subscription",
      description: "Create, update, or cancel a Stripe subscription",
      inputSchema: [
        { name: "action", type: "string", required: true, description: "create | update | cancel" },
        { name: "customerId", type: "string", required: true, description: "Stripe customer ID" },
        { name: "priceId", type: "string", required: false, description: "Stripe price ID for new subscription" },
        { name: "subscriptionId", type: "string", required: false, description: "Existing subscription ID for update/cancel" },
      ],
      outputSchema: [
        { name: "subscriptionId", type: "string", required: true, description: "Stripe subscription ID" },
        { name: "status", type: "string", required: true, description: "Subscription status" },
      ],
    },
    {
      id: "issue_refund",
      name: "Issue Refund",
      description: "Refund a payment charge",
      inputSchema: [
        { name: "chargeId", type: "string", required: true, description: "Stripe charge ID to refund" },
        { name: "amount", type: "integer", required: false, description: "Partial refund amount in cents (full refund if omitted)" },
        { name: "reason", type: "string", required: false, description: "duplicate | fraudulent | requested_by_customer" },
      ],
      outputSchema: [
        { name: "refundId", type: "string", required: true, description: "Stripe refund ID" },
        { name: "status", type: "string", required: true, description: "Refund status" },
      ],
    },
  ],
};
