import { z } from "zod";
import { AppTypeSchema } from "./intent.schema";

export const PageLayoutSchema = z.enum([
  "list",
  "detail",
  "dashboard",
  "settings",
]);

export const ComponentTypeSchema = z.enum([
  "table",
  "form",
  "chart",
  "card",
]);

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export const PermissionLevelSchema = z.enum(["read", "write", "delete"]);

export const IntegrationEventSchema = z.enum([
  "created",
  "updated",
  "deleted",
  "status_changed",
]);

export const PageComponentZod = z.object({
  type: ComponentTypeSchema,
  label: z.string().min(1),
  dataSource: z.string().optional(),
});

export const PageSpecZod = z.object({
  name: z.string().min(1),
  route: z.string().startsWith("/"),
  layout: PageLayoutSchema,
  boundEntity: z.string().min(1),
  components: z.array(PageComponentZod).min(1),
});

export const ApiEndpointZod = z.object({
  path: z.string().startsWith("/"),
  method: HttpMethodSchema,
  handlerDescription: z.string().min(1),
  boundEntity: z.string().min(1),
  authRequired: z.boolean(),
  rateLimitFlag: z.boolean(),
  requestBodyFields: z.array(z.string()).optional(),
  responseFields: z.array(z.string()).optional(),
});

export const RolePermissionZod = z.object({
  entity: z.string().min(1),
  permissions: z.array(PermissionLevelSchema).min(1),
});

export const AuthRoleZod = z.object({
  name: z.string().min(1),
  description: z.string(),
  permissions: z.array(RolePermissionZod),
});

export const AuthRulesZod = z.object({
  roles: z.array(AuthRoleZod).min(1),
});

export const WorkflowTriggerZod = z.object({
  entity: z.string().min(1),
  event: IntegrationEventSchema,
  condition: z.string().optional(),
});

export const WorkflowPayloadFieldZod = z.object({
  sourceField: z.string().min(1),
  targetParam: z.string().min(1),
  transform: z.string().optional(),
});

export const WorkflowStubZod = z.object({
  name: z.string().min(1),
  trigger: WorkflowTriggerZod,
  integration: z.string().min(1),
  action: z.string().min(1),
  payload: z.array(WorkflowPayloadFieldZod),
});

export const IntegrationHookZod = z.object({
  integrationId: z.string().min(1),
  triggerEvent: IntegrationEventSchema,
  boundEntity: z.string().min(1),
  description: z.string(),
});

export const AppSpecZod = z.object({
  appName: z.string().min(1),
  appType: AppTypeSchema,
  pages: z.array(PageSpecZod).min(1, "At least one page required"),
  apiEndpoints: z
    .array(ApiEndpointZod)
    .min(1, "At least one API endpoint required"),
  authRules: AuthRulesZod,
  integrationHooks: z.array(IntegrationHookZod),
  workflowStubs: z.array(WorkflowStubZod),
});

export type AppSpecZodType = z.infer<typeof AppSpecZod>;
