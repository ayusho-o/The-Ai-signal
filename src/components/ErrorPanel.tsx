"use client";

import type { SSEEvent, PipelineJob, RepairAttempt } from "@/types";

interface Props {
  events: SSEEvent[];
  globalError: string | null;
  job: PipelineJob | null;
}

function RepairAttemptCard({ attempt }: { attempt: RepairAttempt }) {
  const outcomeColor =
    attempt.outcome === "REPAIRED"
      ? "border-atlas-success/30 bg-atlas-success/5"
      : attempt.outcome === "ESCALATED"
      ? "border-atlas-warning/30 bg-atlas-warning/5"
      : "border-atlas-error/30 bg-atlas-error/5";

  const outcomeBadge =
    attempt.outcome === "REPAIRED"
      ? "text-atlas-success"
      : attempt.outcome === "ESCALATED"
      ? "text-atlas-warning"
      : "text-atlas-error";

  return (
    <div className={`border rounded p-3 text-xs font-mono space-y-1 ${outcomeColor}`}>
      <div className="flex items-center gap-3">
        <span className="text-atlas-text font-semibold">{attempt.strategy}</span>
        <span className={`font-semibold ${outcomeBadge}`}>{attempt.outcome}</span>
        <span className="text-atlas-text-dim ml-auto">
          {new Date(attempt.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {attempt.detail && (
        <div className="text-atlas-text-dim">{attempt.detail}</div>
      )}
      {attempt.errorInput.length > 0 && (
        <div className="mt-2 space-y-0.5">
          <div className="text-atlas-text-dim">Errors addressed:</div>
          {attempt.errorInput.slice(0, 3).map((err, i) => (
            <div key={i} className="pl-2 text-atlas-error">
              [{err.code}] {err.message}
            </div>
          ))}
          {attempt.errorInput.length > 3 && (
            <div className="pl-2 text-atlas-text-dim">
              +{attempt.errorInput.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorPanel({ events, globalError, job }: Props) {
  const failedEvents = events.filter(
    (e) => e.type === "stage_failed" || e.type === "generation_failed"
  );

  const allRepairAttempts: { stage: string; attempt: RepairAttempt }[] = [];
  if (job) {
    for (const [stage, metrics] of Object.entries(job.stageMetrics)) {
      for (const attempt of metrics.repairAttempts) {
        allRepairAttempts.push({ stage, attempt });
      }
    }
  }

  const hasErrors =
    failedEvents.length > 0 || !!globalError || allRepairAttempts.length > 0;

  if (!hasErrors) {
    return (
      <div className="text-center py-16 text-atlas-text-dim font-mono text-sm">
        No errors recorded.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Global error */}
      {globalError && (
        <div>
          <h3 className="text-sm font-mono font-semibold text-atlas-error mb-2">
            Request Error
          </h3>
          <div className="bg-atlas-error/10 border border-atlas-error/30 rounded p-3 text-xs font-mono text-atlas-error">
            {globalError}
          </div>
        </div>
      )}

      {/* Stage failures */}
      {failedEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-mono font-semibold text-atlas-error mb-2">
            Stage Failures ({failedEvents.length})
          </h3>
          <div className="space-y-2">
            {failedEvents.map((event, i) => (
              <div
                key={i}
                className="bg-atlas-error/5 border border-atlas-error/30 rounded p-3 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-atlas-error font-semibold">
                    {event.stage ?? event.type}
                  </span>
                  <span className="text-atlas-text-dim">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.error && (
                  <div className="text-xs font-mono text-atlas-error">
                    {event.error}
                  </div>
                )}
                {event.repairLog && event.repairLog.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-atlas-text-dim font-mono">
                      Repair attempts during this stage:
                    </div>
                    {event.repairLog.map((attempt, j) => (
                      <RepairAttemptCard key={j} attempt={attempt} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All repair attempts from job metrics */}
      {allRepairAttempts.length > 0 && (
        <div>
          <h3 className="text-sm font-mono font-semibold text-atlas-warning mb-2">
            Repair Engine Log ({allRepairAttempts.length} attempts)
          </h3>
          <div className="space-y-2">
            {allRepairAttempts.map(({ stage, attempt }, i) => (
              <div key={i}>
                <div className="text-xs font-mono text-atlas-text-dim mb-1">
                  Stage: {stage}
                </div>
                <RepairAttemptCard attempt={attempt} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
