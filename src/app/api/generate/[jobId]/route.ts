import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const { jobId } = await context.params;

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Build cost breakdown
  const costBreakdown = Object.entries(job.stageMetrics).map(
    ([stage, metrics]) => ({
      stage,
      tokensUsed: metrics.tokensUsed ?? 0,
      estimatedCostUsd: metrics.estimatedCostUsd ?? 0,
      latencyMs: metrics.latencyMs ?? 0,
      modelUsed: metrics.modelUsed,
      providerUsed: metrics.providerUsed,
      status: metrics.status,
      repairAttempts: metrics.repairAttempts,
    })
  );

  return NextResponse.json({
    jobId: job.jobId,
    status: job.status,
    prompt: job.prompt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    intent: job.intent,
    schema: job.schema,
    appSpec: job.appSpec,
    error: job.error,
    costBreakdown,
    totalCostUsd: job.totalCostUsd,
    totalLatencyMs: job.totalLatencyMs,
  });
}
