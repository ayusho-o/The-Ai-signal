"use client";

import type { SSEEvent, PipelineJob, PipelineStage, RepairAttempt } from "@/types";

interface Props {
  events: SSEEvent[];
  job: PipelineJob | null;
  isRunning: boolean;
}

type StageInfo = {
  id: PipelineStage;
  label: string;
  description: string;
};

const STAGES: StageInfo[] = [
  {
    id: "intent_extraction",
    label: "Intent Extraction",
    description: "Parse prompt → AppIntent",
  },
  {
    id: "schema_generation",
    label: "Schema Generation",
    description: "AppIntent → DataSchema",
  },
  {
    id: "appspec_generation",
    label: "AppSpec Generation",
    description: "DataSchema → AppSpec",
  },
];

function getStageStatus(
  stage: PipelineStage,
  events: SSEEvent[]
): "pending" | "running" | "completed" | "failed" {
  const stageEvents = events.filter((e) => e.stage === stage);
  if (stageEvents.some((e) => e.type === "stage_failed")) return "failed";
  if (stageEvents.some((e) => e.type === "stage_complete")) return "completed";
  if (stageEvents.some((e) => e.type === "stage_start")) return "running";
  return "pending";
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "text-atlas-text-dim border-atlas-border",
    running: "text-atlas-warning border-atlas-warning/30 bg-atlas-warning/5",
    completed: "text-atlas-success border-atlas-success/30 bg-atlas-success/5",
    failed: "text-atlas-error border-atlas-error/30 bg-atlas-error/5",
  };
  const dots: Record<string, string> = {
    pending: "bg-atlas-muted",
    running: "bg-atlas-warning pulse-dot",
    completed: "bg-atlas-success",
    failed: "bg-atlas-error",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono ${colors[status] ?? colors["pending"]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? dots["pending"]}`} />
      {status}
    </span>
  );
}

function RepairLog({ attempts }: { attempts: RepairAttempt[] }) {
  if (!attempts || attempts.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="text-xs text-atlas-text-dim font-mono">Repair log:</div>
      {attempts.map((attempt, i) => (
        <div
          key={i}
          className={`text-xs font-mono px-3 py-1.5 rounded border ${
            attempt.outcome === "REPAIRED"
              ? "bg-atlas-success/5 border-atlas-success/20 text-atlas-success"
              : attempt.outcome === "ESCALATED"
              ? "bg-atlas-warning/5 border-atlas-warning/20 text-atlas-warning"
              : "bg-atlas-error/5 border-atlas-error/20 text-atlas-error"
          }`}
        >
          <span className="text-atlas-text-dim">[{attempt.strategy}]</span>{" "}
          {attempt.outcome}
          {attempt.detail && (
            <span className="text-atlas-text-dim"> — {attempt.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function StageTracker({ events, job, isRunning }: Props) {
  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Pipeline status header */}
      <div className="flex items-center gap-3">
        <div className="text-xs font-mono text-atlas-text-dim">
          Pipeline Status:
        </div>
        {isRunning && (
          <StatusBadge status="running" />
        )}
        {isComplete && <StatusBadge status="completed" />}
        {isFailed && <StatusBadge status="failed" />}
        {!isRunning && !isComplete && !isFailed && (
          <StatusBadge status="pending" />
        )}
        {job && (
          <div className="ml-auto text-xs font-mono text-atlas-text-dim">
            {job.totalLatencyMs > 0 && `${(job.totalLatencyMs / 1000).toFixed(1)}s`}
            {job.totalCostUsd > 0 && ` · $${job.totalCostUsd.toFixed(5)}`}
          </div>
        )}
      </div>

      {/* Stage cards */}
      <div className="space-y-3">
        {STAGES.map((stage) => {
          const status = getStageStatus(stage.id, events);
          const metrics = job?.stageMetrics?.[stage.id];
          const repairAttempts = metrics?.repairAttempts ?? [];

          return (
            <div
              key={stage.id}
              className={`border rounded p-4 transition-colors ${
                status === "completed"
                  ? "border-atlas-success/30 bg-atlas-success/3"
                  : status === "failed"
                  ? "border-atlas-error/30 bg-atlas-error/3"
                  : status === "running"
                  ? "border-atlas-warning/30 bg-atlas-warning/3"
                  : "border-atlas-border bg-atlas-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-mono font-semibold text-atlas-text">
                    {stage.label}
                  </div>
                  <div className="text-xs font-mono text-atlas-text-dim mt-0.5">
                    {stage.description}
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              {/* Metrics */}
              {metrics && (metrics.latencyMs ?? 0) > 0 && (
                <div className="mt-2 flex gap-4 text-xs font-mono text-atlas-text-dim">
                  {metrics.latencyMs && (
                    <span>{(metrics.latencyMs / 1000).toFixed(2)}s</span>
                  )}
                  {metrics.tokensUsed && (
                    <span>{metrics.tokensUsed.toLocaleString()} tokens</span>
                  )}
                  {metrics.estimatedCostUsd && (
                    <span>${metrics.estimatedCostUsd.toFixed(5)}</span>
                  )}
                  {metrics.providerUsed && metrics.modelUsed && (
                    <span>
                      {metrics.providerUsed}/{metrics.modelUsed.split("-").slice(0, 2).join("-")}
                    </span>
                  )}
                </div>
              )}

              {/* Repair log */}
              {repairAttempts.length > 0 && (
                <RepairLog attempts={repairAttempts} />
              )}
            </div>
          );
        })}
      </div>

      {/* Event log */}
      {events.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-mono text-atlas-text-dim mb-2">
            Event log ({events.filter((e) => e.type !== "heartbeat").length} events):
          </div>
          <div className="bg-atlas-surface border border-atlas-border rounded p-3 space-y-1 max-h-64 overflow-y-auto">
            {events
              .filter((e) => e.type !== "heartbeat")
              .map((event, i) => (
                <div key={i} className="flex gap-3 text-xs font-mono">
                  <span className="text-atlas-text-dim shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={
                      event.type === "stage_failed" ||
                      event.type === "generation_failed"
                        ? "text-atlas-error"
                        : event.type === "stage_complete" ||
                          event.type === "generation_complete"
                        ? "text-atlas-success"
                        : event.type === "stage_start"
                        ? "text-atlas-warning"
                        : "text-atlas-text-dim"
                    }
                  >
                    {event.type}
                    {event.stage ? `:${event.stage}` : ""}
                  </span>
                  {event.error && (
                    <span className="text-atlas-error truncate">
                      — {event.error}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 && !isRunning && (
        <div className="text-center py-16 text-atlas-text-dim font-mono text-sm">
          Enter a prompt above and click Generate to start the pipeline.
        </div>
      )}
    </div>
  );
}
