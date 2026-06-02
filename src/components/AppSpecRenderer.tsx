"use client";

import type { PipelineJob, AppSpec, EntitySchema, PageSpec, ApiEndpoint, WorkflowStub, IntegrationHook } from "@/types";

interface Props {
  job: PipelineJob | null;
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-mono font-semibold text-atlas-text">{title}</h3>
      {count !== undefined && (
        <span className="text-xs font-mono px-1.5 py-0.5 bg-atlas-muted text-atlas-text-dim rounded">
          {count}
        </span>
      )}
    </div>
  );
}

function EntityCard({ entity }: { entity: EntitySchema }) {
  return (
    <div className="bg-atlas-surface border border-atlas-border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-mono font-semibold text-atlas-text">
          {entity.name}
        </span>
        <span className="text-xs font-mono text-atlas-text-dim">
          {entity.tableName}
        </span>
      </div>
      <div className="space-y-1">
        {entity.fields.map((field, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                field.isPrimary
                  ? "bg-atlas-accent"
                  : field.isRelation
                  ? "bg-atlas-warning"
                  : "bg-atlas-muted"
              }`}
            />
            <span className="text-atlas-text">{field.name}</span>
            <span className="text-atlas-text-dim">{field.type}</span>
            {field.isPrimary && (
              <span className="text-atlas-accent text-xs">PK</span>
            )}
            {field.isUnique && (
              <span className="text-atlas-text-dim text-xs">unique</span>
            )}
            {!field.nullable && !field.isPrimary && (
              <span className="text-atlas-warning text-xs">required</span>
            )}
          </div>
        ))}
      </div>
      {entity.relations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-atlas-border space-y-1">
          {entity.relations.map((rel, i) => (
            <div key={i} className="text-xs font-mono text-atlas-text-dim">
              <span className="text-atlas-warning">{rel.type}</span>{" "}
              {rel.target}
              <span className="opacity-50"> via {rel.foreignKey}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PagesTable({ pages }: { pages: PageSpec[] }) {
  return (
    <div className="border border-atlas-border rounded overflow-hidden">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="bg-atlas-surface border-b border-atlas-border">
            <th className="px-3 py-2 text-left text-atlas-text-dim">Page</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Route</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Layout</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Entity</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Components</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page, i) => (
            <tr
              key={i}
              className={`border-b border-atlas-border ${
                i % 2 === 0 ? "bg-atlas-bg" : "bg-atlas-surface/50"
              }`}
            >
              <td className="px-3 py-2 text-atlas-text">{page.name}</td>
              <td className="px-3 py-2 text-atlas-accent">{page.route}</td>
              <td className="px-3 py-2 text-atlas-text-dim">{page.layout}</td>
              <td className="px-3 py-2 text-atlas-warning">{page.boundEntity}</td>
              <td className="px-3 py-2 text-atlas-text-dim">
                {page.components.map((c) => c.type).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointsTable({ endpoints }: { endpoints: ApiEndpoint[] }) {
  const methodColors: Record<string, string> = {
    GET: "text-atlas-success",
    POST: "text-atlas-accent",
    PUT: "text-atlas-warning",
    PATCH: "text-yellow-400",
    DELETE: "text-atlas-error",
  };

  return (
    <div className="border border-atlas-border rounded overflow-hidden">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="bg-atlas-surface border-b border-atlas-border">
            <th className="px-3 py-2 text-left text-atlas-text-dim">Method</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Path</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Entity</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Auth</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Rate Limit</th>
            <th className="px-3 py-2 text-left text-atlas-text-dim">Description</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep, i) => (
            <tr
              key={i}
              className={`border-b border-atlas-border ${
                i % 2 === 0 ? "bg-atlas-bg" : "bg-atlas-surface/50"
              }`}
            >
              <td className={`px-3 py-2 font-semibold ${methodColors[ep.method] ?? "text-atlas-text"}`}>
                {ep.method}
              </td>
              <td className="px-3 py-2 text-atlas-text">{ep.path}</td>
              <td className="px-3 py-2 text-atlas-warning">{ep.boundEntity}</td>
              <td className="px-3 py-2">
                {ep.authRequired ? (
                  <span className="text-atlas-success">✓</span>
                ) : (
                  <span className="text-atlas-text-dim">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                {ep.rateLimitFlag ? (
                  <span className="text-atlas-warning">✓</span>
                ) : (
                  <span className="text-atlas-text-dim">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-atlas-text-dim truncate max-w-48">
                {ep.handlerDescription}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkflowStubCard({ stub }: { stub: WorkflowStub }) {
  return (
    <div className="bg-atlas-surface border border-atlas-border rounded p-3 space-y-2">
      <div className="text-sm font-mono font-semibold text-atlas-text">
        {stub.name}
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-mono">
        <span>
          <span className="text-atlas-text-dim">trigger: </span>
          <span className="text-atlas-warning">{stub.trigger.entity}</span>
          <span className="text-atlas-text-dim"> → </span>
          <span className="text-atlas-accent">{stub.trigger.event}</span>
          {stub.trigger.condition && (
            <span className="text-atlas-text-dim"> [{stub.trigger.condition}]</span>
          )}
        </span>
        <span>
          <span className="text-atlas-text-dim">integration: </span>
          <span className="text-atlas-success">{stub.integration}</span>
        </span>
        <span>
          <span className="text-atlas-text-dim">action: </span>
          <span className="text-atlas-text">{stub.action}</span>
        </span>
      </div>
      {stub.payload.length > 0 && (
        <div className="text-xs font-mono space-y-0.5 mt-1">
          <div className="text-atlas-text-dim">payload mapping:</div>
          {stub.payload.map((p, i) => (
            <div key={i} className="pl-3 text-atlas-text-dim">
              <span className="text-atlas-text">{p.sourceField}</span>
              {" → "}
              <span className="text-atlas-accent">{p.targetParam}</span>
              {p.transform && <span className="opacity-60"> ({p.transform})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HookList({ hooks }: { hooks: IntegrationHook[] }) {
  return (
    <div className="space-y-2">
      {hooks.map((hook, i) => (
        <div
          key={i}
          className="flex items-center gap-3 text-xs font-mono bg-atlas-surface border border-atlas-border rounded px-3 py-2"
        >
          <span className="text-atlas-success font-semibold">{hook.integrationId}</span>
          <span className="text-atlas-text-dim">→</span>
          <span className="text-atlas-warning">{hook.boundEntity}</span>
          <span className="text-atlas-text-dim">on</span>
          <span className="text-atlas-accent">{hook.triggerEvent}</span>
          <span className="text-atlas-text-dim ml-auto truncate max-w-64">
            {hook.description}
          </span>
        </div>
      ))}
    </div>
  );
}

function AppSpecContent({ spec }: { spec: AppSpec }) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-mono font-bold text-atlas-text">
            {spec.appName}
          </h2>
          <div className="text-sm font-mono text-atlas-text-dim">
            type: <span className="text-atlas-accent">{spec.appType}</span>
          </div>
        </div>
        <div className="ml-auto flex gap-3 text-xs font-mono text-atlas-text-dim">
          <span>{spec.pages.length} pages</span>
          <span>{spec.apiEndpoints.length} endpoints</span>
          <span>{spec.workflowStubs.length} workflows</span>
        </div>
      </div>

      {/* Pages */}
      <div>
        <SectionHeader title="Pages" count={spec.pages.length} />
        <PagesTable pages={spec.pages} />
      </div>

      {/* API Endpoints */}
      <div>
        <SectionHeader title="API Endpoints" count={spec.apiEndpoints.length} />
        <EndpointsTable endpoints={spec.apiEndpoints} />
      </div>

      {/* Auth Roles */}
      <div>
        <SectionHeader
          title="Auth Roles"
          count={spec.authRules.roles.length}
        />
        <div className="space-y-2">
          {spec.authRules.roles.map((role, i) => (
            <div
              key={i}
              className="bg-atlas-surface border border-atlas-border rounded p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-semibold text-atlas-accent">
                  {role.name}
                </span>
                <span className="text-xs font-mono text-atlas-text-dim">
                  {role.description}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((perm, j) => (
                  <span
                    key={j}
                    className="text-xs font-mono px-2 py-0.5 bg-atlas-muted rounded"
                  >
                    <span className="text-atlas-warning">{perm.entity}</span>
                    <span className="text-atlas-text-dim">:</span>
                    <span className="text-atlas-text">
                      {perm.permissions.join(",")}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Hooks */}
      {spec.integrationHooks.length > 0 && (
        <div>
          <SectionHeader
            title="Integration Hooks"
            count={spec.integrationHooks.length}
          />
          <HookList hooks={spec.integrationHooks} />
        </div>
      )}

      {/* Workflow Stubs */}
      {spec.workflowStubs.length > 0 && (
        <div>
          <SectionHeader
            title="Workflow Stubs"
            count={spec.workflowStubs.length}
          />
          <div className="space-y-3">
            {spec.workflowStubs.map((stub, i) => (
              <WorkflowStubCard key={i} stub={stub} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppSpecRenderer({ job }: Props) {
  if (!job) {
    return (
      <div className="text-center py-16 text-atlas-text-dim font-mono text-sm">
        No generation in progress. Submit a prompt to generate an AppSpec.
      </div>
    );
  }

  if (job.status === "running") {
    return (
      <div className="text-center py-16 text-atlas-text-dim font-mono text-sm">
        <div className="pulse-dot w-2 h-2 bg-atlas-warning rounded-full mx-auto mb-3" />
        Pipeline running... AppSpec will appear here when complete.
      </div>
    );
  }

  if (job.status === "failed" && !job.appSpec) {
    return (
      <div className="text-center py-16">
        <div className="text-atlas-error font-mono text-sm">Pipeline failed</div>
        <div className="text-atlas-text-dim font-mono text-xs mt-2">
          {job.error}
        </div>
      </div>
    );
  }

  if (!job.appSpec) {
    return (
      <div className="text-center py-16 text-atlas-text-dim font-mono text-sm">
        AppSpec not yet generated.
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Entity grid from schema */}
      {job.schema && (
        <div className="mb-8">
          <SectionHeader
            title="Data Schema"
            count={job.schema.entities.length}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {job.schema.entities.map((entity, i) => (
              <EntityCard key={i} entity={entity} />
            ))}
          </div>
        </div>
      )}
      <AppSpecContent spec={job.appSpec} />
    </div>
  );
}
