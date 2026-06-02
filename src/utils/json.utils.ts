// ============================================================
// JSON Extraction and Repair Utilities
// ============================================================

/**
 * Extracts the first valid JSON object or array from a string.
 * Handles markdown code blocks, trailing commas, and truncated JSON.
 */
export function extractFirstJsonObject(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // Find the first { or [
  const start = Math.min(
    text.indexOf("{") === -1 ? Infinity : text.indexOf("{"),
    text.indexOf("[") === -1 ? Infinity : text.indexOf("[")
  );

  if (start === Infinity) return null;

  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";

  // Track brace depth to find matching close
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    // Truncated JSON — try to close open braces
    const partial = text.slice(start);
    return attemptTruncationRepair(partial);
  }

  return text.slice(start, end + 1);
}

/**
 * Try to close a truncated JSON object by counting unclosed braces.
 */
function attemptTruncationRepair(partial: string): string | null {
  let cleaned = partial;

  // Remove trailing comma before attempting close
  cleaned = cleaned.replace(/,\s*$/, "");

  // Count open braces/brackets
  const opens: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of cleaned) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") opens.push(ch);
    else if (ch === "}" && opens[opens.length - 1] === "{") opens.pop();
    else if (ch === "]" && opens[opens.length - 1] === "[") opens.pop();
  }

  // If we're still inside a string, close it
  if (inString) cleaned += '"';

  // Close remaining open structures in reverse order
  while (opens.length > 0) {
    const open = opens.pop();
    cleaned += open === "{" ? "}" : "]";
  }

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

/**
 * Safely parse JSON, returning null on error.
 */
export function safeParseJson<T = unknown>(raw: string): T | null {
  const extracted = extractFirstJsonObject(raw);
  if (!extracted) return null;

  try {
    return JSON.parse(extracted) as T;
  } catch {
    // Try removing trailing commas (common LLM error)
    try {
      const fixed = extracted
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      return JSON.parse(fixed) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Deep merge two objects (right overwrites left for primitives).
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base };
  for (const key in override) {
    const val = override[key];
    if (
      val !== undefined &&
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        val as Record<string, unknown>
      ) as T[typeof key];
    } else if (val !== undefined) {
      result[key] = val as T[typeof key];
    }
  }
  return result;
}
