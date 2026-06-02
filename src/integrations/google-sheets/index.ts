import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED

export const googleSheetsIntegration: IntegrationDefinition = {
  id: "google_sheets",
  displayName: "Google Sheets",
  description: "Append rows, update cells, and create sheets in Google Sheets",
  authType: "oauth2",
  implemented: true,
  triggers: [
    { event: "created", description: "Record created" },
    { event: "updated", description: "Record updated" },
    { event: "deleted", description: "Record deleted" },
  ],
  actions: [
    {
      id: "append_row",
      name: "Append Row",
      description: "Append a new row to a Google Sheet",
      inputSchema: [
        { name: "spreadsheetId", type: "string", required: true, description: "Google Sheets spreadsheet ID" },
        { name: "range", type: "string", required: true, description: "Sheet range (e.g. Sheet1!A:Z)" },
        { name: "values", type: "json", required: true, description: "Array of values to append as a row" },
      ],
      outputSchema: [
        { name: "updatedRange", type: "string", required: true, description: "Range that was updated" },
        { name: "updatedRows", type: "integer", required: true, description: "Number of rows updated" },
      ],
    },
    {
      id: "update_cell",
      name: "Update Cell",
      description: "Update a specific cell value",
      inputSchema: [
        { name: "spreadsheetId", type: "string", required: true, description: "Spreadsheet ID" },
        { name: "cell", type: "string", required: true, description: "Cell reference (e.g. B2)" },
        { name: "value", type: "string", required: true, description: "New cell value" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Update success" },
      ],
    },
    {
      id: "create_sheet",
      name: "Create Sheet",
      description: "Create a new sheet tab in a spreadsheet",
      inputSchema: [
        { name: "spreadsheetId", type: "string", required: true, description: "Spreadsheet ID" },
        { name: "sheetTitle", type: "string", required: true, description: "New sheet tab title" },
      ],
      outputSchema: [
        { name: "sheetId", type: "integer", required: true, description: "New sheet ID" },
        { name: "sheetTitle", type: "string", required: true, description: "Sheet title" },
      ],
    },
  ],
};
