import type { IntegrationDefinition } from "@/types";

// STUBBED: Interface defined, HTTP calls not implemented

export const hubspotIntegration: IntegrationDefinition = {
  id: "hubspot",
  displayName: "HubSpot",
  description:
    "Manage HubSpot contacts, deals, and sequences. STUBBED — interface defined, implementation pending.",
  authType: "oauth2",
  implemented: false,
  triggers: [
    { event: "created", description: "Contact or deal created" },
    { event: "updated", description: "Contact or deal updated" },
    { event: "status_changed", description: "Deal stage changed" },
  ],
  actions: [
    {
      id: "create_contact",
      name: "Create Contact",
      description: "Create or update a HubSpot contact",
      inputSchema: [
        { name: "email", type: "string", required: true, description: "Contact email" },
        { name: "firstName", type: "string", required: false, description: "First name" },
        { name: "lastName", type: "string", required: false, description: "Last name" },
        { name: "phone", type: "string", required: false, description: "Phone number" },
        { name: "company", type: "string", required: false, description: "Company name" },
      ],
      outputSchema: [
        { name: "contactId", type: "string", required: true, description: "HubSpot contact ID" },
      ],
    },
    {
      id: "update_deal_stage",
      name: "Update Deal Stage",
      description: "Move a deal to a different pipeline stage",
      inputSchema: [
        { name: "dealId", type: "string", required: true, description: "HubSpot deal ID" },
        { name: "stageId", type: "string", required: true, description: "Pipeline stage ID" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Update success" },
      ],
    },
    {
      id: "add_to_sequence",
      name: "Add to Sequence",
      description: "Enroll a contact in a HubSpot email sequence",
      inputSchema: [
        { name: "contactId", type: "string", required: true, description: "HubSpot contact ID" },
        { name: "sequenceId", type: "string", required: true, description: "Sequence ID" },
      ],
      outputSchema: [
        { name: "enrollmentId", type: "string", required: true, description: "Enrollment ID" },
      ],
    },
  ],
};
