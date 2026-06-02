import type { AIProvider, PipelineStage } from "@/types";

// ============================================================
// AI Provider Routing Configuration
// ============================================================

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface StageRouting {
  primary: ModelConfig;
  fallback: ModelConfig;
}

// Cost per 1M tokens (input / output) in USD
export const COST_TABLE: Record<
  string,
  { inputPer1M: number; outputPer1M: number }
> = {
  // OpenAI
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },

  // Anthropic
  "claude-3-5-sonnet-20241022": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-3-5-haiku-20241022": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "claude-3-haiku-20240307": { inputPer1M: 0.25, outputPer1M: 1.25 },

  // Groq (extremely cheap, fast inference)
  "llama-3.3-70b-versatile": { inputPer1M: 0.59, outputPer1M: 0.79 },
  "llama-3.1-8b-instant": { inputPer1M: 0.05, outputPer1M: 0.08 },
  "mixtral-8x7b-32768": { inputPer1M: 0.24, outputPer1M: 0.24 },

  // Gemini
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-1.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-2.0-flash-exp": { inputPer1M: 0.0, outputPer1M: 0.0 },

  // DeepSeek
  "deepseek-chat": { inputPer1M: 0.14, outputPer1M: 0.28 },
  "deepseek-coder": { inputPer1M: 0.14, outputPer1M: 0.28 },

  // Mistral
  "mistral-large-latest": { inputPer1M: 2.0, outputPer1M: 6.0 },
  "mistral-small-latest": { inputPer1M: 0.2, outputPer1M: 0.6 },
  "open-mistral-7b": { inputPer1M: 0.25, outputPer1M: 0.25 },

  // OpenRouter (unified fallback)
  "openrouter/auto": { inputPer1M: 0.5, outputPer1M: 1.5 }, // estimated
};

// Pipeline Stage → Model Routing
export const ROUTING_CONFIG: Record<PipelineStage | "repair", StageRouting> = {
  intent_extraction: {
    primary: {
      provider: "groq",
      model: "llama-3.1-8b-instant",
      maxTokens: 2000,
      temperature: 0.3,
    },
    fallback: {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 2000,
      temperature: 0.3,
    },
  },

  schema_generation: {
    primary: {
      provider: "gemini",
      model: "gemini-1.5-flash",
      maxTokens: 4000,
      temperature: 0.2,
    },
    fallback: {
      provider: "groq",
      model: "llama-3.1-8b-instant",
      maxTokens: 4000,
      temperature: 0.1,
    },
  },

  appspec_generation: {
    primary: {
      provider: "gemini",
      model: "gemini-1.5-flash",
      maxTokens: 6000,
      temperature: 0.2,
    },
    fallback: {
      provider: "groq",
      model: "llama-3.1-8b-instant",
      maxTokens: 6000,
      temperature: 0.1,
    },
  },

  repair: {
    primary: {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 2000,
      temperature: 0.1,
    },
    fallback: {
      provider: "groq",
      model: "llama-3.1-8b-instant",
      maxTokens: 2000,
      temperature: 0.1,
    },
  },
};

// Get model config for a stage
export function getModelConfig(stage: PipelineStage | "repair"): ModelConfig {
  return ROUTING_CONFIG[stage]?.primary ?? ROUTING_CONFIG.repair.primary;
}

// Get fallback model config
export function getFallbackConfig(
  stage: PipelineStage | "repair"
): ModelConfig {
  return ROUTING_CONFIG[stage]?.fallback ?? ROUTING_CONFIG.repair.fallback;
}

// Calculate cost from token usage
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = COST_TABLE[model] ?? { inputPer1M: 0.5, outputPer1M: 1.5 };
  const inputCost = (inputTokens / 1_000_000) * costs.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * costs.outputPer1M;
  return inputCost + outputCost;
}
