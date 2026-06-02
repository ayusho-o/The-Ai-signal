import Anthropic from "@anthropic-ai/sdk";
import type { AIRequestOptions, AIResponse } from "@/types";
import { calculateCost } from "../routing.config";
import { logger } from "@/lib/logger";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function callAnthropic(
  options: AIRequestOptions,
  model: string
): Promise<AIResponse> {
  const client = getClient();
  const start = Date.now();

  logger.debug(
    { provider: "anthropic", model, stage: options.stage },
    "AI call"
  );

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
    system: options.systemPrompt ?? "You are a helpful AI assistant.",
    messages: [{ role: "user", content: options.prompt }],
  });

  const latencyMs = Date.now() - start;
  const content =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const totalTokens = inputTokens + outputTokens;

  const cost = calculateCost(model, inputTokens, outputTokens);

  logger.debug(
    { provider: "anthropic", model, latencyMs, totalTokens, cost },
    "AI call complete"
  );

  return {
    content,
    tokensUsed: totalTokens,
    provider: "anthropic",
    model,
    estimatedCostUsd: cost,
    latencyMs,
  };
}
