import type { AppIntent } from "@/types";

export const SCHEMA_SYSTEM_PROMPT = `You are a database architect. Convert an AppIntent into a complete DataSchema.

You MUST return ONLY a valid JSON object matching this schema:
{
  "entities": [
    {
      "name": string,           // PascalCase
      "tableName": string,      // snake_case
      "fields": [
        {
          "name": string,
          "type": "string" | "text" | "integer" | "float" | "boolean" | "date" | "datetime" | "uuid" | "json" | "enum",
          "nullable": boolean,
          "isRelation": boolean,
          "isPrimary": boolean,
          "isUnique": boolean,
          "defaultValue": any (optional),
          "enumValues": string[] (optional, only for enum type)
        }
      ],
      "relations": [
        {
          "type": "hasMany" | "belongsTo" | "hasOne",
          "target": string,     // entity name
          "foreignKey": string,
          "onDelete": "CASCADE" | "SET_NULL" | "RESTRICT" | "NO_ACTION"
        }
      ]
    }
  ]
}

Critical rules:
1. EVERY entity MUST have a "tenantId" field of type "uuid", nullable: false
2. EVERY entity MUST have an "id" field as primary key (uuid, isPrimary: true)
3. Relations MUST be bidirectionally consistent (if A hasMany B, then B belongsTo A)
4. tableName MUST be snake_case (e.g. "real_estate_agent")
5. Include createdAt and updatedAt datetime fields on every entity
6. Infer reasonable fields from the entity name and context
7. For enum fields, include enumValues array
8. Return JSON only. No explanations.`;

export function buildSchemaPrompt(intent: AppIntent): string {
  // Compact intent (no pretty-print) to save tokens
  const compactIntent = JSON.stringify({
    appName: intent.appName,
    appType: intent.appType,
    entities: intent.entities,
    features: intent.features.slice(0, 6),
    integrations_requested: intent.integrations_requested,
  });

  return `Convert this AppIntent into a DataSchema JSON.

AppIntent: ${compactIntent}

Rules:
- Generate entities: ${intent.entities.join(", ")}
- Every entity needs: id (uuid, isPrimary:true), tenantId (uuid), createdAt (datetime), updatedAt (datetime)
- Add relevant fields per entity based on context
- Make relations bidirectionally consistent
- Return ONLY the JSON object, no explanations.`;
}
