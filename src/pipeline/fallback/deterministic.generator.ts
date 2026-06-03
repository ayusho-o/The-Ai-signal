import type { AppIntent, DataSchema, AppSpec, EntitySchema, PageComponent, PageLayout, HttpMethod } from "@/types";
import { getIntegrationRegistry } from "@/integrations/registry";

// ============================================================
// Deterministic Fallback Generator
// Used when all AI providers fail. Produces a valid, minimal
// but complete AppSpec from the intent and schema alone.
// No AI calls — pure template logic.
// ============================================================

export function generateDeterministicSchema(intent: AppIntent): DataSchema {
  const entities: EntitySchema[] = intent.entities.map((name) => ({
    name,
    tableName: toSnakeCase(name),
    fields: [
      { name: "id", type: "uuid" as const, nullable: false, isPrimary: true, isRelation: false, isUnique: true },
      { name: "tenantId", type: "uuid" as const, nullable: false, isPrimary: false, isRelation: false, isUnique: false },
      { name: "name", type: "string" as const, nullable: false, isPrimary: false, isRelation: false, isUnique: false },
      { name: "status", type: "string" as const, nullable: true, isPrimary: false, isRelation: false, isUnique: false },
      { name: "createdAt", type: "datetime" as const, nullable: false, isPrimary: false, isRelation: false, isUnique: false },
      { name: "updatedAt", type: "datetime" as const, nullable: false, isPrimary: false, isRelation: false, isUnique: false },
    ],
    relations: [],
  }));

  return { entities };
}

export function generateDeterministicAppSpec(
  schema: DataSchema,
  intent: AppIntent
): AppSpec {
  const registry = getIntegrationRegistry();
  const entityNames = schema.entities.map((e) => e.name);
  const firstEntity = entityNames[0] ?? "Item";

  // One list page per entity, plus a dashboard
  const pages = [
    ...schema.entities.map((e) => ({
      name: `${e.name}s`,
      route: `/${e.tableName}s`,
      layout: "list" as PageLayout,
      boundEntity: e.name,
      components: [
        { type: "table" as const, label: `${e.name} List` },
        { type: "form" as const, label: `Create ${e.name}` },
      ] as PageComponent[],
    })),
    {
      name: "Dashboard",
      route: "/dashboard",
      layout: "dashboard" as PageLayout,
      boundEntity: firstEntity,
      components: [
        { type: "chart" as const, label: "Overview" },
        { type: "card" as const, label: "Stats" },
      ] as PageComponent[],
    },
  ];

  // CRUD endpoints per entity
  const apiEndpoints = schema.entities.flatMap((e) => [
    { path: `/${e.tableName}s`, method: "GET" as HttpMethod, handlerDescription: `List all ${e.name}s with pagination`, boundEntity: e.name, authRequired: true, rateLimitFlag: false },
    { path: `/${e.tableName}s`, method: "POST" as HttpMethod, handlerDescription: `Create a new ${e.name}`, boundEntity: e.name, authRequired: true, rateLimitFlag: true },
    { path: `/${e.tableName}s/:id`, method: "GET" as HttpMethod, handlerDescription: `Get ${e.name} by ID`, boundEntity: e.name, authRequired: true, rateLimitFlag: false },
    { path: `/${e.tableName}s/:id`, method: "PUT" as HttpMethod, handlerDescription: `Update ${e.name} by ID`, boundEntity: e.name, authRequired: true, rateLimitFlag: false },
    { path: `/${e.tableName}s/:id`, method: "DELETE" as HttpMethod, handlerDescription: `Delete ${e.name} (soft delete)`, boundEntity: e.name, authRequired: true, rateLimitFlag: false },
  ]);

  // Auth roles with mutable arrays
  const authRules = {
    roles: [
      {
        name: "admin",
        description: "Full platform access",
        permissions: entityNames.map((name) => ({ entity: name, permissions: ["read", "write", "delete"] as Array<"read" | "write" | "delete"> })),
      },
      {
        name: "user",
        description: "Standard user access",
        permissions: entityNames.map((name) => ({ entity: name, permissions: ["read", "write"] as Array<"read" | "write" | "delete"> })),
      },
    ],
  };

  // Integration hooks and workflow stubs for requested integrations
  const integrationHooks = intent.integrations_requested
    .map((req) => registry.find((r) => r.id === req || r.displayName.toLowerCase().includes(req.toLowerCase())))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((intg) => ({
      integrationId: intg.id,
      triggerEvent: "status_changed" as const,
      boundEntity: firstEntity,
      description: `Notify via ${intg.displayName} when ${firstEntity} status changes`,
    }));

  const workflowStubs = intent.integrations_requested
    .map((req) => registry.find((r) => r.id === req || r.displayName.toLowerCase().includes(req.toLowerCase())))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .slice(0, 3)
    .map((intg) => {
      const action = intg.actions[0];
      return {
        name: `Notify via ${intg.displayName} on ${firstEntity} change`,
        trigger: { entity: firstEntity, event: "status_changed" as const, condition: `status === 'closed'` },
        integration: intg.id,
        action: action?.id ?? intg.id,
        payload: [
          { sourceField: "id", targetParam: "record_id", transform: "toString" },
          { sourceField: "name", targetParam: "message", transform: "none" },
        ],
      };
    });

  return {
    appName: intent.appName,
    appType: intent.appType,
    pages,
    apiEndpoints,
    authRules,
    integrationHooks,
    workflowStubs,
  };
}

function toSnakeCase(name: string): string {
  return name.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}
