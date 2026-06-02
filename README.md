# OneAtlas AI Pipeline

A multi-stage AI generation pipeline that converts natural language app descriptions into validated, machine-readable **AppSpec** objects.

---

## Quick Start (under 5 minutes)

```bash
# 1. Clone and install
git clone <repo-url>
cd oneatlas-pipeline
npm install

# 2. Configure API keys
cp .env.example .env.local
# Edit .env.local — add at minimum one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY

# 3. Start
npm run dev
# Open http://localhost:3000
```

The system gracefully falls back across providers. At minimum one key is required.

---

## Environment Variables

| Variable | Provider | Required |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI (GPT-4o, GPT-4o-mini) | Recommended |
| `ANTHROPIC_API_KEY` | Anthropic (Claude 3.5 Sonnet/Haiku) | Recommended |
| `GROQ_API_KEY` | Groq (Llama 3) | Recommended (fast + cheap) |
| `GEMINI_API_KEY` | Google Gemini | Optional |
| `GOOGLE_AI_API_KEY` | Google AI (PaLM/Gemini fallback) | Optional |
| `DEEPSEEK_API_KEY` | DeepSeek | Optional |
| `OPENROUTER_API_KEY` | OpenRouter (universal fallback) | Optional |
| `MISTRAL_API_KEY` | Mistral | Optional |

---

## Pipeline Architecture

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────┐
│            Pipeline Orchestrator            │
│  ┌─────────────┐  ┌──────────┐  ┌───────┐  │
│  │   Stage 1   │→ │ Stage 2  │→ │Stage 3│  │
│  │   Intent    │  │  Schema  │  │AppSpec│  │
│  │ Extraction  │  │   Gen    │  │  Gen  │  │
│  └──────┬──────┘  └────┬─────┘  └───┬───┘  │
│         │              │             │      │
│    ┌────▼──────────────▼─────────────▼───┐  │
│    │         Validation Engine           │  │
│    │  Zod schemas + cross-layer checks   │  │
│    └────────────────┬────────────────────┘  │
│                     │ fails                 │
│              ┌──────▼──────┐                │
│              │Repair Engine│                │
│              │ 1. Structural│               │
│              │ 2. Field     │               │
│              │ 3. Consistency│              │
│              │ 4. AI Retry  │               │
│              │ 5. Escalated │               │
│              └─────────────┘                │
└─────────────────────────────────────────────┘
    │                    │
    ▼                    ▼
 SSE Stream          Job Store
(real-time)         (in-memory)
```

### Stage 1 — Intent Extraction
- **Input:** raw prompt string
- **Output:** `AppIntent` — appName, appType, features, entities, integrations_requested, assumptions
- **Model:** Groq Llama 3 (primary) → GPT-4o-mini (fallback)
- **Edge handling:** vague prompts return `clarification_required`; overscoped prompts get MVP-reduced with documented assumptions

### Stage 2 — Schema Generation
- **Input:** AppIntent
- **Output:** `DataSchema` — entities with fields, relations, tenantId enforcement
- **Model:** Gemini 1.5 Flash (primary) → Groq Llama 3 (fallback)
- **Validation:** tenantId presence, bidirectional relation consistency, snake_case tableName

### Stage 3 — AppSpec Generation
- **Input:** DataSchema + AppIntent
- **Output:** `AppSpec` — pages, API endpoints, auth roles, integrationHooks, workflowStubs
- **Model:** Gemini 1.5 Flash (primary) → Groq Llama 3 (fallback)
- **Validation:** page↔API consistency, entity reference resolution, integration registry validation

---

## Validation Engine

Runs after every stage. Returns structured `ValidationError[]` — never throws.

Checks:
- JSON structure matches Zod schema for that stage
- Required fields present and correctly typed
- Entity references in relations, pages, and workflows resolve to actual DataSchema entities
- Every page has at least one corresponding API endpoint
- Auth rules reference only defined roles
- Integration hooks reference only registered integration IDs
- Workflow stubs reference valid action IDs per integration

---

## Repair Engine

Three classified strategies before any AI retry:

| Strategy | Trigger | Action |
|---|---|---|
| `STRUCTURAL_REPAIR` | `MALFORMED_JSON`, markdown wrapping, truncation | Extract JSON, close open braces, strip fences |
| `FIELD_REPAIR` | `MISSING_FIELD`, `WRONG_TYPE`, `MISSING_TENANT_ID` | Inject typed defaults programmatically |
| `CONSISTENCY_REPAIR` | `BROKEN_REFERENCE`, `INVALID_INTEGRATION_REF`, `INVALID_ACTION_REF`, `PAGE_WITHOUT_ENDPOINT` | Fuzzy-match entity/integration names, substitute first valid action ID, drop unresolvable stubs |
| `AI_RETRY` | All strategies failed | Targeted re-prompt with specific error context (same provider) |
| `ESCALATED_AI_RETRY` | AI_RETRY failed | Different provider from routing config |

Every repair attempt is logged: strategy → errorInput → outcome → detail.

---

## AI Provider Gateway

Config-driven routing in `src/ai/routing.config.ts`:

| Stage | Primary | Fallback |
|---|---|---|
| intent_extraction | groq / llama-3.1-8b-instant | openai / gpt-4o-mini |
| schema_generation | gemini / gemini-1.5-flash | groq / llama-3.1-8b-instant |
| appspec_generation | gemini / gemini-1.5-flash | groq / llama-3.1-8b-instant |
| repair | openai / gpt-4o-mini | groq / llama-3.1-8b-instant |

On 429 or 5xx → automatic OpenRouter fallback with equivalent model.

Cost per run tracked via `COST_TABLE` (per-token rates per model).

---

## Integration Registry

14 integrations registered. 8 fully implemented (complete registry metadata + action schemas). 6 stubbed with interfaces.

| Integration | ID | Auth | Status |
|---|---|---|---|
| Slack | `slack` | oauth2 | ✅ Implemented |
| Gmail | `gmail` | oauth2 | ✅ Implemented |
| WhatsApp (Twilio) | `whatsapp` | api_key | ✅ Implemented |
| Stripe | `stripe` | api_key | ✅ Implemented |
| Jira | `jira` | api_key | ✅ Implemented |
| Twilio SMS | `twilio_sms` | api_key | ✅ Implemented |
| Generic Webhook | `webhook` | webhook_secret | ✅ Implemented |
| Google Sheets | `google_sheets` | oauth2 | ✅ Implemented |
| Salesforce | `salesforce` | oauth2 | 🔶 Stubbed |
| HubSpot | `hubspot` | oauth2 | 🔶 Stubbed |
| Notion | `notion` | oauth2 | 🔶 Stubbed |
| Airtable | `airtable` | api_key | 🔶 Stubbed |
| GitHub | `github` | oauth2 | 🔶 Stubbed |
| Zapier | `zapier` | webhook_secret | 🔶 Stubbed |

Stubbed = registry metadata, trigger descriptors, and action input/output schemas are complete. Actual HTTP calls not implemented. A developer can implement the API call from the stub alone.

No live OAuth flows. No real API calls. All integration actions in pipeline output are stubs with correct payload shapes.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/generate` | Start a generation job. Body: `{ prompt: string }`. Returns `{ jobId }`. |
| `GET` | `/api/generate/:jobId` | Job status, full AppSpec, cost breakdown, repair log |
| `GET` | `/api/generate/:jobId/stream` | SSE stream. Emits `stage_start`, `stage_complete`, `stage_failed`, `generation_complete`. Replays all prior events on reconnect. |
| `POST` | `/api/generate/:jobId/repair` | Manually trigger repair on a stage. Body: `{ stage, errorHint? }` |
| `GET` | `/api/integrations` | Full integration registry |

---

## Evaluation Suite

```bash
# Requires the dev server running at localhost:3000
npm run eval

# Or against a deployed URL:
EVAL_BASE_URL=https://your-app.vercel.app npm run eval
```

Runs all 12 prompts (7 standard + 5 edge cases). Outputs `eval-results/eval-<timestamp>.json`.

---

## Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts          POST /api/generate
│   │   ├── generate/[jobId]/route.ts  GET job status
│   │   ├── generate/[jobId]/stream/   SSE endpoint
│   │   ├── generate/[jobId]/repair/   Manual repair trigger
│   │   └── integrations/route.ts      GET registry
│   ├── layout.tsx
│   └── page.tsx                       Main UI
│
├── pipeline/
│   ├── stages/
│   │   ├── intent.stage.ts
│   │   ├── schema.stage.ts
│   │   └── appspec.stage.ts
│   ├── validators/
│   │   ├── intent.validator.ts
│   │   ├── schema.validator.ts
│   │   └── appspec.validator.ts
│   ├── repair/
│   │   └── repair.engine.ts           5 classified strategies
│   ├── prompts/
│   │   ├── intent.prompt.ts
│   │   ├── schema.prompt.ts
│   │   └── appspec.prompt.ts
│   └── orchestrator/
│       └── pipeline.orchestrator.ts
│
├── ai/
│   ├── providers/                     7 provider implementations
│   ├── gateway.ts                     Multi-provider routing + fallback
│   └── routing.config.ts              Config-driven model routing + COST_TABLE
│
├── integrations/
│   ├── registry/index.ts              Single source of truth
│   ├── slack/    gmail/   whatsapp/
│   ├── stripe/   jira/    twilio-sms/
│   ├── webhook/  google-sheets/
│   └── salesforce/ hubspot/ notion/ airtable/ github/ zapier/
│
├── components/
│   ├── PromptPanel.tsx
│   ├── StageTracker.tsx               Real-time SSE stage progress
│   ├── AppSpecRenderer.tsx            Structured output display
│   ├── ErrorPanel.tsx                 Validation + repair logs
│   └── IntegrationPanel.tsx          Registry browser
│
├── lib/
│   ├── job-store.ts                   In-memory store + SSE pub/sub
│   ├── logger.ts                      Pino logger
│   └── schemas/                       Zod schemas per stage
│
├── types/
│   └── pipeline.ts                    All TypeScript types (no any)
│
└── utils/
    └── json.utils.ts                  JSON extraction + structural repair
```

---

## Known Limitations & Deliberate Cuts

- **No persistence** — jobs stored in-memory. Restart clears all jobs. Production would use Redis or a DB.
- **No auth** — no login, no API keys for the platform itself. Out of scope per brief.
- **No live OAuth** — integration actions are stubs with correct payload schemas. No real API calls.
- **No real-time chat** — out of scope.
- **Single process SSE** — SSE subscriptions are in-process. Multi-instance deployment needs a pub/sub layer (Redis Pub/Sub or similar).
- **Vercel cold starts** — long-running pipeline stages (up to ~60s) can hit Vercel's 60s function timeout on the free tier. Recommend Pro plan or Railway for production.

---

## Deployment (GitHub + Vercel)

### Quick Deploy (Windows PowerShell)

```powershell
# Run the automated setup script
.\setup-deployment.ps1
```

### Manual Deployment Steps

1. **Install Git** (if not already installed)
   - Download from: https://git-scm.com/download/win

2. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/oneatlas-pipeline.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Add environment variables (see `.env.production.template`)
   - Click Deploy

4. **Add Environment Variables in Vercel Dashboard**
   - Go to Settings → Environment Variables
   - Add all API keys from your `.env.local`
   - Redeploy if needed

For detailed instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Alternative: Vercel CLI

```bash
npm install -g vercel
vercel --prod
# Set all env vars in Vercel dashboard under Settings → Environment Variables
```

---

## Stack

- **Next.js 16** (App Router)
- **TypeScript** (strict mode, no `any`)
- **Zod** (schema validation at every stage)
- **TailwindCSS** (minimal dark UI)
- **Pino** (structured logging)
- **OpenAI / Anthropic / Groq SDKs** (primary providers)
- **EventSource / ReadableStream** (SSE streaming)
