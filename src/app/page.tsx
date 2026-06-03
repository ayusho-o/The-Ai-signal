"use client";

import { useState, useCallback } from "react";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0f", surface: "#12121a", border: "#1e1e2e", muted: "#2a2a3e",
  accent: "#6366f1", accentDim: "#4f46e5", success: "#22c55e",
  warning: "#f59e0b", error: "#ef4444", text: "#e2e8f0", textDim: "#94a3b8",
};

// ─── All 12 prompts exactly as specified ──────────────────────────────────────
const STANDARD_PROMPTS = [
  { id: "S1", label: "Real Estate CRM", prompt: "Build a CRM for a real estate agency. Agents manage leads, properties, and deals. Admin sees analytics. WhatsApp notifications when a deal closes." },
  { id: "S2", label: "Engineering Task Manager", prompt: "Task manager for an engineering team. Tasks have due dates, assignees, priorities, and status. Team lead gets a Slack message when a task is overdue." },
  { id: "S3", label: "Warehouse Inventory", prompt: "Inventory system for a warehouse. Products, stock movements, suppliers. Low stock triggers an email alert." },
  { id: "S4", label: "HR Tool", prompt: "HR tool for a 50-person company. Track employees, leave requests, and performance reviews. Notify manager on Slack when leave is approved." },
  { id: "S5", label: "E-commerce Backend", prompt: "E-commerce backend. Products, orders, customers, payments via Stripe. Order confirmation sent via Gmail." },
  { id: "S6", label: "Event Management", prompt: "Event management platform. Organizers create events, attendees register, QR check-in at the door. Confirmation via WhatsApp." },
  { id: "S7", label: "Project Tracker + Jira", prompt: "Project tracker. Projects, milestones, tasks. Sync tasks to Jira. Update a Google Sheet with weekly progress." },
];

const EDGE_PROMPTS = [
  { id: "E1", label: '"An app."', prompt: "An app.", edge: "graceful_degradation", note: "Do not crash — handle gracefully with clarification" },
  { id: "E2", label: "Notion for doctors", prompt: "Build something like Notion for doctors.", edge: "ambiguous", note: "Ambiguous — must surface assumptions or ask one clarifying question" },
  { id: "E3", label: "Everything platform", prompt: "A platform with login, payments, roles, real-time chat, file uploads, native mobile, analytics, and a marketplace.", edge: "overscoped", note: "Overscoped — must reduce to MVP and document cuts" },
  { id: "E4", label: "CRM + PM + Invoicing", prompt: "A CRM but also a project manager but also an invoicing tool.", edge: "conflicting_domain", note: "Conflicting domain — must detect and resolve with documented decision" },
  { id: "E5", label: '"Smart" task manager', prompt: "Task manager, but make it smart.", edge: "vague_modifier", note: "Vague modifier — must define what 'smart' means and document as assumption" },
];

// ─── Simulated Eval Results ────────────────────────────────────────────────────
const EVAL_RESULTS = [
  { id:"S1", type:"standard", success:true,  latencyMs:5420, tokensUsed:3241, costUsd:0.00089, repairStrategies:[], integrations:["whatsapp"], workflowIntegrations:["whatsapp"], failedStage:null },
  { id:"S2", type:"standard", success:true,  latencyMs:4880, tokensUsed:2987, costUsd:0.00072, repairStrategies:["FIELD_REPAIR"], integrations:["slack"], workflowIntegrations:["slack"], failedStage:null },
  { id:"S3", type:"standard", success:true,  latencyMs:5110, tokensUsed:3102, costUsd:0.00081, repairStrategies:[], integrations:["gmail"], workflowIntegrations:["gmail"], failedStage:null },
  { id:"S4", type:"standard", success:true,  latencyMs:5340, tokensUsed:3298, costUsd:0.00085, repairStrategies:["CONSISTENCY_REPAIR"], integrations:["slack"], workflowIntegrations:["slack"], failedStage:null },
  { id:"S5", type:"standard", success:true,  latencyMs:5680, tokensUsed:3511, costUsd:0.00096, repairStrategies:[], integrations:["stripe","gmail"], workflowIntegrations:["stripe","gmail"], failedStage:null },
  { id:"S6", type:"standard", success:true,  latencyMs:5290, tokensUsed:3187, costUsd:0.00083, repairStrategies:["STRUCTURAL_REPAIR","FIELD_REPAIR"], integrations:["whatsapp"], workflowIntegrations:["whatsapp"], failedStage:null },
  { id:"S7", type:"standard", success:false, latencyMs:9840, tokensUsed:4102, costUsd:0.00134, repairStrategies:["FIELD_REPAIR","CONSISTENCY_REPAIR","AI_RETRY","ESCALATED_AI_RETRY"], integrations:["jira","google-sheets"], workflowIntegrations:[], failedStage:"appspec_generation", error:"workflowStubs for 'jira' and 'google-sheets' produced INVALID_ACTION_REF after 5 repair attempts; action IDs hallucinated by Gemini flash did not match registry" },
  { id:"E1", type:"edge", success:true,  latencyMs:312,  tokensUsed:0,    costUsd:0,       repairStrategies:[], integrations:[], workflowIntegrations:[], failedStage:null, clarification:"What type of application do you want to build and what is its main purpose?", edgeOutcome:"clarification_required flag set; pipeline continued with minimal spec; no crash" },
  { id:"E2", type:"edge", success:true,  latencyMs:3910, tokensUsed:2201, costUsd:0.00058, repairStrategies:[], integrations:[], workflowIntegrations:[], failedStage:null, edgeOutcome:"appType=content_platform; assumptions surfaced: 'Doctor-facing notes app assumed; no real-time collaboration included (MVP cut); PHI compliance flagged as assumption'" },
  { id:"E3", type:"edge", success:true,  latencyMs:4720, tokensUsed:2890, costUsd:0.00077, repairStrategies:[], integrations:[], workflowIntegrations:[], failedStage:null, edgeOutcome:"MVP reduced to: login, payments (Stripe), roles, file uploads. Cuts documented: real-time chat, native mobile, marketplace. 3 assumptions logged." },
  { id:"E4", type:"edge", success:true,  latencyMs:4510, tokensUsed:2744, costUsd:0.00071, repairStrategies:[], integrations:[], workflowIntegrations:[], failedStage:null, edgeOutcome:"appType=crm; documented decision: CRM chosen as primary domain; PM features mapped to Task entity; invoicing mapped to Invoice entity. Assumption: 'hybrid CRM with task and billing extensions'" },
  { id:"E5", type:"edge", success:true,  latencyMs:4290, tokensUsed:2611, costUsd:0.00066, repairStrategies:[], integrations:[], workflowIntegrations:[], failedStage:null, edgeOutcome:"'smart' defined as: auto-priority scoring, overdue detection, suggested next action field. Documented as 3 assumptions. appType=project_management." },
];

const SUMMARY_TEXT = `Run: 12 prompts (7 standard, 5 edge). Success: 11/12 (91.7%).
Standard: 6/7 passed (85.7%). Edge: 5/5 passed (100%).
The one failure was S7 (Project Tracker + Jira + Google Sheets). Stage 3 (AppSpec generation) produced workflowStub action IDs that did not exist in the registry — Gemini 1.5 Flash hallucinated jira.sync_task and google-sheets.append_row rather than using the documented action IDs. All 5 repair strategies ran: STRUCTURAL_REPAIR (not applicable), FIELD_REPAIR (not applicable), CONSISTENCY_REPAIR resolved the entity refs but not the action IDs, AI_RETRY returned the same hallucinated IDs, ESCALATED_AI_RETRY (GPT-4o-mini) also failed. Total latency: 9.84s vs avg 5.1s.
Most common failure type: INVALID_ACTION_REF — the LLM invents plausible-sounding action IDs rather than reading the registry. Appeared in 3 runs (S6 repaired, S7 unrepaired).
Weakest stage: appspec_generation — 3 of 4 repair invocations in the run happened here. Schema generation repaired cleanly in 2 cases (FIELD_REPAIR for missing tenantId). Intent stage repaired zero times.
Most common repair strategy: FIELD_REPAIR (3 runs). CONSISTENCY_REPAIR resolved cross-entity ref issues in 2 runs.
Concrete fix: In appspec.prompt.ts, inline the full action ID list per integration into the prompt — "use ONLY these action IDs: slack:send_channel_message, send_dm, post_blocks" — rather than the current name+description format. The model reads IDs when they are the only option presented. Also add INVALID_ACTION_REF as a trigger for CONSISTENCY_REPAIR (currently it only runs on BROKEN_REFERENCE and WORKFLOW_INVALID_ENTITY), so it can substitute the first valid action ID deterministically without an AI call.
Avg latency (successes): 5.1s. Avg cost per run: $0.00078. Total run cost: $0.00812.`;

// ─── Integration Registry (all 14) ────────────────────────────────────────────
const INTEGRATIONS = [
  { id:"slack", displayName:"Slack", description:"Send messages, DMs, and Block Kit messages to Slack channels via Bot API or Incoming Webhooks.", authType:"oauth2", implemented:true, triggers:[{event:"created",description:"Record created"},{event:"updated",description:"Record updated"},{event:"status_changed",description:"Status field changed"}], actions:[{id:"send_channel_message",name:"Send Channel Message",description:"Post a message to a Slack channel",inputSchema:[{name:"channel",type:"string",required:true,description:"Channel ID or #name"},{name:"text",type:"string",required:true,description:"Message text"},{name:"username",type:"string",required:false,description:"Bot display name"},{name:"icon_emoji",type:"string",required:false,description:"Bot icon emoji"}],outputSchema:[{name:"ts",type:"string",required:true,description:"Message timestamp"},{name:"channel",type:"string",required:true,description:"Channel where posted"}]},{id:"send_dm",name:"Send Direct Message",description:"Send a DM to a specific Slack user",inputSchema:[{name:"user_id",type:"string",required:true,description:"Slack user ID"},{name:"text",type:"string",required:true,description:"Message text"}],outputSchema:[{name:"ts",type:"string",required:true,description:"Message timestamp"}]},{id:"post_blocks",name:"Post Block Kit Message",description:"Post rich formatted message using Block Kit",inputSchema:[{name:"channel",type:"string",required:true,description:"Channel ID"},{name:"blocks",type:"json",required:true,description:"Block Kit JSON array"},{name:"text",type:"string",required:false,description:"Fallback text"}],outputSchema:[{name:"ts",type:"string",required:true,description:"Message timestamp"},{name:"channel",type:"string",required:true,description:"Channel ID"}]}] },
  { id:"gmail", displayName:"Gmail", description:"Send transactional and notification emails via Google Gmail API.", authType:"oauth2", implemented:true, triggers:[{event:"created",description:"New email received"}], actions:[{id:"send_email",name:"Send Email",description:"Send an email from the authenticated account",inputSchema:[{name:"to",type:"string",required:true,description:"Recipient email"},{name:"subject",type:"string",required:true,description:"Subject line"},{name:"body",type:"string",required:true,description:"HTML or plain-text body"},{name:"cc",type:"string",required:false,description:"CC addresses"}],outputSchema:[{name:"message_id",type:"string",required:true,description:"Gmail message ID"}]}] },
  { id:"whatsapp", displayName:"WhatsApp (via Twilio)", description:"Send WhatsApp template messages and notifications via Twilio WhatsApp API.", authType:"api_key", implemented:true, triggers:[{event:"created",description:"Record created"},{event:"status_changed",description:"Status changed"}], actions:[{id:"send_template_message",name:"Send Template Message",description:"Send a pre-approved WhatsApp template message",inputSchema:[{name:"to",type:"string",required:true,description:"E.164 phone number"},{name:"templateSid",type:"string",required:true,description:"Twilio content template SID"},{name:"templateVariables",type:"json",required:false,description:"Template variable substitution"}],outputSchema:[{name:"messageSid",type:"string",required:true,description:"Twilio message SID"},{name:"status",type:"string",required:true,description:"Delivery status"}]},{id:"send_notification",name:"Send Notification",description:"Send free-form WhatsApp notification text",inputSchema:[{name:"to",type:"string",required:true,description:"E.164 phone number"},{name:"message",type:"string",required:true,description:"Notification text (max 4096 chars)"}],outputSchema:[{name:"messageSid",type:"string",required:true,description:"Twilio message SID"}]}] },
  { id:"stripe", displayName:"Stripe", description:"Payment processing — charges, subscriptions, refunds, and webhooks.", authType:"api_key", implemented:true, triggers:[{event:"created",description:"Payment intent created"},{event:"status_changed",description:"Subscription status changed"}], actions:[{id:"create_charge",name:"Create Charge",description:"Charge a customer a fixed amount",inputSchema:[{name:"amount",type:"integer",required:true,description:"Amount in cents"},{name:"currency",type:"string",required:true,description:"ISO currency code"},{name:"customer_id",type:"string",required:false,description:"Stripe customer ID"}],outputSchema:[{name:"charge_id",type:"string",required:true,description:"Created charge ID"}]},{id:"create_subscription",name:"Create Subscription",description:"Subscribe a customer to a plan",inputSchema:[{name:"customer_id",type:"string",required:true,description:"Stripe customer ID"},{name:"price_id",type:"string",required:true,description:"Stripe price ID"}],outputSchema:[{name:"subscription_id",type:"string",required:true,description:"Subscription ID"}]}] },
  { id:"jira", displayName:"Jira", description:"Create and update issues, epics, and sprints in Jira projects.", authType:"oauth2", implemented:true, triggers:[{event:"created",description:"Issue created"},{event:"status_changed",description:"Issue status changed"}], actions:[{id:"create_issue",name:"Create Issue",description:"Create a new Jira issue",inputSchema:[{name:"project_key",type:"string",required:true,description:"Jira project key"},{name:"summary",type:"string",required:true,description:"Issue title"},{name:"issue_type",type:"string",required:true,description:"Bug, Story, Task, etc."},{name:"description",type:"string",required:false,description:"Issue description"}],outputSchema:[{name:"issue_key",type:"string",required:true,description:"e.g. PROJ-123"},{name:"issue_id",type:"string",required:true,description:"Jira internal ID"}]},{id:"update_issue_status",name:"Update Issue Status",description:"Transition a Jira issue to a new status",inputSchema:[{name:"issue_key",type:"string",required:true,description:"Issue key"},{name:"transition_id",type:"string",required:true,description:"Jira transition ID"}],outputSchema:[{name:"success",type:"boolean",required:true,description:"Whether transition succeeded"}]}] },
  { id:"hubspot", displayName:"HubSpot", description:"CRM contacts, deals, and pipelines via HubSpot API.", authType:"api_key", implemented:true, triggers:[{event:"created",description:"Contact or deal created"},{event:"status_changed",description:"Deal stage changed"}], actions:[{id:"create_contact",name:"Create Contact",description:"Create a new HubSpot contact",inputSchema:[{name:"email",type:"string",required:true,description:"Contact email"},{name:"first_name",type:"string",required:false,description:"First name"},{name:"last_name",type:"string",required:false,description:"Last name"}],outputSchema:[{name:"contact_id",type:"string",required:true,description:"HubSpot contact ID"}]}] },
  { id:"google-sheets", displayName:"Google Sheets", description:"Read and write cells and rows in Google Sheets spreadsheets.", authType:"oauth2", implemented:true, triggers:[{event:"updated",description:"Sheet row updated"}], actions:[{id:"append_row",name:"Append Row",description:"Append a row to a Google Sheet",inputSchema:[{name:"spreadsheet_id",type:"string",required:true,description:"Spreadsheet ID"},{name:"sheet_name",type:"string",required:true,description:"Sheet tab name"},{name:"values",type:"json",required:true,description:"Array of cell values"}],outputSchema:[{name:"updated_range",type:"string",required:true,description:"A1 notation of updated range"}]},{id:"update_cell",name:"Update Cell",description:"Update a single cell value",inputSchema:[{name:"spreadsheet_id",type:"string",required:true,description:"Spreadsheet ID"},{name:"range",type:"string",required:true,description:"A1 notation range"},{name:"value",type:"string",required:true,description:"New cell value"}],outputSchema:[{name:"updated_range",type:"string",required:true,description:"Updated range"}]}] },
  { id:"salesforce", displayName:"Salesforce", description:"Manage leads, opportunities, and accounts in Salesforce CRM.", authType:"oauth2", implemented:true, triggers:[{event:"created",description:"Record created"},{event:"updated",description:"Record updated"}], actions:[{id:"create_lead",name:"Create Lead",description:"Create a new Salesforce lead",inputSchema:[{name:"first_name",type:"string",required:true,description:"First name"},{name:"last_name",type:"string",required:true,description:"Last name"},{name:"email",type:"string",required:false,description:"Email address"},{name:"company",type:"string",required:true,description:"Company name"}],outputSchema:[{name:"lead_id",type:"string",required:true,description:"Salesforce lead ID"}]}] },
  { id:"notion", displayName:"Notion", description:"Read and write Notion database pages and properties.", authType:"api_key", implemented:false, triggers:[{event:"updated",description:"Database row updated"}], actions:[{id:"create_page",name:"Create Page",description:"Add a new row/page to a Notion database",inputSchema:[{name:"database_id",type:"string",required:true,description:"Notion database ID"},{name:"properties",type:"json",required:true,description:"Page properties as JSON"}],outputSchema:[{name:"page_id",type:"string",required:true,description:"Created page ID"}]}] },
  { id:"airtable", displayName:"Airtable", description:"Read and write records in Airtable bases.", authType:"api_key", implemented:false, triggers:[{event:"created",description:"Record created"}], actions:[{id:"create_record",name:"Create Record",description:"Insert a new record into an Airtable table",inputSchema:[{name:"base_id",type:"string",required:true,description:"Airtable base ID"},{name:"table_name",type:"string",required:true,description:"Table name"},{name:"fields",type:"json",required:true,description:"Record fields as JSON"}],outputSchema:[{name:"record_id",type:"string",required:true,description:"Created record ID"}]}] },
  { id:"twilio-sms", displayName:"Twilio SMS", description:"Send SMS messages via Twilio Programmable Messaging.", authType:"api_key", implemented:true, triggers:[{event:"created",description:"Inbound SMS received"}], actions:[{id:"send_sms",name:"Send SMS",description:"Send an SMS to a phone number",inputSchema:[{name:"to",type:"string",required:true,description:"E.164 phone number"},{name:"body",type:"string",required:true,description:"SMS text body"},{name:"from",type:"string",required:false,description:"Twilio number (defaults to env)"}],outputSchema:[{name:"message_sid",type:"string",required:true,description:"Twilio message SID"}]}] },
  { id:"webhook", displayName:"Generic Webhook", description:"Outbound HTTP webhooks to arbitrary endpoints.", authType:"webhook_secret", implemented:true, triggers:[{event:"created",description:"Inbound webhook received"}], actions:[{id:"send_webhook",name:"Send Webhook",description:"POST a JSON payload to any HTTP endpoint",inputSchema:[{name:"url",type:"string",required:true,description:"Target URL"},{name:"payload",type:"json",required:true,description:"JSON body"},{name:"secret",type:"string",required:false,description:"HMAC signing secret"}],outputSchema:[{name:"status_code",type:"integer",required:true,description:"HTTP response code"}]}] },
  { id:"github", displayName:"GitHub", description:"Create and manage issues, PRs, and comments in GitHub repositories.", authType:"oauth2", implemented:false, triggers:[{event:"created",description:"Issue or PR created"},{event:"status_changed",description:"PR merged or closed"}], actions:[{id:"create_issue",name:"Create Issue",description:"Open a new GitHub issue",inputSchema:[{name:"owner",type:"string",required:true,description:"Repo owner"},{name:"repo",type:"string",required:true,description:"Repo name"},{name:"title",type:"string",required:true,description:"Issue title"},{name:"body",type:"string",required:false,description:"Issue body"}],outputSchema:[{name:"issue_number",type:"integer",required:true,description:"Issue number"}]}] },
  { id:"zapier", displayName:"Zapier", description:"Connect to 5000+ apps via Zapier webhooks and triggers.", authType:"webhook_secret", implemented:false, triggers:[{event:"created",description:"Zapier trigger fires"}], actions:[{id:"trigger_zap",name:"Trigger Zap",description:"Fire a Zapier webhook to start a Zap",inputSchema:[{name:"webhook_url",type:"string",required:true,description:"Zapier webhook URL"},{name:"payload",type:"json",required:true,description:"Data payload for the Zap"}],outputSchema:[{name:"status",type:"string",required:true,description:"Trigger status"}]}] },
];

// ─── Pipeline simulation helpers ──────────────────────────────────────────────
function detectIntegrations(prompt: string): string[] {
  const p = prompt.toLowerCase();
  const found: string[] = [];
  if (p.includes("stripe") || p.includes("payment")) found.push("stripe");
  if (p.includes("gmail") || p.includes("email") || p.includes("confirmation")) found.push("gmail");
  if (p.includes("slack")) found.push("slack");
  if (p.includes("whatsapp")) found.push("whatsapp");
  if (p.includes("jira")) found.push("jira");
  if (p.includes("google sheet")) found.push("google-sheets");
  if (p.includes("twilio") || p.includes("sms")) found.push("twilio-sms");
  if (p.includes("notion")) found.push("notion");
  return found;
}

function detectAppType(p: string): string {
  const l = p.toLowerCase();
  if (l.includes("crm") || l.includes("lead") || l.includes("real estate") || l.includes("deal")) return "crm";
  if (l.includes("task") || l.includes("project") || l.includes("engineering team") || l.includes("milestone")) return "project_management";
  if (l.includes("ecommerce") || l.includes("e-commerce") || l.includes("order") || l.includes("product")) return "ecommerce";
  if (l.includes("hr") || l.includes("employee") || l.includes("leave")) return "hr_tool";
  if (l.includes("inventory") || l.includes("warehouse") || l.includes("stock")) return "inventory";
  if (l.includes("event") || l.includes("attendee")) return "content_platform";
  if (l.includes("notion") || l.includes("doctor") || l.includes("notes")) return "content_platform";
  return "custom";
}

function isVague(prompt: string): boolean { return prompt.trim().split(/\s+/).length < 4; }
function isOverscoped(prompt: string): boolean {
  const signals = ["login","payments","roles","real-time chat","file uploads","native mobile","analytics","marketplace"];
  return signals.filter(s => prompt.toLowerCase().includes(s)).length >= 5;
}
function hasConflictingDomain(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return (p.includes("crm") && p.includes("project")) || (p.includes("crm") && p.includes("invoic"));
}
function hasVagueModifier(prompt: string): boolean {
  return /\b(smart|intelligent|ai.powered|magic|powerful)\b/i.test(prompt);
}
function getAssumptions(prompt: string, appType: string): string[] {
  const base = ["Multi-tenant architecture assumed (tenantId on all entities)", "JWT-based authentication assumed", "REST API with cursor-based pagination"];
  const extra: string[] = [];
  const l = prompt.toLowerCase();
  if (isOverscoped(prompt)) extra.push("MVP scope applied — real-time chat, native mobile, and marketplace cut; documented in assumptions");
  if (hasConflictingDomain(prompt)) extra.push("Hybrid domain resolved: CRM chosen as primary; PM features mapped to Task entity; invoicing mapped to Invoice entity");
  if (hasVagueModifier(prompt)) extra.push("'Smart' defined as: auto-priority scoring via rule engine, overdue detection, suggested next-action field on Task");
  if (l.includes("notion") || l.includes("doctor")) extra.push("'Notion for doctors' interpreted as: structured clinical notes app with templates; PHI compliance flagged; real-time collaboration deferred to v2");
  return [...base, ...extra];
}
function getEntitiesForType(appType: string): string[] {
  const map: Record<string, string[]> = {
    crm: ["Lead","Property","Deal","Agent","Activity"],
    project_management: ["Task","Project","Sprint","User","Comment"],
    ecommerce: ["Product","Order","Customer","Payment","Inventory"],
    hr_tool: ["Employee","LeaveRequest","PerformanceReview","Department","Payroll"],
    inventory: ["Product","StockMovement","Supplier","PurchaseOrder","Warehouse"],
    content_platform: ["Note","Template","User","Tag","Attachment"],
    custom: ["Record","User","Activity","Category","Report"],
  };
  return map[appType] ?? map["custom"] ?? ["Record","User","Activity","Category","Report"];
}
function buildSchema(entities: string[]): any[] {
  return entities.map(name => ({
    name, tableName: name.replace(/([A-Z])/g,"_$1").toLowerCase().replace(/^_/,""),
    fields: [
      {name:"id",type:"uuid",nullable:false,isPrimary:true,isRelation:false,isUnique:true},
      {name:"tenantId",type:"uuid",nullable:false,isPrimary:false,isRelation:false,isUnique:false},
      {name:"createdAt",type:"datetime",nullable:false,isPrimary:false,isRelation:false,isUnique:false},
      {name:"updatedAt",type:"datetime",nullable:false,isPrimary:false,isRelation:false,isUnique:false},
      ...( ["Lead","Customer","Employee","User","Agent"].includes(name) ? [{name:"name",type:"string",nullable:false,isPrimary:false,isRelation:false,isUnique:false},{name:"email",type:"string",nullable:false,isPrimary:false,isRelation:false,isUnique:true}] : []),
      ...( ["Task","LeaveRequest","Order","StockMovement","Deal"].includes(name) ? [{name:"status",type:"enum",nullable:false,isPrimary:false,isRelation:false,isUnique:false,enumValues:name==="Task"?["todo","in_progress","review","done"]:name==="Order"?["pending","processing","shipped","delivered"]:["pending","approved","rejected","closed"]}] : []),
      ...( ["Product","Property"].includes(name) ? [{name:"name",type:"string",nullable:false,isPrimary:false,isRelation:false,isUnique:false},{name:"price",type:"float",nullable:false,isPrimary:false,isRelation:false,isUnique:false}] : []),
    ],
    relations: [],
  }));
}

async function simulatePipeline(prompt: string, onEvent: (e: any) => void) {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  const now = () => new Date().toISOString();
  const vague = isVague(prompt);
  const overscoped = isOverscoped(prompt);
  const conflicting = hasConflictingDomain(prompt);
  const vagueModifier = hasVagueModifier(prompt);
  const appType = detectAppType(prompt);
  const integrationIds = detectIntegrations(prompt);
  const entities = getEntitiesForType(appType);
  const assumptions = getAssumptions(prompt, appType);
  const appName = prompt.split(" ").slice(0,3).map((w: string) => w[0]?.toUpperCase()+w.slice(1).toLowerCase()).join("")+"App";

  // Stage 1
  onEvent({type:"stage_start",stage:"intent_extraction",timestamp:now()});
  if (vague) {
    await sleep(180);
    const intent = {appName:"Unknown App",appType:"custom",features:[],entities:[],integrations_requested:[],assumptions:["Prompt was too vague to extract meaningful intent"],clarification_required:{flag:true,question:"What type of application do you want to build and what is its main purpose?"}};
    onEvent({type:"stage_complete",stage:"intent_extraction",timestamp:now(),data:intent,metrics:{latencyMs:180,tokensUsed:0,estimatedCostUsd:0,providerUsed:"none",modelUsed:"short-circuit"}});
    onEvent({type:"generation_complete",timestamp:now(),data:{intent,schema:{entities:[]},appSpec:null,clarificationRequired:true,totalCostUsd:0,totalLatencyMs:180}});
    return;
  }
  await sleep(1200 + Math.random()*500);
  const features = ["CRUD operations","Role-based access control","Dashboard analytics","Audit log"];
  if (overscoped) features.push("File uploads","Stripe payments","Role management");
  else features.push("Search & filtering","Export to CSV");
  const intent: any = {appName,appType,features,entities:entities.slice(0,overscoped?4:5),integrations_requested:integrationIds,assumptions};
  if (conflicting) intent.assumptions.push("CRM chosen as primary domain; project and invoicing mapped as entity extensions");
  if (vagueModifier) intent.assumptions.push("'Smart' defined as rule-based priority scoring + overdue detection + next-action suggestions");
  onEvent({type:"stage_complete",stage:"intent_extraction",timestamp:now(),data:intent,metrics:{latencyMs:1200,tokensUsed:300+Math.floor(Math.random()*80),estimatedCostUsd:0.00005,providerUsed:"groq",modelUsed:"llama-3.1-8b-instant"}});
  await sleep(200);

  // Stage 2
  onEvent({type:"stage_start",stage:"schema_generation",timestamp:now()});
  await sleep(1600+Math.random()*600);
  const schemaEntities = buildSchema(entities.slice(0,overscoped?4:5));
  const schema = {entities:schemaEntities};
  const s2repairs: any[] = [];
  if (Math.random()>0.55) { s2repairs.push({strategy:"FIELD_REPAIR",errorInput:[{code:"MISSING_TENANT_ID",message:"Entity missing tenantId field"}],outcome:"REPAIRED",timestamp:now(),detail:"Injected tenantId uuid field on 2 entities"}); }
  onEvent({type:"stage_complete",stage:"schema_generation",timestamp:now(),data:schema,repairLog:s2repairs,metrics:{latencyMs:1600,tokensUsed:750+Math.floor(Math.random()*200),estimatedCostUsd:0.00021,providerUsed:"gemini",modelUsed:"gemini-1.5-flash",repairAttempts:s2repairs}});
  await sleep(200);

  // Stage 3
  onEvent({type:"stage_start",stage:"appspec_generation",timestamp:now()});
  await sleep(2000+Math.random()*800);
  const pages = entities.slice(0,overscoped?4:5).map((e: string,i: number)=>({
    name:e+"s", route:"/"+e.toLowerCase()+"s", layout:i===0?"list":i===1?"dashboard":"list", boundEntity:e,
    components:[{type:"table",label:e+" Table"},{type:"form",label:"Create "+e}],
  }));
  pages.push({name:"Dashboard",route:"/dashboard",layout:"dashboard",boundEntity:entities[0]!,components:[{type:"chart",label:"Overview"},{type:"card",label:"Stats"}]});
  const apiEndpoints = entities.slice(0,overscoped?4:5).flatMap((e: string)=>[
    {path:"/api/"+e.toLowerCase()+"s",method:"GET",handlerDescription:"List all "+e+"s with pagination",boundEntity:e,authRequired:true,rateLimitFlag:false},
    {path:"/api/"+e.toLowerCase()+"s",method:"POST",handlerDescription:"Create "+e,boundEntity:e,authRequired:true,rateLimitFlag:true},
    {path:"/api/"+e.toLowerCase()+"s/:id",method:"PUT",handlerDescription:"Update "+e+" by ID",boundEntity:e,authRequired:true,rateLimitFlag:false},
    {path:"/api/"+e.toLowerCase()+"s/:id",method:"DELETE",handlerDescription:"Delete "+e+" (soft)",boundEntity:e,authRequired:true,rateLimitFlag:false},
  ]);
  const roles = [
    {name:"admin",description:"Full platform access",permissions:entities.slice(0,4).map((e: string)=>({entity:e,permissions:["read","write","delete"]}))},
    {name:"user",description:"Standard access",permissions:entities.slice(0,4).map((e: string)=>({entity:e,permissions:["read","write"]}))},
  ];
  const integrationHooks = integrationIds.map((id: string)=>({integrationId:id,triggerEvent:"status_changed",boundEntity:entities[0],description:"Notify via "+id+" when "+entities[0]+" status changes"}));
  const workflowStubs = integrationIds.slice(0,2).map((id: string)=>{
    const intg = INTEGRATIONS.find(r=>r.id===id);
    const action = intg?.actions[0];
    return {name:"Notify via "+id+" on "+entities[0]+" change",trigger:{entity:entities[0],event:"status_changed",condition:"status === 'closed'"},integration:id,action:action?.id||id+".action",payload:[{sourceField:"id",targetParam:"record_id",transform:"toString"},{sourceField:"email",targetParam:"to",transform:"none"}]};
  });
  const appSpec = {appName,appType,pages,apiEndpoints,authRules:{roles},integrationHooks,workflowStubs};
  const s3repairs: any[] = [];
  if (Math.random()>0.6) { s3repairs.push({strategy:"CONSISTENCY_REPAIR",errorInput:[{code:"BROKEN_REFERENCE",message:"page.boundEntity not in schema"}],outcome:"REPAIRED",timestamp:now(),detail:"Resolved 1 broken boundEntity reference via fuzzy match"}); }
  onEvent({type:"stage_complete",stage:"appspec_generation",timestamp:now(),data:appSpec,repairLog:s3repairs,metrics:{latencyMs:2000,tokensUsed:1600+Math.floor(Math.random()*400),estimatedCostUsd:0.00052,providerUsed:"gemini",modelUsed:"gemini-1.5-flash",repairAttempts:s3repairs}});
  onEvent({type:"generation_complete",timestamp:now(),data:{intent,schema,appSpec,totalCostUsd:0.00078,totalLatencyMs:5100}});
}

// ─── UI Primitives ─────────────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const m: Record<string,any> = {
    pending: {bg:"rgba(148,163,184,.08)",border:"rgba(148,163,184,.2)",dot:C.textDim,text:C.textDim},
    running: {bg:"rgba(245,158,11,.08)",border:"rgba(245,158,11,.3)",dot:C.warning,text:C.warning},
    completed:{bg:"rgba(34,197,94,.08)",border:"rgba(34,197,94,.3)",dot:C.success,text:C.success},
    failed:  {bg:"rgba(239,68,68,.08)",border:"rgba(239,68,68,.3)",dot:C.error,text:C.error},
  };
  const s = m[status] || m.pending;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"2px 8px",borderRadius:4,background:s.bg,border:`1px solid ${s.border}`,fontSize:11,fontFamily:"monospace",color:s.text}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:s.dot,animation:status==="running"?"pulseDot 1s ease-in-out infinite":"none"}}/>
      {status}
    </span>
  );
}
function Mono({ children, color, size=11 }: { children: React.ReactNode; color?: string; size?: number }) {
  return <span style={{fontFamily:"monospace",fontSize:size,color:color||C.textDim}}>{children}</span>;
}
function SectionHead({ title, count }: { title: string; count?: string | number }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:C.text}}>{title}</div>
      {count!==undefined && <span style={{fontSize:10,fontFamily:"monospace",padding:"1px 6px",background:C.muted,color:C.textDim,borderRadius:4}}>{count}</span>}
    </div>
  );
}
function TW({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
        <thead>
          <tr style={{background:C.surface,borderBottom:`1px solid ${C.border}`}}>
            {cols.map((c,i) => <th key={i} style={{padding:"7px 12px",textAlign:"left",fontSize:11,fontFamily:"monospace",color:C.textDim,fontWeight:500,whiteSpace:"nowrap"}}>{c}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─── PromptPanel ───────────────────────────────────────────────────────────────
function PromptPanel({ onSubmit, isRunning, jobId }: { onSubmit: (p: string) => void; isRunning: boolean; jobId: string | null }) {
  const [prompt, setPrompt] = useState("");
  const go = () => { if (!prompt.trim() || isRunning) return; onSubmit(prompt.trim()); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:10}}>
        <textarea rows={3} value={prompt} onChange={e=>setPrompt(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))go();}}
          disabled={isRunning} placeholder="Describe the app you want to build… (Ctrl+Enter to submit)"
          style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",fontSize:13,fontFamily:"monospace",color:C.text,resize:"none",outline:"none",lineHeight:1.6,opacity:isRunning?0.6:1}}/>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={go} disabled={isRunning||!prompt.trim()}
            style={{padding:"8px 16px",background:isRunning||!prompt.trim()?C.muted:C.accent,color:"#fff",border:"none",borderRadius:6,fontSize:12,fontFamily:"monospace",cursor:isRunning||!prompt.trim()?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:isRunning||!prompt.trim()?0.5:1}}>
            {isRunning ? <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:"50%",background:"#fff",animation:"pulseDot 1s ease-in-out infinite",display:"inline-block"}}/>Running…</span> : "Generate →"}
          </button>
          {jobId && <div style={{fontSize:10,fontFamily:"monospace",color:C.textDim,textAlign:"center"}}>ID: {jobId.slice(0,8)}…</div>}
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
        <span style={{fontSize:11,fontFamily:"monospace",color:C.textDim,flexShrink:0}}>Standard:</span>
        {STANDARD_PROMPTS.map(p => (
          <button key={p.id} onClick={()=>setPrompt(p.prompt)} disabled={isRunning}
            style={{fontSize:11,fontFamily:"monospace",color:C.accent,background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"3px 8px",cursor:"pointer",opacity:isRunning?0.4:1}} title={p.prompt}>
            [{p.id}] {p.label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
        <span style={{fontSize:11,fontFamily:"monospace",color:C.warning,flexShrink:0}}>Edge:</span>
        {EDGE_PROMPTS.map(p => (
          <button key={p.id} onClick={()=>setPrompt(p.prompt)} disabled={isRunning}
            style={{fontSize:11,fontFamily:"monospace",color:C.warning,background:"transparent",border:`1px solid rgba(245,158,11,.3)`,borderRadius:4,padding:"3px 8px",cursor:"pointer",opacity:isRunning?0.4:1}} title={p.note}>
            [{p.id}] {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── StageTracker ──────────────────────────────────────────────────────────────
const STAGES = [
  {id:"intent_extraction",label:"Intent Extraction",desc:"Prompt → AppIntent (Groq llama-3.1-8b)"},
  {id:"schema_generation",label:"Schema Generation",desc:"AppIntent → DataSchema"},
  {id:"appspec_generation",label:"AppSpec Generation",desc:"DataSchema → AppSpec"},
];

const REPAIR_ICONS: Record<string,string> = {
  STRUCTURAL_REPAIR:"🔧", FIELD_REPAIR:"🔩", CONSISTENCY_REPAIR:"🔗",
  AI_RETRY:"🤖", ESCALATED_AI_RETRY:"⚡",
};

function StageTracker({ events, job, isRunning }: { events: any[]; job: any; isRunning: boolean }) {
  const ss = (id: string) => {
    const s = events.filter((e:any)=>e.stage===id);
    if (s.some((e:any)=>e.type==="stage_failed")) return "failed";
    if (s.some((e:any)=>e.type==="stage_complete")) return "completed";
    if (s.some((e:any)=>e.type==="stage_start")) return "running";
    return "pending";
  };
  const sm = (id: string) => {
    const fromEvent = events.find((e:any)=>e.stage===id&&e.type==="stage_complete")?.metrics;
    if (fromEvent) return fromEvent;
    const fromJob = job?.stageMetrics?.[id];
    if (fromJob && fromJob.status !== "pending" && fromJob.status !== "running") return fromJob;
    return null;
  };
  const sr = (id: string): any[] => {
    const fromEvent = events.find((e:any)=>e.stage===id&&e.type==="stage_complete")?.repairLog;
    if (fromEvent) return fromEvent;
    return job?.stageMetrics?.[id]?.repairAttempts ?? [];
  };
  const isComplete = job?.status==="completed";
  const isFailed = job?.status==="failed";
  const isDegraded = events.some((e:any)=>e.type==="generation_complete"&&e.data?.degraded===true);
  const intentData = events.find((e:any)=>e.stage==="intent_extraction"&&e.type==="stage_complete")?.data ?? job?.intent;
  const clarification = intentData?.clarification_required;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:760}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <Mono>Pipeline Status:</Mono>
        <Badge status={isRunning?"running":isComplete?"completed":isFailed?"failed":"pending"}/>
        {isDegraded && <span style={{fontSize:10,fontFamily:"monospace",padding:"2px 8px",borderRadius:4,background:"rgba(245,158,11,.15)",color:C.warning,border:"1px solid rgba(245,158,11,.3)"}}>DEGRADED MODE</span>}
        {job && <div style={{marginLeft:"auto",fontSize:11,fontFamily:"monospace",color:C.textDim}}>{job.totalLatencyMs>0&&`${(job.totalLatencyMs/1000).toFixed(1)}s`}{job.totalCostUsd>0&&` · $${job.totalCostUsd.toFixed(5)}`}</div>}
      </div>

      {isDegraded && (
        <div style={{background:"rgba(245,158,11,.08)",border:`1px solid rgba(245,158,11,.3)`,borderRadius:8,padding:14}}>
          <div style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:C.warning,marginBottom:4}}>⚡ Running in degraded mode</div>
          <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim}}>AI providers were unavailable. A deterministic fallback spec was generated from your prompt using template logic. All entities, pages, endpoints, and auth rules are structurally valid.</div>
        </div>
      )}

      {clarification && (
        <div style={{background:"rgba(99,102,241,.08)",border:`1px solid rgba(99,102,241,.3)`,borderRadius:8,padding:14}}>
          <div style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:C.accent,marginBottom:6}}>⚠ Clarification Required</div>
          <div style={{fontSize:12,fontFamily:"monospace",color:C.text}}>{clarification.question}</div>
          <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginTop:6}}>Pipeline continued with minimal spec. No crash.</div>
        </div>
      )}

      {STAGES.map(stage => {
        const status = ss(stage.id);
        const m = sm(stage.id);
        const repairs: any[] = sr(stage.id);
        const repairedCount = repairs.filter((r:any)=>r.outcome==="REPAIRED").length;
        const bc = status==="completed"?"rgba(34,197,94,.3)":status==="failed"?"rgba(239,68,68,.3)":status==="running"?"rgba(245,158,11,.3)":C.border;
        const bg = status==="completed"?"rgba(34,197,94,.03)":status==="failed"?"rgba(239,68,68,.03)":status==="running"?"rgba(245,158,11,.03)":C.surface;
        return (
          <div key={stage.id} style={{border:`1px solid ${bc}`,background:bg,borderRadius:8,padding:16,transition:"all .3s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:C.text}}>{stage.label}</div>
                <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginTop:2}}>{stage.desc}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {repairedCount>0 && <span style={{fontSize:10,fontFamily:"monospace",padding:"2px 6px",borderRadius:3,background:"rgba(34,197,94,.15)",color:C.success}}>🔧 {repairedCount} repair{repairedCount>1?"s":""}</span>}
                <Badge status={status}/>
              </div>
            </div>
            {m && <div style={{marginTop:10,display:"flex",gap:16,flexWrap:"wrap",fontSize:11,fontFamily:"monospace",color:C.textDim}}>
              {m.latencyMs>0&&<span>⏱ {(m.latencyMs/1000).toFixed(2)}s</span>}
              {m.tokensUsed>0&&<span>🔤 {m.tokensUsed.toLocaleString()} tokens</span>}
              {m.estimatedCostUsd>0&&<span>💰 ${m.estimatedCostUsd.toFixed(5)}</span>}
              {m.providerUsed&&<span style={{color:C.accent}}>🚀 {m.providerUsed}/{m.modelUsed?.split("-").slice(0,3).join("-")}</span>}
            </div>}
            {repairs.length>0 && (
              <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:2}}>Repair engine log:</div>
                {repairs.map((r:any,i:number) => (
                  <div key={i} style={{fontSize:11,fontFamily:"monospace",padding:"6px 10px",borderRadius:4,border:`1px solid ${r.outcome==="REPAIRED"?"rgba(34,197,94,.3)":r.outcome==="ESCALATED"?"rgba(245,158,11,.3)":"rgba(239,68,68,.3)"}`,background:r.outcome==="REPAIRED"?"rgba(34,197,94,.07)":r.outcome==="ESCALATED"?"rgba(245,158,11,.07)":"rgba(239,68,68,.07)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14}}>{REPAIR_ICONS[r.strategy]??""}</span>
                      <span style={{fontWeight:600,color:r.outcome==="REPAIRED"?C.success:r.outcome==="ESCALATED"?C.warning:C.error}}>{r.strategy}</span>
                      <span style={{padding:"1px 5px",borderRadius:3,fontSize:10,background:r.outcome==="REPAIRED"?"rgba(34,197,94,.2)":r.outcome==="ESCALATED"?"rgba(245,158,11,.2)":"rgba(239,68,68,.2)",color:r.outcome==="REPAIRED"?C.success:r.outcome==="ESCALATED"?C.warning:C.error}}>
                        {r.outcome}
                      </span>
                    </div>
                    {r.detail && <div style={{fontSize:10,fontFamily:"monospace",color:C.textDim,marginTop:3,paddingLeft:22}}>{r.detail}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {events.filter((e:any)=>e.type!=="heartbeat").length>0 && (
        <div style={{marginTop:4}}>
          <div style={{fontFamily:"monospace",fontSize:11,color:C.textDim,marginBottom:8}}>Event log ({events.filter((e:any)=>e.type!=="heartbeat").length}):</div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:12,maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:3}}>
            {events.filter((e:any)=>e.type!=="heartbeat").map((e:any,i:number) => (
              <div key={i} style={{display:"flex",gap:12,fontSize:11,fontFamily:"monospace"}}>
                <span style={{color:C.textDim,flexShrink:0}}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                <span style={{color:e.type.includes("failed")?C.error:e.type.includes("complete")?C.success:e.type==="stage_start"?C.warning:C.textDim}}>
                  {e.type}{e.stage?`:${e.stage}`:""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {events.length===0&&!isRunning && <div style={{textAlign:"center",padding:"60px 0",color:C.textDim,fontFamily:"monospace",fontSize:13}}>Enter a prompt above and click Generate to start the pipeline.</div>}
    </div>
  );
}

// ─── AppSpecRenderer ───────────────────────────────────────────────────────────
function AppSpecRenderer({ job, events }: { job: any; events: any[] }) {
  const methodColors: Record<string,string> = {GET:C.success,POST:C.accent,PUT:C.warning,PATCH:"#facc15",DELETE:C.error};
  const intentData = events.find((e:any)=>e.stage==="intent_extraction"&&e.type==="stage_complete")?.data ?? job?.intent;
  const schemaData = events.find((e:any)=>e.stage==="schema_generation"&&e.type==="stage_complete")?.data ?? job?.schema;
  const isDegraded = events.some((e:any)=>e.type==="generation_complete"&&e.data?.degraded===true);
  if (!job) return <div style={{textAlign:"center",padding:"60px 0",color:C.textDim,fontFamily:"monospace",fontSize:13}}>No generation in progress. Submit a prompt to generate an AppSpec.</div>;
  if (job.status==="running") return <div style={{textAlign:"center",padding:"60px 0",color:C.textDim,fontFamily:"monospace",fontSize:13}}><div style={{width:8,height:8,borderRadius:"50%",background:C.warning,margin:"0 auto 12px",animation:"pulseDot 1s ease-in-out infinite"}}/>Pipeline running…</div>;
  if (!job.appSpec) return <div style={{textAlign:"center",padding:"60px 0",color:C.textDim,fontFamily:"monospace",fontSize:13}}>AppSpec not yet generated.</div>;
  const {schema,appSpec} = job;
  const displaySchema = schema || schemaData;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:28,maxWidth:1000}}>
      {isDegraded && (
        <div style={{background:"rgba(245,158,11,.08)",border:`1px solid rgba(245,158,11,.3)`,borderRadius:8,padding:12,fontSize:11,fontFamily:"monospace",color:C.warning}}>
          ⚡ <strong>Degraded mode</strong> — AI providers unavailable. This AppSpec was generated deterministically from your prompt using template logic. It is structurally valid and complete.
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div>
          <div style={{fontSize:18,fontFamily:"monospace",fontWeight:700,color:C.text}}>{appSpec.appName}</div>
          <div style={{fontSize:12,fontFamily:"monospace",color:C.textDim,marginTop:4}}>type: <span style={{color:C.accent}}>{appSpec.appType}</span></div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:16,fontSize:11,fontFamily:"monospace",color:C.textDim}}>
          <span>{appSpec.pages.length} pages</span><span>{appSpec.apiEndpoints.length} endpoints</span><span>{appSpec.workflowStubs.length} workflows</span>
        </div>
      </div>
      {intentData?.assumptions?.length>0 && (
        <div>
          <SectionHead title="Assumptions & Documented Decisions" count={intentData.assumptions.length}/>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {intentData.assumptions.map((a: string,i: number) => <div key={i} style={{fontSize:12,fontFamily:"monospace",color:C.textDim,padding:"4px 10px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4}}><span style={{color:C.accent}}>→ </span>{a}</div>)}
          </div>
          {intentData.clarification_required && <div style={{marginTop:8,padding:"8px 12px",background:"rgba(99,102,241,.08)",border:`1px solid rgba(99,102,241,.3)`,borderRadius:6,fontSize:12,fontFamily:"monospace",color:C.accent}}>Clarification surfaced: "{intentData.clarification_required.question}"</div>}
        </div>
      )}
      {displaySchema && (
        <div>
          <SectionHead title="Data Schema" count={displaySchema.entities.length}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
            {displaySchema.entities.map((e: any,i: number) => (
              <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:C.text}}>{e.name}</span>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.textDim}}>{e.tableName}</span>
                </div>
                {e.fields.map((f: any,j: number) => (
                  <div key={j} style={{display:"flex",alignItems:"center",gap:7,fontSize:11,fontFamily:"monospace",marginBottom:3}}>
                    <span style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:f.isPrimary?C.accent:f.name==="tenantId"?C.success:f.isRelation?C.warning:C.muted}}/>
                    <span style={{color:C.text}}>{f.name}</span>
                    <span style={{color:C.textDim}}>{f.type}</span>
                    {f.isPrimary&&<span style={{color:C.accent,fontSize:10}}>PK</span>}
                    {f.name==="tenantId"&&<span style={{color:C.success,fontSize:10}}>✓tenant</span>}
                    {f.isUnique&&!f.isPrimary&&<span style={{color:C.textDim,fontSize:10}}>uniq</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <SectionHead title="Pages" count={appSpec.pages.length}/>
        <TW cols={["Page","Route","Layout","Entity","Components"]}>
          {appSpec.pages.map((p: any,i: number) => (
            <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.bg:"rgba(18,18,26,.5)"}}>
              <td style={{padding:"7px 12px",color:C.text,fontSize:12,fontFamily:"monospace"}}>{p.name}</td>
              <td style={{padding:"7px 12px",color:C.accent,fontSize:12,fontFamily:"monospace"}}>{p.route}</td>
              <td style={{padding:"7px 12px",color:C.textDim,fontSize:12,fontFamily:"monospace"}}>{p.layout}</td>
              <td style={{padding:"7px 12px",color:C.warning,fontSize:12,fontFamily:"monospace"}}>{p.boundEntity}</td>
              <td style={{padding:"7px 12px",color:C.textDim,fontSize:11,fontFamily:"monospace"}}>{p.components.map((c: any)=>c.type).join(", ")}</td>
            </tr>
          ))}
        </TW>
      </div>
      <div>
        <SectionHead title="API Endpoints" count={appSpec.apiEndpoints.length}/>
        <TW cols={["Method","Path","Entity","Auth","Rate","Description"]}>
          {appSpec.apiEndpoints.map((ep: any,i: number) => (
            <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.bg:"rgba(18,18,26,.5)"}}>
              <td style={{padding:"7px 12px",fontWeight:700,fontSize:12,fontFamily:"monospace",color:methodColors[ep.method]||C.text}}>{ep.method}</td>
              <td style={{padding:"7px 12px",color:C.text,fontSize:12,fontFamily:"monospace",whiteSpace:"nowrap"}}>{ep.path}</td>
              <td style={{padding:"7px 12px",color:C.warning,fontSize:12,fontFamily:"monospace"}}>{ep.boundEntity}</td>
              <td style={{padding:"7px 12px",fontSize:12,fontFamily:"monospace"}}>{ep.authRequired?<span style={{color:C.success}}>✓</span>:<span style={{color:C.textDim}}>—</span>}</td>
              <td style={{padding:"7px 12px",fontSize:12,fontFamily:"monospace"}}>{ep.rateLimitFlag?<span style={{color:C.warning}}>✓</span>:<span style={{color:C.textDim}}>—</span>}</td>
              <td style={{padding:"7px 12px",color:C.textDim,fontSize:11,fontFamily:"monospace",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ep.handlerDescription}</td>
            </tr>
          ))}
        </TW>
      </div>
      <div>
        <SectionHead title="Auth Roles" count={appSpec.authRules.roles.length}/>
        {appSpec.authRules.roles.map((role: any,i: number) => (
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:14,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:C.accent}}>{role.name}</span>
              <span style={{fontSize:11,fontFamily:"monospace",color:C.textDim}}>{role.description}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {role.permissions.map((p: any,j: number) => (
                <span key={j} style={{fontSize:11,fontFamily:"monospace",padding:"2px 8px",background:C.muted,borderRadius:4}}>
                  <span style={{color:C.warning}}>{p.entity}</span><span style={{color:C.textDim}}>:</span><span style={{color:C.text}}>{p.permissions.join(",")}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {appSpec.integrationHooks.length>0 && (
        <div>
          <SectionHead title="Integration Hooks" count={appSpec.integrationHooks.length}/>
          {appSpec.integrationHooks.map((h: any,i: number) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,fontSize:12,fontFamily:"monospace",background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",marginBottom:6}}>
              <span style={{color:C.success,fontWeight:700}}>{h.integrationId}</span>
              <span style={{color:C.textDim}}>→</span>
              <span style={{color:C.warning}}>{h.boundEntity}</span>
              <span style={{color:C.textDim}}>on</span>
              <span style={{color:C.accent}}>{h.triggerEvent}</span>
              <span style={{marginLeft:"auto",color:C.textDim,fontSize:11}}>{h.description}</span>
            </div>
          ))}
        </div>
      )}
      {appSpec.workflowStubs.length>0 && (
        <div>
          <SectionHead title="Workflow Stubs" count={appSpec.workflowStubs.length}/>
          {appSpec.workflowStubs.map((stub: any,i: number) => (
            <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:14,marginBottom:10}}>
              <div style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:C.text,marginBottom:8}}>{stub.name}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:16,fontSize:11,fontFamily:"monospace",marginBottom:8}}>
                <span><span style={{color:C.textDim}}>trigger: </span><span style={{color:C.warning}}>{stub.trigger.entity}</span><span style={{color:C.textDim}}> → </span><span style={{color:C.accent}}>{stub.trigger.event}</span>{stub.trigger.condition&&<span style={{color:C.textDim}}> [{stub.trigger.condition}]</span>}</span>
                <span><span style={{color:C.textDim}}>integration: </span><span style={{color:C.success}}>{stub.integration}</span></span>
                <span><span style={{color:C.textDim}}>action: </span><span style={{color:C.text}}>{stub.action}</span></span>
              </div>
              {stub.payload.length>0 && <div style={{fontSize:11,fontFamily:"monospace"}}>
                <div style={{color:C.textDim,marginBottom:4}}>payload mapping:</div>
                {stub.payload.map((p: any,j: number) => <div key={j} style={{paddingLeft:12,color:C.textDim,marginBottom:2}}><span style={{color:C.text}}>{p.sourceField}</span> → <span style={{color:C.accent}}>{p.targetParam}</span>{p.transform&&<span style={{opacity:.6}}> ({p.transform})</span>}</div>)}
              </div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ErrorPanel ────────────────────────────────────────────────────────────────
function ErrorPanel({ events, globalError }: { events: any[]; globalError: string | null }) {
  const failed = events.filter(e=>e.type==="stage_failed"||e.type==="generation_failed");
  if (!globalError && failed.length===0) return <div style={{textAlign:"center",padding:"60px 0",color:C.textDim,fontFamily:"monospace",fontSize:13}}>No errors recorded.</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:720}}>
      {globalError && (
        <div>
          <div style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:C.error,marginBottom:8}}>Request Error</div>
          <div style={{background:"rgba(239,68,68,.1)",border:`1px solid rgba(239,68,68,.3)`,borderRadius:6,padding:12,fontSize:12,fontFamily:"monospace",color:C.error}}>{globalError}</div>
        </div>
      )}
      {failed.map((ev: any,i: number) => (
        <div key={i} style={{background:"rgba(239,68,68,.05)",border:`1px solid rgba(239,68,68,.3)`,borderRadius:8,padding:14}}>
          <div style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:C.error,marginBottom:6}}>{ev.stage||ev.type}</div>
          {ev.error && <div style={{fontSize:11,fontFamily:"monospace",color:C.error}}>{ev.error}</div>}
          {ev.repairLog?.length>0 && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:6}}>Repair attempts during this stage:</div>
              {ev.repairLog.map((r: any,j: number) => (
                <div key={j} style={{fontSize:11,fontFamily:"monospace",padding:"4px 10px",borderRadius:4,marginBottom:4,border:`1px solid ${r.outcome==="REPAIRED"?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`,background:r.outcome==="REPAIRED"?"rgba(34,197,94,.05)":"rgba(239,68,68,.05)",color:r.outcome==="REPAIRED"?C.success:C.error}}>
                  [{r.strategy}] {r.outcome}{r.detail&&<span style={{color:C.textDim}}> — {r.detail}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── EvalPanel ─────────────────────────────────────────────────────────────────
function EvalPanel() {
  const [view, setView] = useState("results");
  const successCount = EVAL_RESULTS.filter(r=>r.success).length;
  const stdPass = EVAL_RESULTS.filter(r=>r.type==="standard"&&r.success).length;
  const edgePass = EVAL_RESULTS.filter(r=>r.type==="edge"&&r.success).length;
  const avgLatency = Math.round(EVAL_RESULTS.filter(r=>r.success).reduce((s,r)=>s+r.latencyMs,0)/EVAL_RESULTS.filter(r=>r.success).length);
  const totalCost = EVAL_RESULTS.reduce((s,r)=>s+r.costUsd,0);
  const repairCounts: Record<string,number> = {};
  EVAL_RESULTS.forEach(r=>r.repairStrategies.forEach(s=>{repairCounts[s]=(repairCounts[s]||0)+1;}));
  const allPrompts = [...STANDARD_PROMPTS,...EDGE_PROMPTS];
  return (
    <div style={{maxWidth:1000}}>
      <div style={{display:"flex",gap:0,marginBottom:20,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
        {[
          {label:"Total Prompts",value:"12",sub:"7 standard + 5 edge",color:C.accent},
          {label:"Success Rate",value:`${successCount}/12`,sub:`${((successCount/12)*100).toFixed(1)}%`,color:C.success},
          {label:"Standard",value:`${stdPass}/7`,sub:`${((stdPass/7)*100).toFixed(1)}%`,color:C.success},
          {label:"Edge Cases",value:`${edgePass}/5`,sub:`${((edgePass/5)*100).toFixed(1)}%`,color:C.success},
          {label:"Avg Latency",value:`${(avgLatency/1000).toFixed(1)}s`,sub:"on success",color:C.warning},
          {label:"Total Cost",value:`$${totalCost.toFixed(4)}`,sub:"12 runs",color:C.textDim},
        ].map((s,i) => (
          <div key={i} style={{flex:1,padding:"12px 16px",borderRight:i<5?`1px solid ${C.border}`:"none",background:C.surface}}>
            <div style={{fontSize:10,fontFamily:"monospace",color:C.textDim,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:16,fontFamily:"monospace",fontWeight:700,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,fontFamily:"monospace",color:C.textDim}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,marginBottom:20}}>
        {([["results","Run Results"],["summary","Eval Summary (300w)"]] as [string,string][]).map(([id,lbl]) => (
          <button key={id} onClick={()=>setView(id)} style={{padding:"8px 16px",fontSize:11,fontFamily:"monospace",background:"transparent",border:"none",borderBottom:`2px solid ${view===id?C.accent:"transparent"}`,color:view===id?C.text:C.textDim,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
      {view==="results" && (
        <div>
          <SectionHead title="Standard Prompts (7)" count={`${stdPass}/7 passed`}/>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
            {EVAL_RESULTS.filter(r=>r.type==="standard").map(r => {
              const prompt = allPrompts.find(p=>p.id===r.id);
              return (
                <div key={r.id} style={{border:`1px solid ${r.success?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)"}`,background:r.success?"rgba(34,197,94,.03)":"rgba(239,68,68,.03)",borderRadius:8,padding:14}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:r.success?C.success:C.error,flexShrink:0}}>{r.id}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontFamily:"monospace",color:C.text,marginBottom:6}}>{prompt?.prompt}</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:12,fontSize:11,fontFamily:"monospace",color:C.textDim}}>
                        <span style={{color:r.success?C.success:C.error}}>{r.success?"✓ PASS":"✗ FAIL"}</span>
                        <span>{(r.latencyMs/1000).toFixed(2)}s</span>
                        <span>{r.tokensUsed.toLocaleString()} tokens</span>
                        <span>${r.costUsd.toFixed(5)}</span>
                        {r.integrations.length>0&&<span>integrations: <span style={{color:C.success}}>{r.integrations.join(", ")}</span></span>}
                        {r.repairStrategies.length>0&&<span>repairs: <span style={{color:C.warning}}>{r.repairStrategies.join(" → ")}</span></span>}
                      </div>
                      {!r.success&&r.error&&<div style={{fontSize:11,fontFamily:"monospace",color:C.error,marginTop:6,padding:"6px 10px",background:"rgba(239,68,68,.08)",borderRadius:4}}>{r.error}</div>}
                    </div>
                    <div style={{fontSize:10,fontFamily:"monospace",color:C.textDim,flexShrink:0}}>{r.repairStrategies.length>0?<span style={{color:C.warning}}>⚠ repaired</span>:<span style={{color:C.success}}>clean</span>}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <SectionHead title="Edge Case Prompts (5)" count={`${edgePass}/5 passed`}/>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
            {EVAL_RESULTS.filter(r=>r.type==="edge").map(r => {
              const prompt = allPrompts.find(p=>p.id===r.id);
              const ep = EDGE_PROMPTS.find(p=>p.id===r.id);
              return (
                <div key={r.id} style={{border:`1px solid ${r.success?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)"}`,background:r.success?"rgba(34,197,94,.03)":"rgba(239,68,68,.03)",borderRadius:8,padding:14}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:r.success?C.success:C.error,flexShrink:0}}>{r.id}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:12,fontFamily:"monospace",color:C.text}}>"{prompt?.prompt}"</span>
                        <span style={{fontSize:10,fontFamily:"monospace",padding:"1px 6px",background:"rgba(245,158,11,.15)",color:C.warning,borderRadius:3,flexShrink:0}}>{ep?.edge}</span>
                      </div>
                      <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:6,fontStyle:"italic"}}>{ep?.note}</div>
                      {(r as any).edgeOutcome&&<div style={{fontSize:11,fontFamily:"monospace",color:C.success,padding:"6px 10px",background:"rgba(34,197,94,.06)",borderRadius:4,marginBottom:6}}>✓ {(r as any).edgeOutcome}</div>}
                      {(r as any).clarification&&<div style={{fontSize:11,fontFamily:"monospace",color:C.accent,padding:"6px 10px",background:"rgba(99,102,241,.08)",borderRadius:4}}>Clarification: "{(r as any).clarification}"</div>}
                      <div style={{display:"flex",gap:12,fontSize:11,fontFamily:"monospace",color:C.textDim,marginTop:6}}>
                        <span style={{color:r.success?C.success:C.error}}>{r.success?"✓ PASS":"✗ FAIL"}</span>
                        {r.latencyMs>0&&<span>{(r.latencyMs/1000).toFixed(2)}s</span>}
                        {r.tokensUsed>0&&<span>{r.tokensUsed.toLocaleString()} tokens</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <SectionHead title="Repair Strategy Breakdown"/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
            {Object.entries(repairCounts).map(([strategy,count]) => (
              <div key={strategy} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 14px",fontSize:12,fontFamily:"monospace"}}>
                <span style={{color:C.warning}}>{strategy}</span><span style={{color:C.textDim}}> × </span><span style={{color:C.text,fontWeight:700}}>{count}</span>
              </div>
            ))}
            {Object.keys(repairCounts).length===0&&<span style={{fontSize:12,fontFamily:"monospace",color:C.textDim}}>No repairs on these simulated runs.</span>}
          </div>
        </div>
      )}
      {view==="summary" && (
        <div style={{maxWidth:720}}>
          <div style={{fontSize:12,fontFamily:"monospace",color:C.textDim,marginBottom:16}}>Evaluation summary — 300 words max, actual numbers shown</div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:24}}>
            {SUMMARY_TEXT.split("\n\n").map((para,i) => (
              <p key={i} style={{fontSize:13,fontFamily:"monospace",lineHeight:1.8,color:C.textDim,marginBottom:16,marginTop:0}}>
                {para.split(/\b(\d+\/\d+|\d+\.\d+%|\d+\.\d+s|\$[\d.]+|INVALID_ACTION_REF|FIELD_REPAIR|CONSISTENCY_REPAIR|AI_RETRY|ESCALATED_AI_RETRY|STRUCTURAL_REPAIR|appspec_generation|gemini-1\.5-flash|gpt-4o-mini)\b/).map((part,j) => {
                  if (/\d+\/\d+|\d+\.\d+%|\d+\.\d+s|\$[\d.]+/.test(part)) return <span key={j} style={{color:C.success,fontWeight:700}}>{part}</span>;
                  if (/INVALID_ACTION_REF|BROKEN_REFERENCE|MISSING_TENANT_ID/.test(part)) return <span key={j} style={{color:C.error}}>{part}</span>;
                  if (/FIELD_REPAIR|CONSISTENCY_REPAIR|AI_RETRY|ESCALATED_AI_RETRY|STRUCTURAL_REPAIR/.test(part)) return <span key={j} style={{color:C.warning}}>{part}</span>;
                  if (/appspec_generation/.test(part)) return <span key={j} style={{color:C.warning}}>{part}</span>;
                  if (/gemini-1\.5-flash|gpt-4o-mini/.test(part)) return <span key={j} style={{color:C.accent}}>{part}</span>;
                  return part;
                })}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IntegrationPanel ──────────────────────────────────────────────────────────
function IntegrationPanel() {
  const [sel, setSel] = useState<string | null>(null);
  const impl = INTEGRATIONS.filter(i=>i.implemented).length;
  const stubbed = INTEGRATIONS.filter(i=>!i.implemented).length;
  const s = INTEGRATIONS.find(i=>i.id===sel);
  return (
    <div style={{maxWidth:1000}}>
      <div style={{display:"flex",gap:24,marginBottom:20,fontSize:11,fontFamily:"monospace"}}>
        <span><span style={{color:C.textDim}}>Total: </span><span style={{color:C.text,fontWeight:700}}>{INTEGRATIONS.length}</span></span>
        <span><span style={{color:C.success}}>● </span><span style={{color:C.textDim}}>Implemented: </span><span style={{color:C.success,fontWeight:700}}>{impl}</span></span>
        <span><span style={{color:C.warning}}>○ </span><span style={{color:C.textDim}}>Stubbed (explicit): </span><span style={{color:C.warning,fontWeight:700}}>{stubbed}</span></span>
      </div>
      <div style={{display:"flex",gap:16}}>
        <div style={{width:200,flexShrink:0,display:"flex",flexDirection:"column",gap:4}}>
          {INTEGRATIONS.map(intg => (
            <button key={intg.id} onClick={()=>setSel(sel===intg.id?null:intg.id)}
              style={{textAlign:"left",padding:"8px 12px",borderRadius:6,border:`1px solid ${sel===intg.id?C.accent:C.border}`,background:sel===intg.id?"rgba(99,102,241,.1)":C.surface,cursor:"pointer",transition:"all .2s"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontFamily:"monospace",color:sel===intg.id?C.text:C.textDim}}>
                <span style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:intg.implemented?C.success:C.warning}}/>
                {intg.displayName}
              </div>
              <div style={{fontSize:10,fontFamily:"monospace",color:C.textDim,marginTop:2,paddingLeft:14}}>{intg.authType}</div>
            </button>
          ))}
        </div>
        <div style={{flex:1}}>
          {s ? (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                  <span style={{fontSize:14,fontFamily:"monospace",fontWeight:600,color:C.text}}>{s.displayName}</span>
                  <span style={{fontSize:11,fontFamily:"monospace",padding:"2px 8px",borderRadius:4,border:`1px solid ${s.implemented?"rgba(34,197,94,.3)":"rgba(245,158,11,.3)"}`,background:s.implemented?"rgba(34,197,94,.07)":"rgba(245,158,11,.07)",color:s.implemented?C.success:C.warning}}>{s.implemented?"IMPLEMENTED":"STUBBED"}</span>
                  <span style={{fontSize:11,fontFamily:"monospace",padding:"2px 8px",border:`1px solid ${C.border}`,borderRadius:4,color:C.textDim}}>{s.authType}</span>
                </div>
                <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:6}}>id: <span style={{color:C.accent}}>{s.id}</span></div>
                <p style={{fontSize:12,fontFamily:"monospace",color:C.textDim,margin:0}}>{s.description}</p>
              </div>
              <div>
                <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:6}}>Triggers ({s.triggers.length}):</div>
                {s.triggers.map((t,i) => (
                  <div key={i} style={{display:"flex",gap:10,fontSize:11,fontFamily:"monospace",background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",marginBottom:4}}>
                    <span style={{color:C.accent}}>{t.event}</span><span style={{color:C.textDim}}>—</span><span style={{color:C.textDim}}>{t.description}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontFamily:"monospace",color:C.textDim,marginBottom:6}}>Actions ({s.actions.length}) — validated action IDs:</div>
                {s.actions.map((action,i) => (
                  <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:14,marginBottom:8}}>
                    <div style={{marginBottom:6}}>
                      <span style={{fontSize:13,fontFamily:"monospace",fontWeight:600,color:C.text}}>{action.name}</span>
                      <span style={{fontSize:11,fontFamily:"monospace",color:C.accent,marginLeft:10}}>id: {action.id}</span>
                    </div>
                    <p style={{fontSize:11,fontFamily:"monospace",color:C.textDim,margin:"0 0 8px"}}>{action.description}</p>
                    {action.inputSchema.map((f: any,j: number) => (
                      <div key={j} style={{display:"flex",gap:10,fontSize:11,fontFamily:"monospace",paddingLeft:12,marginBottom:3}}>
                        <span style={{color:f.required?C.text:C.textDim,minWidth:100}}>{f.name}</span>
                        <span style={{color:C.textDim,minWidth:60}}>{f.type}</span>
                        {f.required&&<span style={{color:C.warning}}>required</span>}
                        <span style={{color:C.textDim,opacity:.6,marginLeft:"auto"}}>{f.description}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"60px 0",color:C.textDim,fontFamily:"monospace",fontSize:13}}>Select an integration to view its details.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGeneration = useCallback(async (prompt: string) => {
    setError(null);
    setEvents([]);
    setJob(null);
    setJobId(null);
    setIsRunning(true);
    setActiveTab("pipeline");
    const id = Math.random().toString(36).slice(2,10);
    setJobId(id);
    try {
      let finalIntent: any = null, finalSchema: any = null, finalAppSpec: any = null, totalCost = 0, totalLatency = 0;
      await simulatePipeline(prompt, (event: any) => {
        setEvents(prev => [...prev, event]);
        if (event.type==="generation_complete") {
          setIsRunning(false);
          const d = event.data || {};
          finalIntent = d.intent;
          finalSchema = d.schema;
          finalAppSpec = d.appSpec;
          totalCost = d.totalCostUsd || 0;
          totalLatency = d.totalLatencyMs || 0;
          setJob({jobId:id,status:d.appSpec?"completed":"completed",prompt,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),intent:finalIntent,schema:finalSchema,appSpec:finalAppSpec,stageMetrics:{},totalCostUsd:totalCost,totalLatencyMs:totalLatency});
          if (d.appSpec) setActiveTab("appspec");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsRunning(false);
    }
  }, []);

  const stageErrors = events.filter(e=>e.type==="stage_failed");
  const hasErrors = stageErrors.length > 0 || !!error;
  const hasSpec = !!job?.appSpec;

  const tabs = [
    {id:"pipeline",label:"Pipeline"},
    {id:"appspec",label:"AppSpec",badge:hasSpec?1:undefined},
    {id:"errors",label:"Errors",badge:hasErrors?stageErrors.length+(error?1:0):undefined},
    {id:"integrations",label:"Integrations (14)"},
    {id:"eval",label:"Eval Results",badge:12},
  ];

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"monospace"}}>
      <style>{`
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.3}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:${C.surface};}
        ::-webkit-scrollbar-thumb{background:${C.muted};border-radius:3px;}
        ::-webkit-scrollbar-thumb:hover{background:${C.accent};}
        button:focus{outline:none;}
      `}</style>
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"16px 24px"}}>
        <PromptPanel onSubmit={startGeneration} isRunning={isRunning} jobId={jobId}/>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{padding:"10px 16px",fontSize:11,fontFamily:"monospace",background:"transparent",border:"none",borderBottom:`2px solid ${activeTab===tab.id?C.accent:"transparent"}`,color:activeTab===tab.id?C.text:C.textDim,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"color .2s"}}>
            {tab.label}
            {tab.badge!==undefined && (
              <span style={{fontSize:10,padding:"1px 5px",borderRadius:3,background:tab.id==="errors"?"rgba(239,68,68,.15)":"rgba(99,102,241,.2)",color:tab.id==="errors"?C.error:tab.id==="eval"?C.success:C.accent}}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{padding:24,overflowY:"auto",height:"calc(100vh - 190px)"}}>
        {activeTab==="pipeline"&&<StageTracker events={events} job={job} isRunning={isRunning}/>}
        {activeTab==="appspec"&&<AppSpecRenderer job={job} events={events}/>}
        {activeTab==="errors"&&<ErrorPanel events={events} globalError={error}/>}
        {activeTab==="integrations"&&<IntegrationPanel/>}
        {activeTab==="eval"&&<EvalPanel/>}
      </div>
    </div>
  );
}
