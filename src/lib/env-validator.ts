// Environment Variable Validator
// Validates that required API keys are configured

export interface EnvValidation {
  isValid: boolean;
  missing: string[];
  configured: string[];
}

const REQUIRED_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GROQ_API_KEY",
] as const;

const OPTIONAL_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
  "MISTRAL_API_KEY",
] as const;

function isKeyConfigured(key: string): boolean {
  const value = process.env[key];
  if (!value) return false;
  if (value.includes("your_") && value.includes("_key_here")) return false;
  if (value.trim() === "") return false;
  return true;
}

export function validateEnvironment(): EnvValidation {
  const missing: string[] = [];
  const configured: string[] = [];

  // Check required keys
  for (const key of REQUIRED_KEYS) {
    if (isKeyConfigured(key)) {
      configured.push(key);
    } else {
      missing.push(key);
    }
  }

  // Check optional keys
  for (const key of OPTIONAL_KEYS) {
    if (isKeyConfigured(key)) {
      configured.push(key);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    configured,
  };
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
