import type { IntegrationDefinition } from "@/types";

// STUBBED

export const notionIntegration: IntegrationDefinition = {
  id: "notion",
  displayName: "Notion",
  description:
    "Create Notion pages, append blocks, and update database rows. STUBBED.",
  authType: "oauth2",
  implemented: false,
  triggers: [
    { event: "created", description: "Record created" },
    { event: "updated", description: "Record updated" },
  ],
  actions: [
    {
      id: "create_page",
      name: "Create Page",
      description: "Create a new Notion page",
      inputSchema: [
        { name: "parentId", type: "string", required: true, description: "Parent page or database ID" },
        { name: "title", type: "string", required: true, description: "Page title" },
        { name: "content", type: "json", required: false, description: "Page content blocks" },
      ],
      outputSchema: [
        { name: "pageId", type: "string", required: true, description: "Notion page ID" },
      ],
    },
    {
      id: "update_database_row",
      name: "Update Database Row",
      description: "Update a database row in Notion",
      inputSchema: [
        { name: "pageId", type: "string", required: true, description: "Row page ID" },
        { name: "properties", type: "json", required: true, description: "Property updates" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Update success" },
      ],
    },
  ],
};
