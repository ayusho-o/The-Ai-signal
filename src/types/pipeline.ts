// ============================================================
// Core Pipeline Types — OneAtlas AI Pipeline
// ============================================================

// --------------- Enums ---------------

export type AppType =
  | "crm"
  | "project_management"
  | "ecommerce"
  | "hr_tool"
  | "inventory"
  | "content_platform"
  | "analytics"
  | "custom";

export type FieldType =
  | "string"
  | "text"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "datetime"
  | "uuid"
  | "json"
  | "enum";

export type RelationType = "hasMany" | "belongsTo" | "hasOne";

export type OnDeleteAction = "CASCADE" | "SET_NULL" | "RESTRICT" | "NO_ACTION";

export type PageLayout = "list" | "detail" | "dashboard" | "settings";

export type ComponentType = "table" | "form" | "chart" | "card";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type PermissionLevel = "read" | "write" | "delete";

export type IntegrationEvent =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed";

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "partial";

export type StageStatus = "pending" | "running" | "completed" | "failed";

// --------------- Stage 1: AppIntent ---------------

export interface AppIntent {
  appName: string;
  appType: AppType;
  features: string[];
  entities: string[];
  integrations_requested: string[];
  assumptions: string[];
  clarification_required?: {
    flag: true;
    question: string;
  };
}

// --------------- Stage 2: DataSchema ---------------

export interface FieldSchema {
  name: string;
  type: FieldType;
  nullable: boolean;
  isRelation: boolean;
  isPrimary: boolean;
  isUnique: boolean;
  defaultValue?: string | number | boolean | null;
  enumValues?: string[];
}

export interface RelationSchema {
  type: RelationType;
  target: string; // entity name
  foreignKey: string;
  onDelete: OnDeleteAction;
}

export interface EntitySchema {
  name: string;
  tableName: string; // snake_case
  fields: FieldSchema[];
  relations: RelationSchema[];
}

export interface DataSchema {
  entities: EntitySchema[];
}

// --------------- Stage 3: AppSpec ---------------

export interface PageComponent {
  type: ComponentType;
  label: string;
  dataSource?: string; // field or entity reference
}

export interface PageSpec {
  name: string;
  route: string;
  layout: PageLayout;
  boundEntity: string;
  components: PageComponent[];
}

export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  handlerDescription: string;
  boundEntity: string;
  authRequired: boolean;
  rateLimitFlag: boolean;
  requestBodyFields?: string[];
  responseFields?: string[];
}

export interface RolePermission {
  entity: string;
  permissions: PermissionLevel[];
}

export interface AuthRole {
  name: string;
  description: string;
  permissions: RolePermission[];
}

export interface AuthRules {
  roles: AuthRole[];
}

export interface WorkflowTrigger {
  entity: string;
  event: IntegrationEvent;
  condition?: string;
}

export interface WorkflowPayloadField {
  sourceField: string; // entity field name
  targetParam: string; // integration action param name
  transform?: string; // optional transform description
}

export interface WorkflowStub {
  name: string;
  trigger: WorkflowTrigger;
  integration: string; // integration registry ID
  action: string; // action ID from integration
  payload: WorkflowPayloadField[];
}

export interface IntegrationHook {
  integrationId: string;
  triggerEvent: IntegrationEvent;
  boundEntity: string;
  description: string;
}

export interface AppSpec {
  appName: string;
  appType: AppType;
  pages: PageSpec[];
  apiEndpoints: ApiEndpoint[];
  authRules: AuthRules;
  integrationHooks: IntegrationHook[];
  workflowStubs: WorkflowStub[];
}

// --------------- Validation & Repair ---------------

export type ValidationErrorCode =
  | "MISSING_FIELD"
  | "WRONG_TYPE"
  | "INVALID_ENUM"
  | "BROKEN_REFERENCE"
  | "MISSING_TENANT_ID"
  | "INCONSISTENT_RELATION"
  | "PAGE_WITHOUT_ENDPOINT"
  | "INVALID_INTEGRATION_REF"
  | "INVALID_ACTION_REF"
  | "WORKFLOW_INVALID_ENTITY"
  | "MALFORMED_JSON"
  | "TRUNCATED_OUTPUT"
  | "UNKNOWN";

export interface ValidationError {
  code: ValidationErrorCode;
  field?: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export type RepairStrategy =
  | "STRUCTURAL_REPAIR"
  | "FIELD_REPAIR"
  | "CONSISTENCY_REPAIR"
  | "AI_RETRY"
  | "ESCALATED_AI_RETRY";

export type RepairOutcome = "REPAIRED" | "ESCALATED" | "FAILED";

export interface RepairAttempt {
  strategy: RepairStrategy;
  errorInput: ValidationError[];
  outcome: RepairOutcome;
  timestamp: string;
  detail?: string;
}

// --------------- Job / Pipeline State ---------------

export interface StageMetrics {
  stage: PipelineStage;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  tokensUsed?: number;
  estimatedCostUsd?: number;
  modelUsed?: string;
  providerUsed?: string;
  repairAttempts: RepairAttempt[];
}

export type PipelineStage =
  | "intent_extraction"
  | "schema_generation"
  | "appspec_generation";

export interface PipelineJob {
  jobId: string;
  status: JobStatus;
  prompt: string;
  createdAt: string;
  updatedAt: string;
  intent?: AppIntent;
  schema?: DataSchema;
  appSpec?: AppSpec;
  stageMetrics: Record<PipelineStage, StageMetrics>;
  totalCostUsd: number;
  totalLatencyMs: number;
  error?: string;
}

// --------------- SSE Events ---------------

export type SSEEventType =
  | "stage_start"
  | "stage_complete"
  | "stage_failed"
  | "generation_complete"
  | "generation_failed"
  | "repair_attempt"
  | "heartbeat";

export interface SSEEvent {
  type: SSEEventType;
  stage?: PipelineStage;
  timestamp: string;
  data?: unknown;
  error?: string;
  repairLog?: RepairAttempt[];
}

// --------------- AI Gateway Types ---------------

export type AIProvider =
  | "openai"
  | "anthropic"
  | "groq"
  | "gemini"
  | "google_ai"
  | "deepseek"
  | "openrouter"
  | "mistral";

export interface AIRequestOptions {
  stage: PipelineStage | "repair" | "validation";
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json" | "text";
  forceProvider?: AIProvider;
  forceModel?: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  provider: AIProvider;
  model: string;
  estimatedCostUsd: number;
  latencyMs: number;
}

// --------------- Integration Types ---------------

export type AuthType = "oauth2" | "api_key" | "webhook_secret" | "none";

export interface IntegrationActionField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  inputSchema: IntegrationActionField[];
  outputSchema: IntegrationActionField[];
}

export interface IntegrationTriggerDescriptor {
  event: IntegrationEvent;
  description: string;
  entityTypes?: string[]; // entity types this trigger applies to
}

export interface IntegrationDefinition {
  id: string;
  displayName: string;
  description: string;
  authType: AuthType;
  implemented: boolean; // false = stubbed
  triggers: IntegrationTriggerDescriptor[];
  actions: IntegrationAction[];
}
