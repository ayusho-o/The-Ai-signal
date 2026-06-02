import { NextRequest, NextResponse } from "next/server";
import { startPipeline } from "@/pipeline/orchestrator/pipeline.orchestrator";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const prompt = body["prompt"];

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required and must be a string" },
        { status: 400 }
      );
    }

    if (prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt cannot be empty" },
        { status: 400 }
      );
    }

    if (prompt.length > 5000) {
      return NextResponse.json(
        { error: "prompt cannot exceed 5000 characters" },
        { status: 400 }
      );
    }

    const jobId = await startPipeline(prompt.trim());

    logger.info({ jobId }, "Generation job started");

    return NextResponse.json(
      { jobId, message: "Pipeline started. Stream progress at /api/generate/" + jobId + "/stream" },
      { status: 202 }
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to start pipeline"
    );
    return NextResponse.json(
      { error: "Failed to start generation pipeline" },
      { status: 500 }
    );
  }
}
