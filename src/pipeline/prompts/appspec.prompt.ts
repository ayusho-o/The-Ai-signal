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
  const registeredIntegrations = registry.map((i) => ({
    id: i.id,
    displayName: i.displayName,
    actions: i.actions.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
    })),
  }));

  const requestedIntegrations = intent.integrations_requested
    .map((name) => {
      const found = registry.find(
        (r) =>
          r.id.toLowerCase() === name.toLowerCase() ||
          r.displayName.toLowerCase().includes(name.toLowerCase())
      );
      return found ? { requested: name, matched: found.id } : null;
    })
    .filter(Boolean);

  return `Convert this DataSchema into a complete AppSpec.

App Details:
- Name: ${intent.appName}
- Type: ${intent.appType}
- Features: ${intent.features.join(", ")}
- Requested integrations: ${intent.integrations_requested.join(", ") || "none"}

DataSchema (use ONLY these entity names):
${JSON.stringify(schema, null, 2)}

Registered integrations you MUST use (use ONLY these IDs):
${JSON.stringify(registeredIntegrations, null, 2)}

Integration matches for requested integrations:
${JSON.stringify(requestedIntegrations, null, 2)}

Requirements:
1. Create pages for each entity (at minimum a list view)
2. Create CRUD API endpoints for each entity
3. Add a dashboard page if analytics is a feature
4. For each requested integration, create at least one workflowStub using the matched integration ID
5. Auth roles: admin (full access), user (read+write), and any domain-specific roles
6. Every workflowStub.integration must be one of: ${registry.map((r) => r.id).join(", ")}
7. boundEntity values must be exactly: ${schema.entities.map((e) => e.name).join(", ")}

Return the AppSpec JSON now.`;
}
