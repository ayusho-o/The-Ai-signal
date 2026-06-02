// Environment Variable Validator
// Validates that at least one AI provider key is configured.
// The pipeline routes across providers — only one is needed to run.

export interface EnvValidation {
  isValid: boolean;
  missing: string[];
  configured: string[];
  warning?: string;
}

// At least one of these must be set for the pipeline to run
const PROVIDER_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
  "MISTRAL_API_KEY",
] as const;

// These are the keys used by the default routing config — recommended but not strictly required
const RECOMMENDED_KEYS = [
  "GROQ_API_KEY",      // Stage 1 primary
  "GEMINI_API_KEY",    // Stage 2+3 primary
  "OPENAI_API_KEY",    // Stage 1 fallback + repair
] as const;

function isKeyConfigured(key: string): boolean {
  const value = process.env[key];
  if (!value) return false;
  if (value.includes("your_") && value.includes("_key_here")) return false;
  if (value.trim() === "") return false;
  return true;
}

export function validateEnvironment(): EnvValidation {
  const configured: string[] = [];
  const missing: string[] = [];

  for (const key of PROVIDER_KEYS) {
    if (isKeyConfigured(key)) {
      configured.push(key);
    }
  }

  // Check which recommended keys are missing (for warnings only)
  const missingRecommended = RECOMMENDED_KEYS.filter(k => !isKeyConfigured(k));
  for (const key of missingRecommended) {
    missing.push(key);
  }

  // Valid as long as at least one provider is configured
  const isValid = configured.length > 0;

  const warning = missingRecommended.length > 0
    ? `Recommended keys not set: ${missingRecommended.join(", ")}. Default routing may fall back to OpenRouter.`
    : undefined;

  return { isValid, missing, configured, warning };
}

export function getConfiguredProviders(): string[] {
  const providers: string[] = [];

  if (isKeyConfigured("OPENAI_API_KEY")) providers.push("openai");
  if (isKeyConfigured("ANTHROPIC_API_KEY")) providers.push("anthropic");
  if (isKeyConfigured("GROQ_API_KEY")) providers.push("groq");
  if (isKeyConfigured("GEMINI_API_KEY") || isKeyConfigured("GOOGLE_AI_API_KEY"))
    providers.push("gemini");
  if (isKeyConfigured("DEEPSEEK_API_KEY")) providers.push("deepseek");
  if (isKeyConfigured("OPENROUTER_API_KEY")) providers.push("openrouter");
  if (isKeyConfigured("MISTRAL_API_KEY")) providers.push("mistral");

  return providers;
}
