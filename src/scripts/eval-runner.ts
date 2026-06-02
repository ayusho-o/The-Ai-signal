/**
 * Evaluation runner — tests all 12 prompts against the pipeline
 * Run with: npx ts-node --project tsconfig.scripts.json src/scripts/eval-runner.ts
 */

import * as fs from "fs";
import * as path from "path";

// Dynamic import of pipeline modules
async function run() {
  // We need to set up module resolution for the @/ alias
  // This script should be run after build or with ts-node + paths

  const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
  const POLL_INTERVAL_MS = 2000;
  const TIMEOUT_MS = 120_000;

  const STANDARD_PROMPTS = [
    "Build a CRM for a real estate agency. Agents manage leads, properties, and deals. Admin sees analytics. WhatsApp notifications when a deal closes.",
    "Task manager for an engineering team. Tasks have due dates, assignees, priorities, and status. Team lead gets a Slack message when a task is overdue.",
    "Inventory system for a warehouse. Products, stock movements, suppliers. Low stock triggers an email alert.",
    "HR tool for a 50-person company. Track employees, leave requests, and performance reviews. Notify manager on Slack when leave is approved.",
    "E-commerce backend. Products, orders, customers, payments via Stripe. Order confirmation sent via Gmail.",
    "Event management platform. Organizers create events, attendees register, QR check-in at the door. Confirmation via WhatsApp.",
    "Project tracker. Projects, milestones, tasks. Sync tasks to Jira. Update a Google Sheet with weekly progress.",
  ];

  const EDGE_PROMPTS = [
    "An app.",
    "Build something like Notion for doctors.",
    "A platform with login, payments, roles, real-time chat, file uploads, native mobile, analytics, and a marketplace.",
    "A CRM but also a project manager but also an invoicing tool.",
    "Task manager, but make it smart.",
  ];

  const ALL_PROMPTS = [
    ...STANDARD_PROMPTS.map((p, i) => ({ prompt: p, type: "standard", index: i + 1 })),
    ...EDGE_PROMPTS.map((p, i) => ({ prompt: p, type: "edge", index: i + 1 })),
  ];

  console.log(`\n${"=".repeat(60)}`);
  console.log("OneAtlas Pipeline Evaluation Suite");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Prompts: ${ALL_PROMPTS.length} (${STANDARD_PROMPTS.length} standard, ${EDGE_PROMPTS.length} edge)`);
  console.log(`${"=".repeat(60)}\n`);

  interface EvalResult {
    index: number;
    type: string;
    prompt: string;
    success: boolean;
    failedStage: string | null;
    repairStrategies: string[];
    retryCount: number;
    latencyMs: number;
    tokensUsed: number;
    estimatedCostUsd: number;
    integrationsDetected: string[];
    integrationsInWorkflows: string[];
    error: string | null;
  }

  const results: EvalResult[] = [];

  for (const { prompt, type, index } of ALL_PROMPTS) {
    console.log(`\n[${type.toUpperCase()} ${index}] ${prompt.slice(0, 60)}...`);
    const startMs = Date.now();

    try {
      // Start generation
      const startRes = await fetch(`${BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!startRes.ok) {
        const err = await startRes.json() as { error: string };
        throw new Error(`Failed to start: ${err.error}`);
      }

      const { jobId } = await startRes.json() as { jobId: string };
      console.log(`  Started job: ${jobId}`);

      // Poll until complete
      let job: Record<string, unknown> | null = null;
      const deadline = Date.now() + TIMEOUT_MS;

      while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        const statusRes = await fetch(`${BASE_URL}/api/generate/${jobId}`);
        job = await statusRes.json() as Record<string, unknown>;
        const status = job["status"] as string;
        if (status === "completed" || status === "failed") break;
        process.stdout.write(".");
      }

      if (!job) throw new Error("Timeout waiting for job");

      const success = job["status"] === "completed" && !!job["appSpec"];
      const totalLatencyMs = Date.now() - startMs;

      // Extract metrics
      let totalTokens = 0;
      let totalCost = 0;
      const repairStrategies: string[] = [];
      let failedStage: string | null = null;

      const stageMetrics = job["costBreakdown"] as Array<{
        stage: string;
        tokensUsed: number;
        estimatedCostUsd: number;
        status: string;
        repairAttempts: Array<{ strategy: string; outcome: string }>;
      }> ?? [];

      for (const stage of stageMetrics) {
        totalTokens += stage.tokensUsed ?? 0;
        totalCost += stage.estimatedCostUsd ?? 0;
        if (stage.status === "failed" && !failedStage) {
          failedStage = stage.stage;
        }
        for (const attempt of stage.repairAttempts ?? []) {
          repairStrategies.push(attempt.strategy);
        }
      }

      // Extract integration info
      const intent = job["intent"] as { integrations_requested?: string[] } | null;
      const appSpec = job["appSpec"] as {
        workflowStubs?: Array<{ integration: string }>;
      } | null;

      const integrationsDetected = intent?.integrations_requested ?? [];
      const integrationsInWorkflows = [
        ...new Set(appSpec?.workflowStubs?.map((s) => s.integration) ?? []),
      ];

      const result: EvalResult = {
        index,
        type,
        prompt: prompt.slice(0, 100),
        success,
        failedStage,
        repairStrategies: [...new Set(repairStrategies)],
        retryCount: repairStrategies.length,
        latencyMs: totalLatencyMs,
        tokensUsed: totalTokens,
        estimatedCostUsd: totalCost,
        integrationsDetected,
        integrationsInWorkflows,
        error: job["error"] as string | null,
      };

      results.push(result);

      console.log(
        `\n  Status: ${success ? "✓ SUCCESS" : "✗ FAILED"}`
      );
      if (!success) {
        console.log(`  Failed at: ${failedStage ?? "unknown"}`);
        if (job["error"]) console.log(`  Error: ${job["error"]}`);
      }
      console.log(`  Latency: ${(totalLatencyMs / 1000).toFixed(1)}s`);
      console.log(`  Tokens: ${totalTokens.toLocaleString()}`);
      console.log(`  Cost: $${totalCost.toFixed(5)}`);
      if (repairStrategies.length > 0) {
        console.log(`  Repairs: ${repairStrategies.join(", ")}`);
      }
      if (integrationsDetected.length > 0) {
        console.log(`  Integrations detected: ${integrationsDetected.join(", ")}`);
        console.log(`  Integrations in workflows: ${integrationsInWorkflows.join(", ")}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${errorMsg}`);
      results.push({
        index,
        type,
        prompt: prompt.slice(0, 100),
        success: false,
        failedStage: "request",
        repairStrategies: [],
        retryCount: 0,
        latencyMs: Date.now() - startMs,
        tokensUsed: 0,
        estimatedCostUsd: 0,
        integrationsDetected: [],
        integrationsInWorkflows: [],
        error: errorMsg,
      });
    }
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  const successRate = ((successCount / results.length) * 100).toFixed(1);

  const avgLatency =
    results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;
  const totalCost = results.reduce((sum, r) => sum + r.estimatedCostUsd, 0);

  // Count failure stages
  const stageFails: Record<string, number> = {};
  for (const r of results) {
    if (!r.success && r.failedStage) {
      stageFails[r.failedStage] = (stageFails[r.failedStage] ?? 0) + 1;
    }
  }

  const worstStage = Object.entries(stageFails).sort((a, b) => b[1] - a[1])[0];

  console.log(`\n${"=".repeat(60)}`);
  console.log("EVALUATION SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`Success rate: ${successCount}/${results.length} (${successRate}%)`);
  console.log(`Failures: ${failCount}`);
  console.log(`Avg latency: ${(avgLatency / 1000).toFixed(1)}s`);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);
  if (worstStage) {
    console.log(`Weakest stage: ${worstStage[0]} (${worstStage[1]} failures)`);
  }

  // Write results to file
  const outputDir = path.join(process.cwd(), "eval-results");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `eval-${timestamp}.json`);

  const output = {
    runAt: new Date().toISOString(),
    summary: {
      successCount,
      failCount,
      successRate: `${successRate}%`,
      avgLatencyMs: Math.round(avgLatency),
      totalCostUsd: totalCost,
      weakestStage: worstStage?.[0] ?? null,
      failuresByStage: stageFails,
    },
    results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${outputPath}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run().catch(console.error);
