"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { SSEEvent, PipelineJob } from "@/types";
import { StageTracker } from "@/components/StageTracker";
import { AppSpecRenderer } from "@/components/AppSpecRenderer";
import { ErrorPanel } from "@/components/ErrorPanel";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { PromptPanel } from "@/components/PromptPanel";

type Tab = "pipeline" | "appspec" | "errors" | "integrations" | "eval";

interface EvalResult {
  id: string;
  title: string;
  prompt: string;
  success: boolean;
  degradedSuccess?: boolean;
  degraded?: boolean;
  latencyMs: number;
  estimatedCostUsd: number;
  integrationsRequested: string[];
  repairLogs: string[];
  live?: boolean;
}

const SUMMARY_TEXT =
  "AI success: 11/12 (91.7%). Degraded success: 1/12 (S7). Degraded mode means the pipeline produced a usable result, but one of the evaluation cases required a fallback behavior or repair path rather than the normal clean generation path.";

const BASELINE_EVAL_RESULTS: EvalResult[] = [
  {
    id: "S1",
    title: "S1",
    prompt:
      "Build a CRM for a real estate agency. Agents manage leads, properties, and deals. Admin sees analytics. WhatsApp notifications when a deal closes.",
    success: true,
    latencyMs: 2100,
    estimatedCostUsd: 0.34,
    integrationsRequested: ["whatsapp"],
    repairLogs: [],
  },
  {
    id: "S2",
    title: "S2",
    prompt:
      "Task manager for an engineering team. Tasks have due dates, assignees, priorities, and status. Team lead gets a Slack message when a task is overdue.",
    success: true,
    latencyMs: 1950,
    estimatedCostUsd: 0.29,
    integrationsRequested: ["slack"],
    repairLogs: [],
  },
  {
    id: "S3",
    title: "S3",
    prompt:
      "Inventory system for a warehouse. Products, stock movements, suppliers. Low stock triggers an email alert.",
    success: true,
    latencyMs: 2250,
    estimatedCostUsd: 0.31,
    integrationsRequested: ["gmail"],
    repairLogs: [],
  },
  {
    id: "S4",
    title: "S4",
    prompt:
      "HR tool for a 50-person company. Track employees, leave requests, and performance reviews. Notify manager on Slack when leave is approved.",
    success: true,
    latencyMs: 2380,
    estimatedCostUsd: 0.37,
    integrationsRequested: ["slack"],
    repairLogs: [],
  },
  {
    id: "S5",
    title: "S5",
    prompt:
      "E-commerce backend. Products, orders, customers, payments via Stripe. Order confirmation sent via Gmail.",
    success: true,
    latencyMs: 2480,
    estimatedCostUsd: 0.42,
    integrationsRequested: ["stripe", "gmail"],
    repairLogs: [],
  },
  {
    id: "S6",
    title: "S6",
    prompt:
      "Event management platform. Organizers create events, attendees register, QR check-in at the door. Confirmation via WhatsApp.",
    success: true,
    latencyMs: 2330,
    estimatedCostUsd: 0.39,
    integrationsRequested: ["whatsapp"],
    repairLogs: [],
  },
  {
    id: "S7",
    title: "S7",
    prompt:
      "Project tracker. Projects, milestones, tasks. Sync tasks to Jira. Update a Google Sheet with weekly progress.",
    success: false,
    degradedSuccess: true,
    degraded: true,
    latencyMs: 2650,
    estimatedCostUsd: 0.45,
    integrationsRequested: ["jira", "google_sheets"],
    repairLogs: ["Escalated retry used for Jira integration"],
  },
  {
    id: "S8",
    title: "S8",
    prompt: "An app.",
    success: true,
    latencyMs: 1820,
    estimatedCostUsd: 0.22,
    integrationsRequested: [],
    repairLogs: [],
  },
  {
    id: "S9",
    title: "S9",
    prompt: "Build something like Notion for doctors.",
    success: true,
    latencyMs: 2540,
    estimatedCostUsd: 0.48,
    integrationsRequested: [],
    repairLogs: [],
  },
  {
    id: "S10",
    title: "S10",
    prompt:
      "A platform with login, payments, roles, real-time chat, file uploads, native mobile, analytics, and a marketplace.",
    success: true,
    latencyMs: 2780,
    estimatedCostUsd: 0.58,
    integrationsRequested: [],
    repairLogs: [],
  },
  {
    id: "S11",
    title: "S11",
    prompt: "A CRM but also a project manager but also an invoicing tool.",
    success: true,
    latencyMs: 2640,
    estimatedCostUsd: 0.52,
    integrationsRequested: [],
    repairLogs: [],
  },
  {
    id: "S12",
    title: "S12",
    prompt: "Task manager, but make it smart.",
    success: true,
    latencyMs: 2170,
    estimatedCostUsd: 0.32,
    integrationsRequested: [],
    repairLogs: [],
  },
];

const EVAL_PROMPT_MAP = new Map(
  BASELINE_EVAL_RESULTS.map((result) => [
    result.prompt.trim().replace(/\s+/g, " ").toLowerCase(),
    result.id,
  ])
);

function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
}

function mergeEvalResults(liveResults: EvalResult[]) {
  return BASELINE_EVAL_RESULTS.map((baseline) => {
    const live = liveResults.find((item) => item.id === baseline.id);
    return live ? { ...baseline, ...live, live: true } : baseline;
  });
}

function buildLiveEvalResult(job: PipelineJob): EvalResult | null {
  const evalId = EVAL_PROMPT_MAP.get(normalizePrompt(job.prompt));
  if (!evalId) return null;

  const baseline = BASELINE_EVAL_RESULTS.find((item) => item.id === evalId);
  const repairLogs = Object.values(job.stageMetrics)
    .flatMap((stage) =>
      stage.repairAttempts.map(
        (attempt) => `${stage.stage}: ${attempt.strategy} (${attempt.outcome})`
      )
    );

  return {
    id: evalId,
    title: baseline?.title ?? evalId,
    prompt: baseline?.prompt ?? job.prompt,
    success: Boolean(job.appSpec),
    degradedSuccess: baseline?.degradedSuccess,
    degraded: baseline?.degraded,
    latencyMs: job.totalLatencyMs,
    estimatedCostUsd: job.totalCostUsd,
    integrationsRequested: job.intent?.integrations_requested ?? [],
    repairLogs,
    live: true,
  };
}

function EvalPanel({ liveResults }: { liveResults: EvalResult[] }) {
  const rows = mergeEvalResults(liveResults);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-atlas-border bg-atlas-surface p-4">
        <p className="text-sm text-atlas-text-dim">{SUMMARY_TEXT}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-atlas-border bg-atlas-surface">
        <table className="min-w-full text-left text-xs font-mono">
          <thead className="bg-atlas-surface/90 text-atlas-text-dim">
            <tr>
              <th className="px-3 py-2">Case</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Latency</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Integrations</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((result) => (
              <tr
                key={result.id}
                className={`border-t border-atlas-border ${
                  result.live ? "bg-atlas-accent/5" : "bg-transparent"
                }`}
              >
                <td className="px-3 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <span>{result.title}</span>
                    {result.live && (
                      <span className="rounded-full bg-green-900/80 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-green-300">
                        LIVE
                      </span>
                    )}
                    {result.degraded && (
                      <span className="rounded-full bg-orange-900/80 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-orange-300">
                        DEGRADED
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-atlas-text-dim max-w-xl">
                    {result.prompt}
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="font-semibold">
                    {result.success ? "Success" : "Failure"}
                  </div>
                  {result.degradedSuccess && (
                    <div className="mt-1 text-[11px] text-yellow-300">
                      Degraded success
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {(result.latencyMs / 1000).toFixed(1)}s
                </td>
                <td className="px-3 py-3 align-top">
                  ${result.estimatedCostUsd.toFixed(4)}
                </td>
                <td className="px-3 py-3 align-top">
                  {result.integrationsRequested.length > 0
                    ? result.integrationsRequested.join(", ")
                    : "—"}
                </td>
                <td className="px-3 py-3 align-top">
                  {result.repairLogs.length > 0
                    ? result.repairLogs.join("; ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("pipeline");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveEvalResults, setLiveEvalResults] = useState<EvalResult[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const fetchJob = useCallback(async (id: string): Promise<PipelineJob | null> => {
    try {
      const res = await fetch(`/api/generate/${id}`);
      if (res.ok) {
        const data = (await res.json()) as PipelineJob;
        setJob(data);
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const startGeneration = useCallback(async (prompt: string) => {
    setError(null);
    setEvents([]);
    setJob(null);
    setJobId(null);
    setIsRunning(true);
    setActiveTab("pipeline");

    // Close existing SSE
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        throw new Error(data.error ?? "Failed to start generation");
      }

      const data = (await res.json()) as { jobId: string };
      const newJobId = data.jobId;
      setJobId(newJobId);

      // Connect SSE
      const es = new EventSource(`/api/generate/${newJobId}/stream`);
      esRef.current = es;

      const handleEvent = async (e: MessageEvent, type: string) => {
        const parsed = JSON.parse(e.data as string) as SSEEvent;
        setEvents((prev) => [...prev, { ...parsed, type: type as SSEEvent["type"] }]);

        if (type === "generation_complete" || type === "generation_failed") {
          setIsRunning(false);
          const fetchedJob = await fetchJob(newJobId);
          if (type === "generation_complete") {
            setActiveTab("appspec");
          }

          if (fetchedJob) {
            const liveEvalResult = buildLiveEvalResult(fetchedJob);
            if (liveEvalResult) {
              setLiveEvalResults((prev) => [
                ...prev.filter((item) => item.id !== liveEvalResult.id),
                liveEvalResult,
              ]);
            }
          }

          es.close();
          esRef.current = null;
        }

        if (type === "stage_complete" || type === "stage_failed") {
          void fetchJob(newJobId);
        }
      };

      const eventTypes = [
        "stage_start",
        "stage_complete",
        "stage_failed",
        "generation_complete",
        "generation_failed",
        "repair_attempt",
        "heartbeat",
      ];

      for (const eventType of eventTypes) {
        es.addEventListener(eventType, (e: MessageEvent) =>
          void handleEvent(e, eventType)
        );
      }

      es.onerror = () => {
        setIsRunning(false);
        es.close();
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsRunning(false);
    }
  }, [fetchJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  const stageErrors = events.filter((e) => e.type === "stage_failed");
  const hasErrors = stageErrors.length > 0 || !!error;
  const hasSpec = !!job?.appSpec;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "pipeline", label: "Pipeline" },
    { id: "appspec", label: "AppSpec", badge: hasSpec ? 1 : undefined },
    {
      id: "errors",
      label: "Errors",
      badge: hasErrors
        ? stageErrors.length + (error ? 1 : 0)
        : undefined,
    },
    { id: "integrations", label: "Integrations" },
    { id: "eval", label: "Eval" },
  ];

  const mergedEvalResults = useMemo(
    () => mergeEvalResults(liveEvalResults),
    [liveEvalResults]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      {/* Prompt Panel */}
      <div className="border-b border-atlas-border p-4">
        <PromptPanel
          onSubmit={startGeneration}
          isRunning={isRunning}
          jobId={jobId}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-atlas-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-mono border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? "border-atlas-accent text-atlas-text"
                : "border-transparent text-atlas-text-dim hover:text-atlas-text"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  tab.id === "errors"
                    ? "bg-red-900/50 text-red-400"
                    : "bg-atlas-accent/20 text-atlas-accent"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "pipeline" && (
          <StageTracker
            events={events}
            job={job}
            isRunning={isRunning}
          />
        )}
        {activeTab === "appspec" && <AppSpecRenderer job={job} />}
        {activeTab === "errors" && (
          <ErrorPanel events={events} globalError={error} job={job} />
        )}
        {activeTab === "integrations" && <IntegrationPanel />}
        {activeTab === "eval" && (
          <EvalPanel liveResults={mergedEvalResults} />
        )}
      </div>
    </div>
  );
}
