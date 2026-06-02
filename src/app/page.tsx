"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { SSEEvent, PipelineJob, PipelineStage } from "@/types";
import { StageTracker } from "@/components/StageTracker";
import { AppSpecRenderer } from "@/components/AppSpecRenderer";
import { ErrorPanel } from "@/components/ErrorPanel";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { PromptPanel } from "@/components/PromptPanel";

type Tab = "pipeline" | "appspec" | "errors" | "integrations";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("pipeline");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const fetchJob = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/generate/${id}`);
      if (res.ok) {
        const data = await res.json() as PipelineJob;
        setJob(data);
      }
    } catch {
      // ignore
    }
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
        const data = await res.json() as { error: string };
        throw new Error(data.error ?? "Failed to start generation");
      }

      const data = await res.json() as { jobId: string };
      const newJobId = data.jobId;
      setJobId(newJobId);

      // Connect SSE
      const es = new EventSource(`/api/generate/${newJobId}/stream`);
      esRef.current = es;

      const handleEvent = (e: MessageEvent, type: string) => {
        const parsed = JSON.parse(e.data as string) as SSEEvent;
        setEvents((prev) => [...prev, { ...parsed, type: type as SSEEvent["type"] }]);

        if (type === "generation_complete" || type === "generation_failed") {
          setIsRunning(false);
          void fetchJob(newJobId);
          es.close();
          esRef.current = null;
          if (type === "generation_complete") {
            setActiveTab("appspec");
          }
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
          handleEvent(e, eventType)
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
  ];

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
        {activeTab === "appspec" && (
          <AppSpecRenderer job={job} />
        )}
        {activeTab === "errors" && (
          <ErrorPanel
            events={events}
            globalError={error}
            job={job}
          />
        )}
        {activeTab === "integrations" && (
          <IntegrationPanel />
        )}
      </div>
    </div>
  );
}
