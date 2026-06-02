import type { IntegrationDefinition } from "@/types";

// STUBBED: Interface defined, HTTP calls not implemented
// Implement via Salesforce REST API with OAuth 2.0

export const salesforceIntegration: IntegrationDefinition = {
  id: "salesforce",
  displayName: "Salesforce",
  description:
    "Sync CRM entities with Salesforce — create/update Leads, Contacts, Opportunities, and Accounts. STUBBED — interface defined, implementation pending.",
  authType: "oauth2",
  implemented: false,
  triggers: [
    { event: "created", description: "Record created in app" },
    { event: "updated", description: "Record updated in app" },
    { event: "status_changed", description: "CRM status changed" },
  ],
  actions: [
    {
      id: "create_lead",
      name: "Create Lead",
      description: "Create a Lead record in Salesforce",
      inputSchema: [
        { name: "firstName", type: "string", required: true, description: "Lead first name" },
        { name: "lastName", type: "string", required: true, description: "Lead last name" },
        { name: "email", type: "string", required: true, description: "Lead email" },
        { name: "company", type: "string", required: true, description: "Lead company" },
        { name: "phone", type: "string", required: false, description: "Lead phone" },
        { name: "leadSource", type: "string", required: false, description: "Lead source" },
      ],
      outputSchema: [
        { name: "salesforceId", type: "string", required: true, description: "Salesforce record ID" },
        { name: "success", type: "boolean", required: true, description: "Operation success" },
      ],
    },
    {
      id: "update_opportunity",
      name: "Update Opportunity",
      description: "Update an Opportunity in Salesforce",
      inputSchema: [
        { name: "opportunityId", type: "string", required: true, description: "Salesforce Opportunity ID" },
        { name: "stageName", type: "string", required: false, description: "Stage name (e.g. Closed Won)" },
        { name: "amount", type: "float", required: false, description: "Deal amount" },
        { name: "closeDate", type: "string", required: false, description: "Expected close date (YYYY-MM-DD)" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Update success" },
      ],
    },
    {
      id: "create_contact",
      name: "Create Contact",
      description: "Create a Contact in Salesforce",
      inputSchema: [
        { name: "firstName", type: "string", required: true, description: "First name" },
        { name: "lastName", type: "string", required: true, description: "Last name" },
        { name: "email", type: "string", required: true, description: "Email address" },
        { name: "accountId", type: "string", required: false, description: "Associated Salesforce Account ID" },
      ],
      outputSchema: [
        { name: "salesforceId", type: "string", required: true, description: "Contact Salesforce ID" },
      ],
    },
  ],
};
