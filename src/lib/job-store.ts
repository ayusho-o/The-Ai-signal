import type { PipelineJob, PipelineStage, SSEEvent } from "@/types";
import { logger } from "./logger";

// ============================================================
// In-Memory Job Store
// Stores jobs and SSE event history for replay on reconnect
// ============================================================

const jobs = new Map<string, PipelineJob>();
const jobEvents = new Map<string, SSEEvent[]>();

// SSE subscriber registry: jobId -> set of write functions
type SSEWriter = (event: SSEEvent) => void;
const sseSubscribers = new Map<string, Set<SSEWriter>>();

export function createJob(jobId: string, prompt: string): PipelineJob {
  const now = new Date().toISOString();
  const job: PipelineJob = {
    jobId,
    status: "pending",
    prompt,
    createdAt: now,
    updatedAt: now,
    stageMetrics: {
      intent_extraction: {
        stage: "intent_extraction",
        status: "pending",
        repairAttempts: [],
      },
      schema_generation: {
        stage: "schema_generation",
        status: "pending",
        repairAttempts: [],
      },
      appspec_generation: {
        stage: "appspec_generation",
        status: "pending",
        repairAttempts: [],
      },
    },
    totalCostUsd: 0,
    totalLatencyMs: 0,
  };

  jobs.set(jobId, job);
  jobEvents.set(jobId, []);
  logger.info({ jobId }, "Job created");
  return job;
}

export function getJob(jobId: string): PipelineJob | undefined {
  return jobs.get(jobId);
}

export function updateJob(
  jobId: string,
  updates: Partial<PipelineJob>
): PipelineJob | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  const updated: PipelineJob = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  jobs.set(jobId, updated);
  return updated;
}

export function getAllJobs(): PipelineJob[] {
  return Array.from(jobs.values());
}

// ---- SSE Event management ----

export function appendEvent(jobId: string, event: SSEEvent): void {
  const events = jobEvents.get(jobId);
  if (events) {
    events.push(event);
  }
  // Notify all subscribers
  const subscribers = sseSubscribers.get(jobId);
  if (subscribers) {
    for (const writer of subscribers) {
      try {
        writer(event);
      } catch {
        // subscriber disconnected, remove it
        subscribers.delete(writer);
      }
    }
  }
}

export function getJobEvents(jobId: string): SSEEvent[] {
  return jobEvents.get(jobId) ?? [];
}

export function subscribeToJob(jobId: string, writer: SSEWriter): () => void {
  if (!sseSubscribers.has(jobId)) {
    sseSubscribers.set(jobId, new Set());
  }
  const subscribers = sseSubscribers.get(jobId)!;
  subscribers.add(writer);

  // Return unsubscribe function
  return () => {
    subscribers.delete(writer);
    if (subscribers.size === 0) {
      sseSubscribers.delete(jobId);
    }
  };
}

export function isJobTerminal(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return true;
  return job.status === "completed" || job.status === "failed";
}
