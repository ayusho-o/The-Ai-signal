import type { IntegrationDefinition } from "@/types";

// STUBBED

export const airtableIntegration: IntegrationDefinition = {
  id: "airtable",
  displayName: "Airtable",
  description: "Create and update Airtable records. STUBBED.",
  authType: "api_key",
  implemented: false,
  triggers: [
    { event: "created", description: "Record created" },
    { event: "updated", description: "Record updated" },
  ],
  actions: [
    {
      id: "create_record",
      name: "Create Record",
      description: "Create a new record in an Airtable base",
      inputSchema: [
        { name: "baseId", type: "string", required: true, description: "Airtable base ID" },
        { name: "tableId", type: "string", required: true, description: "Table ID or name" },
        { name: "fields", type: "json", required: true, description: "Record field values" },
      ],
      outputSchema: [
        { name: "recordId", type: "string", required: true, description: "Airtable record ID" },
      ],
    },
    {
      id: "update_record",
      name: "Update Record",
      description: "Update fields on an existing Airtable record",
      inputSchema: [
        { name: "baseId", type: "string", required: true, description: "Airtable base ID" },
        { name: "tableId", type: "string", required: true, description: "Table name or ID" },
        { name: "recordId", type: "string", required: true, description: "Record ID to update" },
        { name: "fields", type: "json", required: true, description: "Updated field values" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Update success" },
      ],
    },
  ],
};
