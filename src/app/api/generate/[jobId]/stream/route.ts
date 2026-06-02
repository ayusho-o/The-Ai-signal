import { NextRequest } from "next/server";
import {
  getJobEvents,
  subscribeToJob,
  isJobTerminal,
  getJob,
} from "@/lib/job-store";
import type { SSEEvent } from "@/types";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

function formatSSE(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { jobId } = await context.params;

  const job = getJob(jobId);
  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Replay all prior events first (supports reconnect)
      const priorEvents = getJobEvents(jobId);
      for (const event of priorEvents) {
        controller.enqueue(encoder.encode(formatSSE(event)));
      }

      // If job is already terminal, close the stream
      if (isJobTerminal(jobId)) {
        controller.close();
        return;
      }

      // Subscribe to new events
      const unsubscribe = subscribeToJob(jobId, (event) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)));

          // Close stream when job reaches terminal state
          if (
            event.type === "generation_complete" ||
            event.type === "generation_failed"
          ) {
            setTimeout(() => {
              try {
                controller.close();
              } catch (closeErr) {
                logger.debug({ error: closeErr }, "SSE stream already closed on terminal event");
              }
            }, 100);
          }
        } catch (enqueueErr) {
          logger.warn({ jobId, error: enqueueErr }, "SSE enqueue failed — removing dead subscriber");
          unsubscribe();
        }
      });

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch (closeErr) {
          logger.debug({ jobId, error: closeErr }, "SSE stream already closed on client disconnect");
        }
      });

      // Heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (isJobTerminal(jobId)) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(
            encoder.encode(
              formatSSE({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              })
            )
          );
        } catch (heartbeatErr) {
          logger.debug({ jobId, error: heartbeatErr }, "SSE heartbeat failed — clearing interval");
          clearInterval(heartbeat);
        }
      }, 15000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
