import type {
  AppIntent,
  DataSchema,
  AppSpec,
  PipelineStage,
  StageMetrics,
  RepairAttempt,
} from "@/types";
import { generateWithAI } from "@/ai/gateway";
import { validateAppSpecOutput, parseAppSpec } from "../validators/appspec.validator";
import { attemptRepair } from "../repair/repair.engine";
import {
  APPSPEC_SYSTEM_PROMPT,
  buildAppSpecPrompt,
} from "../prompts/appspec.prompt";
import { getModelConfig } from "@/ai/routing.config";
import { logger } from "@/lib/logger";

const STAGE: PipelineStage = "appspec_generation";

export interface AppSpecStageResult {
  appSpec: AppSpec | null;
  metrics: StageMetrics;
  repairAttempts: RepairAttempt[];
  error?: string;
}

export async function runAppSpecStage(
  schema: DataSchema,
  intent: AppIntent,
  jobId: string
): Promise<AppSpecStageResult> {
  const log = logger.child({ stage: STAGE, jobId });
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const modelConfig = getModelConfig(STAGE);

  const metrics: StageMetrics = {
    stage: STAGE,
    status: "running",
    startedAt,
    repairAttempts: [],
    modelUsed: modelConfig.model,
    providerUsed: modelConfig.provider,
  };

  log.info(
    {
      entityCount: schema.entities.length,
      integrations: intent.integrations_requested,
    },
    "AppSpec generation started"
  );

  try {
    const aiResponse = await generateWithAI({
      stage: STAGE,
      prompt: buildAppSpecPrompt(schema, intent),
      systemPrompt: APPSPEC_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.2,
      maxTokens: 6000,
    });

    metrics.tokensUsed = aiResponse.tokensUsed;
    metrics.estimatedCostUsd = aiResponse.estimatedCostUsd;
    metrics.modelUsed = aiResponse.model;
    metrics.providerUsed = aiResponse.provider;

    // Create a validation closure that includes the schema
    const validateWithSchema = (raw: string) =>
      validateAppSpecOutput(raw, schema);

    // Validate
    const validation = validateWithSchema(aiResponse.content);
    log.info(
      { valid: validation.valid, errorCount: validation.errors.length },
      "AppSpec validation"
    );

    if (validation.valid) {
      const appSpec = parseAppSpec(aiResponse.content);
      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;

      log.info(
        {
          pageCount: appSpec?.pages.length,
          endpointCount: appSpec?.apiEndpoints.length,
          workflowCount: appSpec?.workflowStubs.length,
        },
        "AppSpec generated successfully"
      );
      return { appSpec, metrics, repairAttempts: [] };
    }

    // Attempt repair
    log.warn(
      { errors: validation.errors },
      "AppSpec validation failed — attempting repair"
    );

    const repairResult = await attemptRepair(
      STAGE,
      aiResponse.content,
      validation.errors,
      validateWithSchema,
      aiResponse.provider,
      aiResponse.model,
      buildAppSpecPrompt(schema, intent),
      schema
    );

    metrics.repairAttempts = repairResult.attempts;

    if (repairResult.finallyValid && repairResult.repairedContent) {
      const appSpec = parseAppSpec(repairResult.repairedContent);
      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;

      log.info(
        { repairStrategies: repairResult.attempts.map((a) => a.strategy) },
        "AppSpec repaired successfully"
      );
      return { appSpec, metrics, repairAttempts: repairResult.attempts };
    }

    // Partial success — return best-effort parsed spec
    const partialSpec = parseAppSpec(
      repairResult.repairedContent ?? aiResponse.content
    );
    if (partialSpec) {
      log.warn("Returning partial AppSpec (some validation errors remain)");
      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;
      return {
        appSpec: partialSpec,
        metrics,
        repairAttempts: repairResult.attempts,
        error: `Partial AppSpec: some validation errors could not be repaired`,
      };
    }

    metrics.status = "failed";
    metrics.completedAt = new Date().toISOString();
    metrics.latencyMs = Date.now() - startMs;

    return {
      appSpec: null,
      metrics,
      repairAttempts: repairResult.attempts,
      error: `AppSpec generation failed after repair: ${validation.errors[0]?.message}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ error: errorMsg }, "AppSpec stage error");

    metrics.status = "failed";
    metrics.completedAt = new Date().toISOString();
    metrics.latencyMs = Date.now() - startMs;

    return {
      appSpec: null,
      metrics,
      repairAttempts: [],
      error: errorMsg,
    };
  }
}
