"use client";

import { useState, useEffect } from "react";
import type { IntegrationDefinition } from "@/types";

interface RegistryResponse {
  count: number;
  implemented: number;
  stubbed: number;
  integrations: IntegrationDefinition[];
}

export function IntegrationPanel() {
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d: RegistryResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-atlas-text-dim font-mono text-sm">
        Loading integration registry...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-atlas-error font-mono text-sm">
        Failed to load integration registry.
      </div>
    );
  }

  const selectedIntegration = data.integrations.find(
    (i) => i.id === selected
  );

  return (
    <div className="max-w-6xl">
      {/* Header stats */}
      <div className="flex gap-6 mb-6 text-xs font-mono">
        <div>
          <span className="text-atlas-text-dim">Total: </span>
          <span className="text-atlas-text font-semibold">{data.count}</span>
        </div>
        <div>
          <span className="text-atlas-success">● </span>
          <span className="text-atlas-text-dim">Implemented: </span>
          <span className="text-atlas-success font-semibold">{data.implemented}</span>
        </div>
        <div>
          <span className="text-atlas-warning">○ </span>
          <span className="text-atlas-text-dim">Stubbed: </span>
          <span className="text-atlas-warning font-semibold">{data.stubbed}</span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Integration list */}
        <div className="w-64 shrink-0 space-y-1">
          {data.integrations.map((integration) => (
            <button
              key={integration.id}
              onClick={() =>
                setSelected(selected === integration.id ? null : integration.id)
              }
              className={`w-full text-left px-3 py-2 rounded border text-xs font-mono transition-colors ${
                selected === integration.id
                  ? "border-atlas-accent bg-atlas-accent/10 text-atlas-text"
                  : "border-atlas-border bg-atlas-surface text-atlas-text-dim hover:border-atlas-muted hover:text-atlas-text"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    integration.implemented
                      ? "bg-atlas-success"
                      : "bg-atlas-warning"
                  }`}
                />
                <span>{integration.displayName}</span>
              </div>
              <div className="text-xs opacity-50 mt-0.5 pl-3.5">
                {integration.authType}
              </div>
            </button>
          ))}
        </div>

        {/* Integration detail */}
        <div className="flex-1">
          {selectedIntegration ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-mono font-semibold text-atlas-text">
                    {selectedIntegration.displayName}
                  </h3>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded border ${
                      selectedIntegration.implemented
                        ? "text-atlas-success border-atlas-success/30 bg-atlas-success/5"
                        : "text-atlas-warning border-atlas-warning/30 bg-atlas-warning/5"
                    }`}
                  >
                    {selectedIntegration.implemented ? "IMPLEMENTED" : "STUBBED"}
                  </span>
                  <span className="text-xs font-mono text-atlas-text-dim border border-atlas-border rounded px-2 py-0.5">
                    {selectedIntegration.authType}
                  </span>
                </div>
                <div className="text-xs font-mono text-atlas-text-dim mt-1">
                  id: <span className="text-atlas-accent">{selectedIntegration.id}</span>
                </div>
                <p className="text-xs font-mono text-atlas-text-dim mt-2">
                  {selectedIntegration.description}
                </p>
              </div>

              {/* Triggers */}
              <div>
                <div className="text-xs font-mono text-atlas-text-dim mb-2">
                  Triggers ({selectedIntegration.triggers.length}):
                </div>
                <div className="space-y-1">
                  {selectedIntegration.triggers.map((trigger, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs font-mono bg-atlas-surface border border-atlas-border rounded px-3 py-1.5"
                    >
                      <span className="text-atlas-accent">{trigger.event}</span>
                      <span className="text-atlas-text-dim">—</span>
                      <span className="text-atlas-text-dim">{trigger.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="text-xs font-mono text-atlas-text-dim mb-2">
                  Actions ({selectedIntegration.actions.length}):
                </div>
                <div className="space-y-3">
                  {selectedIntegration.actions.map((action, i) => (
                    <div
                      key={i}
                      className="bg-atlas-surface border border-atlas-border rounded p-3 space-y-2"
                    >
                      <div>
                        <span className="text-sm font-mono font-semibold text-atlas-text">
                          {action.name}
                        </span>
                        <span className="text-xs font-mono text-atlas-text-dim ml-2">
                          id: {action.id}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-atlas-text-dim">
                        {action.description}
                      </p>

                      {/* Input schema */}
                      <div>
                        <div className="text-xs font-mono text-atlas-text-dim mb-1">
                          Input:
                        </div>
                        <div className="space-y-0.5">
                          {action.inputSchema.map((field, j) => (
                            <div
                              key={j}
                              className="flex items-start gap-2 text-xs font-mono pl-2"
                            >
                              <span
                                className={
                                  field.required
                                    ? "text-atlas-text"
                                    : "text-atlas-text-dim"
                                }
                              >
                                {field.name}
                              </span>
                              <span className="text-atlas-text-dim">
                                {field.type}
                              </span>
                              {field.required && (
                                <span className="text-atlas-warning text-xs">
                                  required
                                </span>
                              )}
                              <span className="text-atlas-text-dim opacity-60 ml-auto">
                                {field.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-atlas-text-dim font-mono text-sm">
              Select an integration to view its details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
