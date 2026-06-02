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
  return `Convert this AppIntent into a complete DataSchema:

AppIntent:
${JSON.stringify(intent, null, 2)}

Requirements:
- Generate all entities listed: ${intent.entities.join(", ")}
- Infer relationships between entities based on the app type (${intent.appType}) and features
- Every entity needs: id (uuid primary), tenantId (uuid), createdAt, updatedAt
- Make relations bidirectionally consistent
- Return the DataSchema JSON now.`;
}
