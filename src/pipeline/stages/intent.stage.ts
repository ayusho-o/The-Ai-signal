import type {
  AppIntent,
  PipelineStage,
  StageMetrics,
  RepairAttempt,
} from "@/types";
import { generateWithAI } from "@/ai/gateway";
import { validateIntentOutput, parseIntent } from "../validators/intent.validator";
import { attemptRepair } from "../repair/repair.engine";
import {
  INTENT_SYSTEM_PROMPT,
  buildIntentPrompt,
} from "../prompts/intent.prompt";
import { getModelConfig } from "@/ai/routing.config";
import { logger } from "@/lib/logger";

const STAGE: PipelineStage = "intent_extraction";

export interface IntentStageResult {
  intent: AppIntent | null;
  metrics: StageMetrics;
  repairAttempts: RepairAttempt[];
  error?: string;
}

export async function runIntentStage(
  prompt: string,
  jobId: string
): Promise<IntentStageResult> {
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

  log.info({ prompt: prompt.slice(0, 100) }, "Intent extraction started");

  try {
    // Check for vague/minimal prompt
    const wordCount = prompt.trim().split(/\s+/).length;
    if (wordCount < 3) {
      log.info("Prompt too vague — returning clarification_required");
      const intent: AppIntent = {
        appName: "Unknown App",
        appType: "custom",
        features: [],
        entities: [],
        integrations_requested: [],
        assumptions: ["Prompt was too vague to extract meaningful intent"],
        clarification_required: {
          flag: true,
          question:
            "What type of application do you want to build and what is its main purpose?",
        },
      };

      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;
      metrics.tokensUsed = 0;
      metrics.estimatedCostUsd = 0;

      return { intent, metrics, repairAttempts: [] };
    }

    // Generate intent
    const aiResponse = await generateWithAI({
      stage: STAGE,
      prompt: buildIntentPrompt(prompt),
      systemPrompt: INTENT_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.3,
      maxTokens: 2000,
    });

    metrics.tokensUsed = aiResponse.tokensUsed;
    metrics.estimatedCostUsd = aiResponse.estimatedCostUsd;
    metrics.modelUsed = aiResponse.model;
    metrics.providerUsed = aiResponse.provider;

    // Validate
    const validation = validateIntentOutput(aiResponse.content);
    log.info(
      { valid: validation.valid, errorCount: validation.errors.length },
      "Intent validation"
    );

    if (validation.valid) {
      const intent = parseIntent(aiResponse.content);
      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;

      log.info({ appName: intent?.appName, appType: intent?.appType }, "Intent extracted successfully");
      return { intent, metrics, repairAttempts: [] };
    }

    // Attempt repair
    log.warn(
      { errors: validation.errors },
      "Intent validation failed — attempting repair"
    );

    const repairResult = await attemptRepair(
      STAGE,
      aiResponse.content,
      validation.errors,
      validateIntentOutput,
      aiResponse.provider,
      aiResponse.model,
      prompt
    );

    metrics.repairAttempts = repairResult.attempts;

    if (repairResult.finallyValid && repairResult.repairedContent) {
      const intent = parseIntent(repairResult.repairedContent);
      metrics.status = "completed";
      metrics.completedAt = new Date().toISOString();
      metrics.latencyMs = Date.now() - startMs;

      log.info(
        { repairStrategies: repairResult.attempts.map((a) => a.strategy) },
        "Intent repaired successfully"
      );
      return { intent, metrics, repairAttempts: repairResult.attempts };
    }

    metrics.status = "failed";
    metrics.completedAt = new Date().toISOString();
    metrics.latencyMs = Date.now() - startMs;

    return {
      intent: null,
      metrics,
      repairAttempts: repairResult.attempts,
      error: `Intent extraction failed after repair attempts: ${validation.errors[0]?.message}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ error: errorMsg }, "Intent stage error");

    metrics.status = "failed";
    metrics.completedAt = new Date().toISOString();
    metrics.latencyMs = Date.now() - startMs;

    return {
      intent: null,
      metrics,
      repairAttempts: [],
      error: errorMsg,
    };
  }
}
