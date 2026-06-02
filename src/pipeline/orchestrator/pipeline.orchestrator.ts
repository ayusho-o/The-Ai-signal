import { v4 as uuidv4 } from "uuid";
import type { PipelineJob, SSEEvent, PipelineStage } from "@/types";
import {
  createJob,
  updateJob,
  getJob,
  appendEvent,
  isJobTerminal,
} from "@/lib/job-store";
import { runIntentStage } from "../stages/intent.stage";
import { runSchemaStage } from "../stages/schema.stage";
import { runAppSpecStage } from "../stages/appspec.stage";
import { logger } from "@/lib/logger";

// ============================================================
// Pipeline Orchestrator
// Coordinates all 3 stages, emits SSE events, tracks metrics
// ============================================================

export async function startPipeline(prompt: string): Promise<string> {
  const jobId = uuidv4();
  createJob(jobId, prompt);
  updateJob(jobId, { status: "running" });

  logger.info({ jobId, prompt: prompt.slice(0, 100) }, "Pipeline started");

  // Run pipeline asynchronously (don't await — let caller poll/stream)
  void runPipelineAsync(jobId, prompt);

  return jobId;
}

async function runPipelineAsync(
  jobId: string,
  prompt: string
): Promise<void> {
  const log = logger.child({ jobId });
  const pipelineStart = Date.now();

  function emit(event: SSEEvent): void {
    appendEvent(jobId, event);
  }

  try {
    // ---- Stage 1: Intent Extraction ----
    emit({
      type: "stage_start",
      stage: "intent_extraction",
      timestamp: new Date().toISOString(),
      data: { message: "Extracting application intent..." },
    });

    updateJob(jobId, {
      stageMetrics: {
        ...getJob(jobId)!.stageMetrics,
        intent_extraction: {
          stage: "intent_extraction",
          status: "running",
          startedAt: new Date().toISOString(),
          repairAttempts: [],
        },
      },
    });

    const intentResult = await runIntentStage(prompt, jobId);

    const job1 = getJob(jobId)!;
    updateJob(jobId, {
      stageMetrics: {
        ...job1.stageMetrics,
        intent_extraction: intentResult.metrics,
      },
      intent: intentResult.intent ?? undefined,
      totalCostUsd: job1.totalCostUsd + (intentResult.metrics.estimatedCostUsd ?? 0),
    });

    if (!intentResult.intent) {
      emit({
        type: "stage_failed",
        stage: "intent_extraction",
        timestamp: new Date().toISOString(),
        error: intentResult.error,
        repairLog: intentResult.repairAttempts,
      });
      updateJob(jobId, {
        status: "failed",
        error: intentResult.error,
        totalLatencyMs: Date.now() - pipelineStart,
      });
      emit({
        type: "generation_failed",
        timestamp: new Date().toISOString(),
        error: intentResult.error,
      });
      return;
    }

    emit({
      type: "stage_complete",
      stage: "intent_extraction",
      timestamp: new Date().toISOString(),
      data: intentResult.intent,
      repairLog: intentResult.repairAttempts,
    });

    // Check for clarification_required — still continue with assumptions
    if (intentResult.intent.clarification_required) {
      log.info("Clarification required but proceeding with assumptions");
    }

    // ---- Stage 2: Schema Generation ----
    emit({
      type: "stage_start",
      stage: "schema_generation",
      timestamp: new Date().toISOString(),
      data: { message: "Generating data schema..." },
    });

    const job2pre = getJob(jobId)!;
    updateJob(jobId, {
      stageMetrics: {
        ...job2pre.stageMetrics,
        schema_generation: {
          stage: "schema_generation",
          status: "running",
          startedAt: new Date().toISOString(),
          repairAttempts: [],
        },
      },
    });

    const schemaResult = await runSchemaStage(intentResult.intent, jobId);

    const job2 = getJob(jobId)!;
    updateJob(jobId, {
      stageMetrics: {
        ...job2.stageMetrics,
        schema_generation: schemaResult.metrics,
      },
      schema: schemaResult.schema ?? undefined,
      totalCostUsd:
        job2.totalCostUsd + (schemaResult.metrics.estimatedCostUsd ?? 0),
    });

    if (!schemaResult.schema) {
      emit({
        type: "stage_failed",
        stage: "schema_generation",
        timestamp: new Date().toISOString(),
        error: schemaResult.error,
        repairLog: schemaResult.repairAttempts,
      });
      updateJob(jobId, {
        status: "failed",
        error: schemaResult.error,
        totalLatencyMs: Date.now() - pipelineStart,
      });
      emit({
        type: "generation_failed",
        timestamp: new Date().toISOString(),
        error: schemaResult.error,
      });
      return;
    }

    emit({
      type: "stage_complete",
      stage: "schema_generation",
      timestamp: new Date().toISOString(),
      data: schemaResult.schema,
      repairLog: schemaResult.repairAttempts,
    });

    // ---- Stage 3: AppSpec Generation ----
    emit({
      type: "stage_start",
      stage: "appspec_generation",
      timestamp: new Date().toISOString(),
      data: { message: "Generating application specification..." },
    });

    const job3pre = getJob(jobId)!;
    updateJob(jobId, {
      stageMetrics: {
        ...job3pre.stageMetrics,
        appspec_generation: {
          stage: "appspec_generation",
          status: "running",
          startedAt: new Date().toISOString(),
          repairAttempts: [],
        },
      },
    });

    const appSpecResult = await runAppSpecStage(
      schemaResult.schema,
      intentResult.intent,
      jobId
    );

    const job3 = getJob(jobId)!;
    const totalLatency = Date.now() - pipelineStart;

    updateJob(jobId, {
      stageMetrics: {
        ...job3.stageMetrics,
        appspec_generation: appSpecResult.metrics,
      },
      appSpec: appSpecResult.appSpec ?? undefined,
      totalCostUsd:
        job3.totalCostUsd + (appSpecResult.metrics.estimatedCostUsd ?? 0),
      totalLatencyMs: totalLatency,
    });

    if (!appSpecResult.appSpec) {
      emit({
        type: "stage_failed",
        stage: "appspec_generation",
        timestamp: new Date().toISOString(),
        error: appSpecResult.error,
        repairLog: appSpecResult.repairAttempts,
      });
      updateJob(jobId, {
        status: "failed",
        error: appSpecResult.error,
      });
      emit({
        type: "generation_failed",
        timestamp: new Date().toISOString(),
        error: appSpecResult.error,
      });
      return;
    }

    emit({
      type: "stage_complete",
      stage: "appspec_generation",
      timestamp: new Date().toISOString(),
      data: appSpecResult.appSpec,
      repairLog: appSpecResult.repairAttempts,
    });

    updateJob(jobId, { status: "completed" });

    const finalJob = getJob(jobId)!;
    emit({
      type: "generation_complete",
      timestamp: new Date().toISOString(),
      data: {
        appSpec: finalJob.appSpec,
        totalCostUsd: finalJob.totalCostUsd,
        totalLatencyMs: finalJob.totalLatencyMs,
      },
    });

    log.info(
      {
        totalLatencyMs: totalLatency,
        totalCostUsd: finalJob.totalCostUsd,
      },
      "Pipeline completed successfully"
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ error: errorMsg }, "Pipeline orchestrator error");

    updateJob(jobId, {
      status: "failed",
      error: errorMsg,
      totalLatencyMs: Date.now() - pipelineStart,
    });

    emit({
      type: "generation_failed",
      timestamp: new Date().toISOString(),
      error: errorMsg,
    });
  }
}

export async function triggerManualRepair(
  jobId: string,
  stage: PipelineStage,
  errorHint?: string
): Promise<{ success: boolean; message: string }> {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, message: "Job not found" };
  }

  if (isJobTerminal(jobId) && job.status === "completed") {
    return { success: false, message: "Job already completed" };
  }

  logger.info({ jobId, stage, errorHint }, "Manual repair triggered");

  // Re-run the specific stage based on current state
  if (stage === "intent_extraction") {
    const result = await runIntentStage(job.prompt, jobId);
    if (result.intent) {
      updateJob(jobId, {
        intent: result.intent,
        stageMetrics: { ...job.stageMetrics, intent_extraction: result.metrics },
      });
      return { success: true, message: "Intent re-extracted successfully" };
    }
    return { success: false, message: result.error ?? "Intent repair failed" };
  }

  if (stage === "schema_generation" && job.intent) {
    const result = await runSchemaStage(job.intent, jobId);
    if (result.schema) {
      updateJob(jobId, {
        schema: result.schema,
        stageMetrics: { ...job.stageMetrics, schema_generation: result.metrics },
      });
      return { success: true, message: "Schema re-generated successfully" };
    }
    return { success: false, message: result.error ?? "Schema repair failed" };
  }

  if (stage === "appspec_generation" && job.schema && job.intent) {
    const result = await runAppSpecStage(job.schema, job.intent, jobId);
    if (result.appSpec) {
      updateJob(jobId, {
        appSpec: result.appSpec,
        stageMetrics: {
          ...job.stageMetrics,
          appspec_generation: result.metrics,
        },
      });
      return { success: true, message: "AppSpec re-generated successfully" };
    }
    return {
      success: false,
      message: result.error ?? "AppSpec repair failed",
    };
  }

  return {
    success: false,
    message: `Cannot repair stage ${stage}: missing prerequisite data`,
  };
}
