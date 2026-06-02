import type {
  AppIntent,
  DataSchema,
  PipelineStage,
  StageMetrics,
  RepairAttempt,
} from "@/types";
import { generateWithAI } from "@/ai/gateway";
import { validateSchemaOutput, parseSchema } from "../validators/schema.validator";
import { attemptRepair } from "../repair/repair.engine";
import {
  SCHEMA_SYSTEM_PROMPT,
  buildSchemaPrompt,
} from "../prompts/schema.prompt";
import { getModelConfig } from "@/ai/routing.config";
import { logger } from "@/lib/logger";

const STAGE: PipelineStage = "schema_generation";

export interface SchemaStageResult {
  schema: DataSchema | null;
  metrics: StageMetrics;
  repairAttempts: RepairAttempt[];
  error?: string;
}

export async function runSchemaStage(
  intent: AppIntent,
  jobId: string
): Promise<SchemaStageResult> {
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
    { appName: intent.appName, entityCount: intent.entities.length },
    "Schema generation started"
  );

  try {
    const aiResponse = await generateWithAI({
      stage: STAGE,
      prompt: buildSchemaPrompt(intent),
      systemPrompt: SCHEMA_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.2,
      maxTokens: 4000,
    });

    metrics.tokensUsed = aiResponse.tokensUsed;
    metrics.estimatedCostUsd = aiResponse.estimatedCostUsd;
    metrics.modelUsed = aiResponse.model;
    metrics.providerUsed = aiResponse.provider;

    // Validate
    const validation = validateSchemaOutput(aiResponse.content);
    log.info(
      { valid: validation.valid, errorCount: validation.errors.length },
      "Schema validation"
    );

    if (validation.valid) {
      const schema = parseSchema(aiResponse.content);
      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;

      log.info(
        { entityCount: schema?.entities.length },
        "Schema generated successfully"
      );
      return { schema, metrics, repairAttempts: [] };
    }

    // Attempt repair
    log.warn(
      { errors: validation.errors },
      "Schema validation failed — attempting repair"
    );

    const repairResult = await attemptRepair(
      STAGE,
      aiResponse.content,
      validation.errors,
      validateSchemaOutput,
      aiResponse.provider,
      aiResponse.model,
      buildSchemaPrompt(intent)
    );

    metrics.repairAttempts = repairResult.attempts;

    if (repairResult.finallyValid && repairResult.repairedContent) {
      const schema = parseSchema(repairResult.repairedContent);
      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;

      log.info(
        { repairStrategies: repairResult.attempts.map((a) => a.strategy) },
        "Schema repaired successfully"
      );
      return { schema, metrics, repairAttempts: repairResult.attempts };
    }

    metrics.status = "failed";
    metrics.completedAt = new Date().toISOString();
    metrics.latencyMs = Date.now() - startMs;

    return {
      schema: null,
      metrics,
      repairAttempts: repairResult.attempts,
      error: `Schema generation failed after repair: ${validation.errors[0]?.message}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ error: errorMsg }, "Schema stage error");

    metrics.status = "failed";
    metrics.completedAt = new Date().toISOString();
    metrics.latencyMs = Date.now() - startMs;

    return {
      schema: null,
      metrics,
      repairAttempts: [],
      error: errorMsg,
    };
  }
}
