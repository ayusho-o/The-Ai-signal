// DeepSeek uses OpenAI-compatible API
import OpenAI from "openai";
import type { AIRequestOptions, AIResponse } from "@/types";
import { calculateCost } from "../routing.config";
import { logger } from "@/lib/logger";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "your_deepseek_api_key_here") {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
    _client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
  }
  return _client;
}

export async function callDeepSeek(
  options: AIRequestOptions,
  model: string
): Promise<AIResponse> {
  const client = getClient();
  const start = Date.now();

  logger.debug(
    { provider: "deepseek", model, stage: options.stage },
    "AI call"
  );

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: options.prompt });

  const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
  };

  if (options.responseFormat === "json") {
    params.response_format = { type: "json_object" };
  }

  const response = await client.chat.completions.create(params);
  const latencyMs = Date.now() - start;

  const content = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;

  const cost = calculateCost(model, inputTokens, outputTokens);

  logger.debug(
    { provider: "deepseek", model, latencyMs, totalTokens, cost },
    "AI call complete"
  );

  return {
    content,
    tokensUsed: totalTokens,
    provider: "deepseek",
    model,
    estimatedCostUsd: cost,
    latencyMs,
  };
}
