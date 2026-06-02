// OpenRouter uses OpenAI-compatible API as universal fallback
import OpenAI from "openai";
import type { AIRequestOptions, AIResponse } from "@/types";
import { calculateCost } from "../routing.config";
import { logger } from "@/lib/logger";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "your_openrouter_api_key_here") {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    _client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://oneatlas.dev",
        "X-Title": "OneAtlas Pipeline",
      },
    });
  }
  return _client;
}

// Map pipeline-stage model names to OpenRouter equivalents
const MODEL_MAP: Record<string, string> = {
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "claude-3-5-sonnet-20241022": "anthropic/claude-3.5-sonnet",
  "claude-3-5-haiku-20241022": "anthropic/claude-3.5-haiku",
  "llama-3.1-8b-instant": "meta-llama/llama-3.1-8b-instruct",
  "llama-3.3-70b-versatile": "meta-llama/llama-3.3-70b-instruct",
  "mixtral-8x7b-32768": "mistralai/mixtral-8x7b-instruct",
  "gemini-1.5-pro": "google/gemini-pro-1.5",
  "gemini-1.5-flash": "google/gemini-flash-1.5",
  "deepseek-chat": "deepseek/deepseek-chat",
  "mistral-large-latest": "mistralai/mistral-large",
};

export async function callOpenRouter(
  options: AIRequestOptions,
  model: string
): Promise<AIResponse> {
  const client = getClient();
  const start = Date.now();
  const routerModel = MODEL_MAP[model] ?? model;

  logger.debug(
    { provider: "openrouter", model: routerModel, stage: options.stage },
    "AI call (fallback)"
  );

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: options.prompt });

  const response = await client.chat.completions.create({
    model: routerModel,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
  });

  const latencyMs = Date.now() - start;
  const content = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;

  // Use openrouter/auto cost as estimate
  const cost = calculateCost("openrouter/auto", inputTokens, outputTokens);

  logger.debug(
    { provider: "openrouter", model: routerModel, latencyMs, totalTokens },
    "AI call complete"
  );

  return {
    content,
    tokensUsed: totalTokens,
    provider: "openrouter",
    model: routerModel,
    estimatedCostUsd: cost,
    latencyMs,
  };
}
