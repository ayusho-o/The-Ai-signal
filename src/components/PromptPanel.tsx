"use client";

import { useState } from "react";

const EXAMPLE_PROMPTS = [
  "Build a CRM for a real estate agency. Agents manage leads, properties, and deals. Admin sees analytics. WhatsApp notifications when a deal closes.",
  "Task manager for an engineering team. Tasks have due dates, assignees, priorities, and status. Team lead gets a Slack message when a task is overdue.",
  "E-commerce backend. Products, orders, customers, payments via Stripe. Order confirmation sent via Gmail.",
  "HR tool for a 50-person company. Track employees, leave requests, and performance reviews. Notify manager on Slack when leave is approved.",
];

interface Props {
  onSubmit: (prompt: string) => void;
  isRunning: boolean;
  jobId: string | null;
}

export function PromptPanel({ onSubmit, isRunning, jobId }: Props) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (!prompt.trim() || isRunning) return;
    onSubmit(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          className="flex-1 bg-atlas-surface border border-atlas-border rounded px-3 py-2 text-sm font-mono text-atlas-text placeholder:text-atlas-text-dim resize-none focus:outline-none focus:border-atlas-accent transition-colors"
          rows={3}
          placeholder="Describe the app you want to build... (Ctrl+Enter to submit)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={isRunning || !prompt.trim()}
            className="px-4 py-2 bg-atlas-accent text-white text-xs font-mono rounded disabled:opacity-40 hover:bg-atlas-accent-dim transition-colors whitespace-nowrap"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="pulse-dot w-2 h-2 rounded-full bg-white inline-block" />
                Running...
              </span>
            ) : (
              "Generate →"
            )}
          </button>
          {jobId && (
            <div className="text-xs font-mono text-atlas-text-dim text-center">
              ID: {jobId.slice(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Example prompts */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-atlas-text-dim font-mono">Examples:</span>
        {EXAMPLE_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => setPrompt(p)}
            disabled={isRunning}
            className="text-xs font-mono text-atlas-accent hover:text-atlas-text border border-atlas-border hover:border-atlas-accent px-2 py-1 rounded transition-colors disabled:opacity-40 max-w-[200px] truncate"
            title={p}
          >
            {p.slice(0, 40)}...
          </button>
        ))}
      </div>
    </div>
  );
}
