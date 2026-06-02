import type { IntegrationDefinition } from "@/types";
import { slackIntegration } from "../slack";
import { gmailIntegration } from "../gmail";
import { whatsappIntegration } from "../whatsapp";
import { stripeIntegration } from "../stripe";
import { jiraIntegration } from "../jira";
import { salesforceIntegration } from "../salesforce";
import { hubspotIntegration } from "../hubspot";
import { notionIntegration } from "../notion";
import { airtableIntegration } from "../airtable";
import { twilioSmsIntegration } from "../twilio-sms";
import { webhookIntegration } from "../webhook";
import { googleSheetsIntegration } from "../google-sheets";
import { githubIntegration } from "../github";
import { zapierIntegration } from "../zapier";

// ============================================================
// Integration Registry
// Single source of truth for all supported integrations.
// Validation checks against this registry.
// ============================================================

const REGISTRY: IntegrationDefinition[] = [
  slackIntegration,
  gmailIntegration,
  whatsappIntegration,
  stripeIntegration,
  jiraIntegration,
  salesforceIntegration,
  hubspotIntegration,
  notionIntegration,
  airtableIntegration,
  twilioSmsIntegration,
  webhookIntegration,
  googleSheetsIntegration,
  githubIntegration,
  zapierIntegration,
];

export function getIntegrationRegistry(): IntegrationDefinition[] {
  return REGISTRY;
}

export function getIntegrationById(
  id: string
): IntegrationDefinition | undefined {
  return REGISTRY.find((i) => i.id === id);
}

export function isValidIntegrationId(id: string): boolean {
  return REGISTRY.some((i) => i.id === id);
}

export function isValidActionId(
  integrationId: string,
  actionId: string
): boolean {
  const integration = getIntegrationById(integrationId);
  if (!integration) return false;
  return integration.actions.some((a) => a.id === actionId);
}

// Fuzzy match a user-mentioned integration name to a registry ID
export function matchIntegrationName(name: string): string | null {
  const lower = name.toLowerCase().trim();
  for (const integration of REGISTRY) {
    if (
      integration.id.toLowerCase() === lower ||
      integration.displayName.toLowerCase().includes(lower) ||
      lower.includes(integration.id.toLowerCase())
    ) {
      return integration.id;
    }
  }
  return null;
}
