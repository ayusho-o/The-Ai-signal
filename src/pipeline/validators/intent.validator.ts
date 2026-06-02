import { AppIntentSchema } from "@/lib/schemas/intent.schema";
import type { AppIntent, ValidationResult, ValidationError } from "@/types";
import { safeParseJson } from "@/utils/json.utils";

export function validateIntentOutput(raw: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Check for empty output
  if (!raw || raw.trim().length === 0) {
    return {
      valid: false,
      errors: [
        {
          code: "MALFORMED_JSON",
          message: "Empty output from AI",
        },
      ],
    };
  }

  // Try to parse JSON
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed) {
    return {
      valid: false,
      errors: [
        {
          code: "MALFORMED_JSON",
          message: "Could not extract valid JSON from AI response",
          context: { rawLength: raw.length, preview: raw.slice(0, 200) },
        },
      ],
    };
  }

  // Validate with Zod
  const result = AppIntentSchema.safeParse(parsed);
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
  }

  return { valid: errors.length === 0, errors };
}

export function parseIntent(raw: string): AppIntent | null {
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed) return null;
  const result = AppIntentSchema.safeParse(parsed);
  if (!result.success) return null;
  return result.data as AppIntent;
}
