import { NextRequest, NextResponse } from "next/server";
import { triggerManualRepair } from "@/pipeline/orchestrator/pipeline.orchestrator";
import { getJob } from "@/lib/job-store";
import type { PipelineStage } from "@/types";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

const VALID_STAGES: PipelineStage[] = [
  "intent_extraction",
  "schema_generation",
  "appspec_generation",
];

export async function POST(req: NextRequest, context: RouteContext) {
  const { jobId } = await context.params;

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = await req.json() as Record<string, unknown>;
  const stage = body["stage"] as string;
  const errorHint = body["errorHint"] as string | undefined;

  if (!stage || !VALID_STAGES.includes(stage as PipelineStage)) {
    return NextResponse.json(
      {
        error: `stage is required. Valid values: ${VALID_STAGES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const result = await triggerManualRepair(
    jobId,
    stage as PipelineStage,
    errorHint
  );

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
