import { AppSpecZod } from "@/lib/schemas/appspec.schema";
import type {
  AppSpec,
  DataSchema,
  ValidationResult,
  ValidationError,
} from "@/types";
import { safeParseJson } from "@/utils/json.utils";
import { getIntegrationRegistry } from "@/integrations/registry";

export function validateAppSpecOutput(
  raw: string,
  dataSchema?: DataSchema
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!raw || raw.trim().length === 0) {
    return {
      valid: false,
      errors: [{ code: "MALFORMED_JSON", message: "Empty output from AI" }],
    };
  }

  const parsed = safeParseJson<unknown>(raw);
  if (!parsed) {
    return {
      valid: false,
      errors: [
        {
          code: "MALFORMED_JSON",
          message: "Could not extract valid JSON from AI response",
          context: { preview: raw.slice(0, 200) },
        },
      ],
    };
  }

  // Zod schema validation
  const result = AppSpecZod.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.join(".");
      errors.push({
        code: "MISSING_FIELD",
        field,
        message: `${field}: ${issue.message}`,
        context: { zodCode: issue.code },
      });
    }
    // Return immediately on structural failures
    return { valid: false, errors };
  }

  const spec = result.data as AppSpec;
  const registry = getIntegrationRegistry();
  const registeredIntegrationIds = new Set(registry.map((i) => i.id));

  // Cross-layer checks against DataSchema
  if (dataSchema) {
    const entityNames = new Set(dataSchema.entities.map((e) => e.name));

    // Check page boundEntity references
    for (const page of spec.pages) {
      if (!entityNames.has(page.boundEntity)) {
        errors.push({
          code: "BROKEN_REFERENCE",
          field: `pages[${page.name}].boundEntity`,
          message: `Page "${page.name}" references unknown entity "${page.boundEntity}"`,
          context: {
            pageName: page.name,
            entityRef: page.boundEntity,
            availableEntities: [...entityNames],
          },
        });
      }
    }

    // Check API endpoint boundEntity references
    for (const endpoint of spec.apiEndpoints) {
      if (!entityNames.has(endpoint.boundEntity)) {
        errors.push({
          code: "BROKEN_REFERENCE",
          field: `apiEndpoints[${endpoint.path}].boundEntity`,
          message: `Endpoint "${endpoint.method} ${endpoint.path}" references unknown entity "${endpoint.boundEntity}"`,
          context: {
            path: endpoint.path,
            entityRef: endpoint.boundEntity,
            availableEntities: [...entityNames],
          },
        });
      }
    }

    // Check workflowStub entity references
    for (const stub of spec.workflowStubs) {
      if (!entityNames.has(stub.trigger.entity)) {
        errors.push({
          code: "WORKFLOW_INVALID_ENTITY",
          field: `workflowStubs[${stub.name}].trigger.entity`,
          message: `WorkflowStub "${stub.name}" references unknown entity "${stub.trigger.entity}"`,
          context: {
            stubName: stub.name,
            entityRef: stub.trigger.entity,
            availableEntities: [...entityNames],
          },
        });
      }

      // Check integration reference
      if (!registeredIntegrationIds.has(stub.integration)) {
        errors.push({
          code: "INVALID_INTEGRATION_REF",
          field: `workflowStubs[${stub.name}].integration`,
          message: `WorkflowStub "${stub.name}" references unregistered integration "${stub.integration}"`,
          context: {
            stubName: stub.name,
            integrationRef: stub.integration,
            registeredIntegrations: [...registeredIntegrationIds],
          },
        });
      } else {
        // Check action reference
        const integration = registry.find((i) => i.id === stub.integration);
        if (integration) {
          const actionIds = new Set(integration.actions.map((a) => a.id));
          if (!actionIds.has(stub.action)) {
            errors.push({
              code: "INVALID_ACTION_REF",
              field: `workflowStubs[${stub.name}].action`,
              message: `WorkflowStub "${stub.name}" references invalid action "${stub.action}" for integration "${stub.integration}"`,
              context: {
                stubName: stub.name,
                action: stub.action,
                availableActions: [...actionIds],
              },
            });
          }
        }
      }
    }

    // Check integrationHooks
    for (const hook of spec.integrationHooks) {
      if (!registeredIntegrationIds.has(hook.integrationId)) {
        errors.push({
          code: "INVALID_INTEGRATION_REF",
          field: `integrationHooks[${hook.integrationId}]`,
          message: `IntegrationHook references unregistered integration "${hook.integrationId}"`,
          context: {
            integrationRef: hook.integrationId,
            registeredIntegrations: [...registeredIntegrationIds],
          },
        });
      }
      if (!entityNames.has(hook.boundEntity)) {
        errors.push({
          code: "BROKEN_REFERENCE",
          field: `integrationHooks[${hook.integrationId}].boundEntity`,
          message: `IntegrationHook references unknown entity "${hook.boundEntity}"`,
        });
      }
    }
  }

  // Page–API consistency: every page must have at least one corresponding endpoint
  const endpointEntities = new Set(spec.apiEndpoints.map((e) => e.boundEntity));
  for (const page of spec.pages) {
    if (!endpointEntities.has(page.boundEntity)) {
      errors.push({
        code: "PAGE_WITHOUT_ENDPOINT",
        field: `pages[${page.name}]`,
        message: `Page "${page.name}" (entity: ${page.boundEntity}) has no corresponding API endpoint`,
        context: {
          pageName: page.name,
          boundEntity: page.boundEntity,
          availableEndpointEntities: [...endpointEntities],
        },
      });
    }
  }

  // Auth rules — roles referenced in permissions must exist
  const roleNames = new Set(spec.authRules.roles.map((r) => r.name));
  if (roleNames.size === 0) {
    errors.push({
      code: "MISSING_FIELD",
      field: "authRules.roles",
      message: "AuthRules must define at least one role",
    });
  }

  return { valid: errors.length === 0, errors };
}

export function parseAppSpec(raw: string): AppSpec | null {
  const parsed = safeParseJson<unknown>(raw);
  if (!parsed) return null;
  const result = AppSpecZod.safeParse(parsed);
  if (!result.success) return null;
  return result.data as AppSpec;
}
