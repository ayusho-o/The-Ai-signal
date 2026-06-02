import type { DataSchema, AppIntent } from "@/types";
import { getIntegrationRegistry } from "@/integrations/registry";

export const APPSPEC_SYSTEM_PROMPT = `You are a full-stack application architect. Convert a DataSchema into a complete AppSpec.

Return ONLY a valid JSON object. No markdown. No explanations.

AppSpec Schema:
{
  "appName": string,
  "appType": string,
  "pages": [
    {
      "name": string,
      "route": string,         // must start with /
      "layout": "list" | "detail" | "dashboard" | "settings",
      "boundEntity": string,   // must match an entity name from DataSchema
      "components": [
        {
          "type": "table" | "form" | "chart" | "card",
          "label": string,
          "dataSource": string (optional)
        }
      ]
    }
  ],
  "apiEndpoints": [
    {
      "path": string,          // must start with /
      "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      "handlerDescription": string,
      "boundEntity": string,   // must match an entity name
      "authRequired": boolean,
      "rateLimitFlag": boolean,
      "requestBodyFields": string[] (optional),
      "responseFields": string[] (optional)
    }
  ],
  "authRules": {
    "roles": [
      {
        "name": string,
        "description": string,
        "permissions": [
          {
            "entity": string,
            "permissions": ("read" | "write" | "delete")[]
          }
        ]
      }
    ]
  },
  "integrationHooks": [
    {
      "integrationId": string,   // must be from the registered integration IDs
      "triggerEvent": "created" | "updated" | "deleted" | "status_changed",
      "boundEntity": string,
      "description": string
    }
  ],
  "workflowStubs": [
    {
      "name": string,
      "trigger": {
        "entity": string,
        "event": "created" | "updated" | "deleted" | "status_changed",
        "condition": string (optional)
      },
      "integration": string,   // must be a registered integration ID
      "action": string,        // must be a valid action ID for that integration
      "payload": [
        {
          "sourceField": string,
          "targetParam": string,
          "transform": string (optional)
        }
      ]
    }
  ]
}

Critical rules:
1. Every page MUST have at least one API endpoint with the same boundEntity
2. boundEntity in pages and endpoints MUST exactly match entity names from DataSchema
3. integrationHooks and workflowStubs MUST only use registered integration IDs
4. workflowStubs MUST use valid action IDs from the integration registry
5. Every entity should have at least a list page and CRUD endpoints
6. Include admin and user roles at minimum in authRules`;

export function buildAppSpecPrompt(
  schema: DataSchema,
  intent: AppIntent
): string {
  const registry = getIntegrationRegistry();

  // Only include integrations that were actually requested — keeps prompt small
  const requestedIds = intent.integrations_requested
    .map((name) => {
      const found = registry.find(
        (r) =>
          r.id.toLowerCase() === name.toLowerCase() ||
          r.displayName.toLowerCase().includes(name.toLowerCase())
      );
      return found ? found.id : null;
    })
    .filter((id): id is string => id !== null);

  // Compact action ID list for requested integrations only
  const actionRef = requestedIds
    .map((id) => {
      const intg = registry.find((r) => r.id === id);
      if (!intg) return null;
      return `${id}: [${intg.actions.map((a) => a.id).join(", ")}]`;
    })
    .filter(Boolean)
    .join("\n");

  // Compact entity list — name + field names only (no full field objects)
  const entitySummary = schema.entities
    .map((e) => `${e.name}: [${e.fields.map((f) => f.name).join(", ")}]`)
    .join("\n");

  const entityNames = schema.entities.map((e) => e.name).join(", ");
  const integrationIds = requestedIds.length > 0
    ? requestedIds.join(", ")
    : registry.slice(0, 5).map((r) => r.id).join(", ");

  return `Convert this schema into an AppSpec JSON.

App: ${intent.appName} (${intent.appType})
Features: ${intent.features.slice(0, 5).join(", ")}
Integrations needed: ${intent.integrations_requested.join(", ") || "none"}

Entities (use ONLY these exact names as boundEntity):
${entitySummary}

Valid integration IDs: ${integrationIds}
Valid action IDs per integration:
${actionRef || "none"}

Rules:
1. For each entity: 1 list page (route: /entityname), GET+POST+PUT+DELETE endpoints
2. boundEntity MUST be one of: ${entityNames}
3. workflowStub.integration MUST be one of: ${integrationIds}
4. workflowStub.action MUST be from the action IDs listed above
5. authRules: include admin (read+write+delete) and user (read+write) roles
6. Add 1 workflowStub per requested integration

Return ONLY the AppSpec JSON. No markdown, no explanations.`;
}
