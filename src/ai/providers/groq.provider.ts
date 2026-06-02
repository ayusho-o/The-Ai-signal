import Groq from "groq-sdk";
import type { AIRequestOptions, AIResponse } from "@/types";
import { calculateCost } from "../routing.config";
import { logger } from "@/lib/logger";

let _client: Groq | null = null;

function getClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      throw new Error("GROQ_API_KEY is not configured");
    }
    _client = new Groq({ apiKey });
  }
  return _client;
}

export async function callGroq(
  options: AIRequestOptions,
  model: string
): Promise<AIResponse> {
  const client = getClient();
  const start = Date.now();

  logger.debug({ provider: "groq", model, stage: options.stage }, "AI call");

  type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
  const messages: GroqMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: options.prompt });

  // Build params with conditional response_format
  const params: Parameters<typeof client.chat.completions.create>[0] = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
    stream: false,
    ...(options.responseFormat === "json"
      ? { response_format: { type: "json_object" as const } }
      : {}),
  };

  const response = await client.chat.completions.create(params);
  const latencyMs = Date.now() - start;

  const content =
    "choices" in response
      ? (response.choices[0]?.message?.content ?? "")
      : "";
  const usage = "usage" in response ? response.usage : null;
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;

  const cost = calculateCost(model, inputTokens, outputTokens);

  logger.debug(
    { provider: "groq", model, latencyMs, totalTokens, cost },
    "AI call complete"
  );

  return {
    content,
    tokensUsed: totalTokens,
    provider: "groq",
    model,
    estimatedCostUsd: cost,
    latencyMs,
  };
}
