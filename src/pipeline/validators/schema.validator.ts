import { DataSchemaZod } from "@/lib/schemas/schema.schema";
import type { DataSchema, ValidationResult, ValidationError, EntitySchema } from "@/types";
import { safeParseJson } from "@/utils/json.utils";

export function validateSchemaOutput(raw: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!raw || raw.trim().length === 0) {
    return {
      valid: false,
      errors: [{ code: "MALFORMED_JSON", message: "Empty output from AI" }],
    };
  }

  const parsed = safeParseJson<unknown>(raw);
  if (!parsed) {
    return {
      valid: false,
      errors: [
        {
          code: "MALFORMED_JSON",
          message: "Could not extract valid JSON from AI response",
          context: { preview: raw.slice(0, 200) },
        },
      ],
    };
  }

  // Zod validation
  const result = DataSchemaZod.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.join(".");
      errors.push({
        code: "MISSING_FIELD",
        field,
        message: `${field}: ${issue.message}`,
        context: { zodCode: issue.code },
      });
    }
    if (errors.length > 0) {
      return { valid: false, errors };
    }
  }

  // Cross-layer consistency: every entity must have tenantId
  const data = result.success
    ? result.data
    : (safeParseJson<DataSchema>(raw) as DataSchema);

  if (data?.entities) {
    for (const entity of data.entities) {
      const hasTenantId = entity.fields?.some((f) => f.name === "tenantId");
      if (!hasTenantId) {
        errors.push({
          code: "MISSING_TENANT_ID",
          field: `${entity.name}.fields`,
          message: `Entity "${entity.name}" is missing required tenantId field`,
          context: { entityName: entity.name },
        });
      }
    }

    // Validate relation consistency (bidirectional)
    const entityNames = new Set(data.entities.map((e: EntitySchema) => e.name));
    for (const entity of data.entities) {
      for (const relation of entity.relations ?? []) {
        if (!entityNames.has(relation.target)) {
          errors.push({
            code: "INCONSISTENT_RELATION",
            field: `${entity.name}.relations`,
            message: `Entity "${entity.name}" has relation to unknown entity "${relation.target}"`,
            context: {
              entityName: entity.name,
              targetEntity: relation.target,
            },
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function parseSchema(raw: string): DataSchema | null {
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed) return null;
  const result = DataSchemaZod.safeParse(parsed);
  if (!result.success) return null;
  return result.data as DataSchema;
}
