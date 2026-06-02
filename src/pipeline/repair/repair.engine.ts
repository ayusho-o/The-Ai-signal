import type {
  ValidationError,
  ValidationResult,
  RepairAttempt,
  RepairOutcome,
  RepairStrategy,
  PipelineStage,
  AppIntent,
  DataSchema,
  AppSpec,
  AIProvider,
} from "@/types";
import { safeParseJson, extractFirstJsonObject } from "@/utils/json.utils";
import { generateRepairWithAI, generateWithAI } from "@/ai/gateway";
import { logger } from "@/lib/logger";
import { getIntegrationRegistry } from "@/integrations/registry";

// ============================================================
// Repair Engine — 3 classified strategies + AI retry
// ============================================================

export interface RepairResult {
  repairedContent: string | null;
  attempts: RepairAttempt[];
  finallyValid: boolean;
}

// --------------- Strategy 1: Structural Repair ---------------
// Fixes: malformed JSON, truncated output, markdown wrapping

export function structuralRepair(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;

  let text = raw.trim();

  // Remove markdown fences
  text = text.replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/im, "").trim();

  // Try extracting JSON object
  const extracted = extractFirstJsonObject(text);
  if (!extracted) return null;

  // Fix trailing commas
  const fixed = extracted
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");

  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    return null;
  }
}

// --------------- Strategy 2: Field Repair ---------------
// Fixes: missing required fields, wrong types, missing tenantId

export function fieldRepairIntent(
  raw: string,
  errors: ValidationError[]
): string | null {
  const parsed = safeParseJson<Record<string, unknown>>(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = { ...parsed };

  for (const err of errors) {
    if (!err.field) continue;

    // appName
    if (err.field === "appName" || (err.code === "MISSING_FIELD" && err.field.includes("appName"))) {
      if (!obj["appName"]) obj["appName"] = "Generated App";
    }

    // appType
    if (err.field === "appType" || err.code === "INVALID_ENUM") {
      const validTypes = ["crm","project_management","ecommerce","hr_tool","inventory","content_platform","analytics","custom"];
      if (!obj["appType"] || !validTypes.includes(obj["appType"] as string)) {
        obj["appType"] = "custom";
      }
    }

    // Arrays that may be missing
    for (const field of ["features", "entities", "integrations_requested", "assumptions"]) {
      if (err.field === field || err.field?.startsWith(field)) {
        if (!Array.isArray(obj[field])) {
          obj[field] = [];
        }
      }
    }
  }

  return JSON.stringify(obj);
}

export function fieldRepairSchema(
  raw: string,
  errors: ValidationError[]
): string | null {
  const parsed = safeParseJson<Record<string, unknown>>(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = { ...parsed };

  // Ensure entities is an array
  if (!Array.isArray(obj["entities"])) {
    obj["entities"] = [];
  }

  const entities = obj["entities"] as Array<Record<string, unknown>>;

  for (const entity of entities) {
    if (!entity || typeof entity !== "object") continue;

    const fields = (entity["fields"] as Array<Record<string, unknown>>) ?? [];

    // Add missing tenantId
    const hasTenantId = fields.some((f) => f["name"] === "tenantId");
    if (!hasTenantId) {
      fields.push({
        name: "tenantId",
        type: "uuid",
        nullable: false,
        isRelation: false,
        isPrimary: false,
        isUnique: false,
      });
      entity["fields"] = fields;
    }

    // Ensure tableName is snake_case
    if (typeof entity["name"] === "string" && !entity["tableName"]) {
      entity["tableName"] = toSnakeCase(entity["name"] as string);
    }

    // Ensure relations array exists
    if (!Array.isArray(entity["relations"])) {
      entity["relations"] = [];
    }

    // Fix field types
    for (const field of fields) {
      if (!field["type"]) field["type"] = "string";
      if (typeof field["nullable"] !== "boolean") field["nullable"] = true;
      if (typeof field["isRelation"] !== "boolean") field["isRelation"] = false;
      if (typeof field["isPrimary"] !== "boolean") field["isPrimary"] = false;
      if (typeof field["isUnique"] !== "boolean") field["isUnique"] = false;
    }
  }

  return JSON.stringify(obj);
}

export function fieldRepairAppSpec(
  raw: string,
  errors: ValidationError[],
  dataSchema?: DataSchema
): string | null {
  const parsed = safeParseJson<Record<string, unknown>>(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = { ...parsed };

  // Ensure required arrays exist
  for (const field of ["pages", "apiEndpoints", "integrationHooks", "workflowStubs"]) {
    if (!Array.isArray(obj[field])) {
      obj[field] = [];
    }
  }

  // Ensure authRules exists
  if (!obj["authRules"] || typeof obj["authRules"] !== "object") {
    obj["authRules"] = {
      roles: [
        {
          name: "admin",
          description: "Full access",
          permissions: dataSchema?.entities.map((e) => ({
            entity: e.name,
            permissions: ["read", "write", "delete"],
          })) ?? [],
        },
        {
          name: "user",
          description: "Standard user access",
          permissions: dataSchema?.entities.map((e) => ({
            entity: e.name,
            permissions: ["read", "write"],
          })) ?? [],
        },
      ],
    };
  }

  // Ensure pages have layout and boundEntity
  const pages = obj["pages"] as Array<Record<string, unknown>>;
  const firstEntity = dataSchema?.entities[0]?.name ?? "Entity";
  for (const page of pages) {
    if (!page["layout"]) page["layout"] = "list";
    if (!page["components"] || !Array.isArray(page["components"])) {
      page["components"] = [{ type: "table", label: "Data" }];
    }
    if (!page["route"] && page["name"]) {
      page["route"] = `/${String(page["name"]).toLowerCase().replace(/\s+/g, "-")}`;
    }
    // Fix null or missing boundEntity
    if (!page["boundEntity"] || page["boundEntity"] === null) {
      page["boundEntity"] = firstEntity;
    }
  }

  // Ensure endpoints have required fields and boundEntity
  const endpoints = obj["apiEndpoints"] as Array<Record<string, unknown>>;
  for (const ep of endpoints) {
    if (typeof ep["authRequired"] !== "boolean") ep["authRequired"] = true;
    if (typeof ep["rateLimitFlag"] !== "boolean") ep["rateLimitFlag"] = false;
    if (!ep["method"]) ep["method"] = "GET";
    // Fix null or missing boundEntity
    if (!ep["boundEntity"] || ep["boundEntity"] === null) {
      ep["boundEntity"] = firstEntity;
    }
  }

  return JSON.stringify(obj);
}

// --------------- Strategy 3: Consistency Repair ---------------
// Fixes: broken cross-layer references, unregistered integrations

export function consistencyRepairAppSpec(
  raw: string,
  errors: ValidationError[],
  dataSchema: DataSchema
): string | null {
  const parsed = safeParseJson<Record<string, unknown>>(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = { ...parsed };
  const entityNames = new Set(dataSchema.entities.map((e) => e.name));
  const registry = getIntegrationRegistry();
  const registeredIds = new Set(registry.map((i) => i.id));

  // Fix broken page boundEntity references
  const pages = (obj["pages"] as Array<Record<string, unknown>>) ?? [];
  const firstEntity = dataSchema.entities[0]?.name ?? "Entity";
  for (const page of pages) {
    // Handle null, undefined, or missing boundEntity
    if (!page["boundEntity"] || page["boundEntity"] === null) {
      page["boundEntity"] = firstEntity;
    } else if (typeof page["boundEntity"] === "string" && !entityNames.has(page["boundEntity"])) {
      // Find closest match
      const closest = findClosestEntity(page["boundEntity"] as string, [...entityNames]);
      page["boundEntity"] = closest ?? firstEntity;
    }
  }

  // Fix broken endpoint boundEntity references
  const endpoints = (obj["apiEndpoints"] as Array<Record<string, unknown>>) ?? [];
  for (const ep of endpoints) {
    // Handle null, undefined, or missing boundEntity
    if (!ep["boundEntity"] || ep["boundEntity"] === null) {
      ep["boundEntity"] = firstEntity;
    } else if (typeof ep["boundEntity"] === "string" && !entityNames.has(ep["boundEntity"])) {
      const closest = findClosestEntity(ep["boundEntity"] as string, [...entityNames]);
      ep["boundEntity"] = closest ?? firstEntity;
    }
  }

  // Fix workflowStubs
  const stubs = (obj["workflowStubs"] as Array<Record<string, unknown>>) ?? [];
  const validStubs: Array<Record<string, unknown>> = [];
  for (const stub of stubs) {
    const trigger = stub["trigger"] as Record<string, unknown>;
    if (trigger && typeof trigger["entity"] === "string") {
      if (!entityNames.has(trigger["entity"])) {
        const closest = findClosestEntity(trigger["entity"] as string, [...entityNames]);
        trigger["entity"] = closest ?? firstEntity;
      }
    }

    // Fix integration reference
    if (typeof stub["integration"] === "string" && !registeredIds.has(stub["integration"])) {
      const closest = findClosestIntegration(stub["integration"] as string, [...registeredIds]);
      if (closest) {
        stub["integration"] = closest;
      } else {
        // Drop stub if integration can't be resolved
        continue;
      }
    }

    // Fix action reference
    if (typeof stub["integration"] === "string" && typeof stub["action"] === "string") {
      const integration = registry.find((i) => i.id === stub["integration"]);
      if (integration) {
        const actionIds = new Set(integration.actions.map((a) => a.id));
        if (!actionIds.has(stub["action"] as string)) {
          // Use first available action
          const firstAction = integration.actions[0];
          if (firstAction) {
            stub["action"] = firstAction.id;
          } else {
            continue;
          }
        }
      }
    }

    validStubs.push(stub);
  }
  obj["workflowStubs"] = validStubs;

  // Fix integrationHooks
  const hooks = (obj["integrationHooks"] as Array<Record<string, unknown>>) ?? [];
  const validHooks = hooks.filter((hook) => {
    return (
      typeof hook["integrationId"] === "string" &&
      registeredIds.has(hook["integrationId"]) &&
      typeof hook["boundEntity"] === "string" &&
      entityNames.has(hook["boundEntity"])
    );
  });
  obj["integrationHooks"] = validHooks;

  return JSON.stringify(obj);
}

// --------------- String Matching Helpers ---------------

function findClosestEntity(ref: string, entityNames: string[]): string | null {
  const lower = ref.toLowerCase();
  for (const name of entityNames) {
    if (
      name.toLowerCase().includes(lower) ||
      lower.includes(name.toLowerCase())
    ) {
      return name;
    }
  }
  return entityNames[0] ?? null;
}

function findClosestIntegration(
  ref: string,
  integrationIds: string[]
): string | null {
  const lower = ref.toLowerCase();
  for (const id of integrationIds) {
    if (id.toLowerCase().includes(lower) || lower.includes(id)) {
      return id;
    }
  }
  return null;
}

// --------------- Main Repair Orchestrator ---------------

export async function attemptRepair(
  stage: PipelineStage,
  rawOutput: string,
  validationErrors: ValidationError[],
  validationFn: (raw: string) => ValidationResult,
  failedProvider: AIProvider,
  failedModel: string,
  originalPrompt: string,
  dataSchema?: DataSchema
): Promise<RepairResult> {
  const attempts: RepairAttempt[] = [];
  let currentRaw = rawOutput;

  const log = logger.child({ stage, component: "RepairEngine" });

  // ---- Attempt 1: Structural Repair ----
  const hasMalformed = validationErrors.some(
    (e) =>
      e.code === "MALFORMED_JSON" ||
      e.code === "TRUNCATED_OUTPUT" ||
      e.code === "UNKNOWN"
  );

  if (hasMalformed || rawOutput.includes("```")) {
    log.info({ strategy: "STRUCTURAL_REPAIR" }, "Attempting structural repair");
    const repaired = structuralRepair(currentRaw);
    const attempt: RepairAttempt = {
      strategy: "STRUCTURAL_REPAIR",
      errorInput: validationErrors,
      outcome: "FAILED",
      timestamp: new Date().toISOString(),
    };

    if (repaired) {
      const recheck = validationFn(repaired);
      if (recheck.valid) {
        attempt.outcome = "REPAIRED";
        attempt.detail = "Extracted clean JSON and repaired structure";
        attempts.push(attempt);
        log.info({ outcome: "REPAIRED" }, "Structural repair succeeded");
        return { repairedContent: repaired, attempts, finallyValid: true };
      }
      currentRaw = repaired;
      attempt.outcome = "ESCALATED";
      attempt.detail = "Structure fixed but semantic errors remain";
    } else {
      attempt.detail = "Could not extract valid JSON structure";
    }
    attempts.push(attempt);
    log.info({ outcome: attempt.outcome }, "Structural repair result");
  }

  // ---- Attempt 2: Field Repair ----
  const hasFieldErrors = validationErrors.some(
    (e) =>
      e.code === "MISSING_FIELD" ||
      e.code === "WRONG_TYPE" ||
      e.code === "INVALID_ENUM" ||
      e.code === "MISSING_TENANT_ID" ||
      e.message?.includes("Expected") ||
      e.message?.includes("received null")
  );

  if (hasFieldErrors) {
    log.info({ strategy: "FIELD_REPAIR" }, "Attempting field repair");
    let repaired: string | null = null;

    if (stage === "intent_extraction") {
      repaired = fieldRepairIntent(currentRaw, validationErrors);
    } else if (stage === "schema_generation") {
      repaired = fieldRepairSchema(currentRaw, validationErrors);
    } else if (stage === "appspec_generation") {
      repaired = fieldRepairAppSpec(currentRaw, validationErrors, dataSchema);
    }

    const attempt: RepairAttempt = {
      strategy: "FIELD_REPAIR",
      errorInput: validationErrors,
      outcome: "FAILED",
      timestamp: new Date().toISOString(),
    };

    if (repaired) {
      const recheck = validationFn(repaired);
      if (recheck.valid) {
        attempt.outcome = "REPAIRED";
        attempt.detail = "Injected defaults for missing/invalid fields";
        attempts.push(attempt);
        log.info({ outcome: "REPAIRED" }, "Field repair succeeded");
        return { repairedContent: repaired, attempts, finallyValid: true };
      }
      currentRaw = repaired;
      attempt.outcome = "ESCALATED";
      attempt.detail = "Fields patched but other errors remain";
    } else {
      attempt.detail = "Could not parse object for field repair";
    }
    attempts.push(attempt);
    log.info({ outcome: attempt.outcome }, "Field repair result");
  }

  // ---- Attempt 3: Consistency Repair ----
  const hasConsistencyErrors = validationErrors.some(
    (e) =>
      e.code === "BROKEN_REFERENCE" ||
      e.code === "INCONSISTENT_RELATION" ||
      e.code === "PAGE_WITHOUT_ENDPOINT" ||
      e.code === "INVALID_INTEGRATION_REF" ||
      e.code === "INVALID_ACTION_REF" ||
      e.code === "WORKFLOW_INVALID_ENTITY"
  );

  if (hasConsistencyErrors && stage === "appspec_generation" && dataSchema) {
    log.info(
      { strategy: "CONSISTENCY_REPAIR" },
      "Attempting consistency repair"
    );
    const repaired = consistencyRepairAppSpec(
      currentRaw,
      validationErrors,
      dataSchema
    );

    const attempt: RepairAttempt = {
      strategy: "CONSISTENCY_REPAIR",
      errorInput: validationErrors,
      outcome: "FAILED",
      timestamp: new Date().toISOString(),
    };

    if (repaired) {
      const recheck = validationFn(repaired);
      if (recheck.valid) {
        attempt.outcome = "REPAIRED";
        attempt.detail =
          "Resolved broken cross-layer references deterministically";
        attempts.push(attempt);
        log.info({ outcome: "REPAIRED" }, "Consistency repair succeeded");
        return { repairedContent: repaired, attempts, finallyValid: true };
      }
      currentRaw = repaired;
      attempt.outcome = "ESCALATED";
      attempt.detail =
        "Some references fixed but further errors remain; escalating to AI";
    } else {
      attempt.detail = "Could not parse object for consistency repair";
    }
    attempts.push(attempt);
    log.info({ outcome: attempt.outcome }, "Consistency repair result");
  }

  // ---- Attempt 4: Targeted AI Retry ----
  // Re-prompt with specific error context (not a blind full retry)
  log.info({ strategy: "AI_RETRY" }, "Attempting targeted AI re-prompt");
  const errorSummary = validationErrors
    .slice(0, 5)
    .map((e) => `- [${e.code}] ${e.message}`)
    .join("\n");

  const repairPrompt = buildRepairPrompt(
    stage,
    currentRaw,
    errorSummary,
    dataSchema
  );

  const aiAttempt: RepairAttempt = {
    strategy: "AI_RETRY",
    errorInput: validationErrors,
    outcome: "FAILED",
    timestamp: new Date().toISOString(),
  };

  try {
    const aiResponse = await generateRepairWithAI(
      {
        stage: "repair",
        prompt: repairPrompt,
        responseFormat: "json",
        temperature: 0.1,
        maxTokens: 4000,
      },
      failedProvider,
      failedModel,
      false
    );

    const recheckRaw = aiResponse.content;
    const recheck = validationFn(recheckRaw);

    if (recheck.valid) {
      aiAttempt.outcome = "REPAIRED";
      aiAttempt.detail = `AI targeted repair succeeded (${aiResponse.provider}/${aiResponse.model})`;
      attempts.push(aiAttempt);
      log.info({ outcome: "REPAIRED", provider: aiResponse.provider }, "AI repair succeeded");
      return { repairedContent: recheckRaw, attempts, finallyValid: true };
    }

    currentRaw = recheckRaw;
    aiAttempt.outcome = "ESCALATED";
    aiAttempt.detail = "Targeted AI repair did not fully resolve errors";
    attempts.push(aiAttempt);

    // ---- Attempt 5: Escalated AI Retry (different provider) ----
    log.info(
      { strategy: "ESCALATED_AI_RETRY" },
      "Attempting escalated AI retry with different provider"
    );
    const escalatedAttempt: RepairAttempt = {
      strategy: "ESCALATED_AI_RETRY",
      errorInput: recheck.errors,
      outcome: "FAILED",
      timestamp: new Date().toISOString(),
    };

    const escalatedResponse = await generateRepairWithAI(
      {
        stage: "repair",
        prompt: repairPrompt,
        responseFormat: "json",
        temperature: 0.1,
        maxTokens: 4000,
      },
      failedProvider,
      failedModel,
      true // escalated
    );

    const finalRecheck = validationFn(escalatedResponse.content);
    if (finalRecheck.valid) {
      escalatedAttempt.outcome = "REPAIRED";
      escalatedAttempt.detail = `Escalated repair succeeded (${escalatedResponse.provider}/${escalatedResponse.model})`;
      attempts.push(escalatedAttempt);
      log.info({ outcome: "REPAIRED" }, "Escalated repair succeeded");
      return {
        repairedContent: escalatedResponse.content,
        attempts,
        finallyValid: true,
      };
    }

    escalatedAttempt.outcome = "FAILED";
    escalatedAttempt.detail = "All repair strategies exhausted";
    attempts.push(escalatedAttempt);
  } catch (error) {
    aiAttempt.outcome = "FAILED";
    aiAttempt.detail = `AI repair error: ${error instanceof Error ? error.message : String(error)}`;
    attempts.push(aiAttempt);
  }

  log.warn(
    { attempts: attempts.length, stage },
    "All repair strategies exhausted"
  );
  return { repairedContent: null, attempts, finallyValid: false };
}

function buildRepairPrompt(
  stage: PipelineStage,
  brokenOutput: string,
  errorSummary: string,
  dataSchema?: DataSchema
): string {
  const entityContext = dataSchema
    ? `\nAvailable entities: ${dataSchema.entities.map((e) => e.name).join(", ")}`
    : "";

  return `You are a JSON repair assistant. The following output failed validation.

STAGE: ${stage}
ERRORS:
${errorSummary}${entityContext}

BROKEN OUTPUT:
${brokenOutput.slice(0, 3000)}

Return ONLY the corrected JSON object. Fix exactly the listed errors. Do not add explanations.
Ensure all required fields are present. Return valid JSON only.`;
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}
