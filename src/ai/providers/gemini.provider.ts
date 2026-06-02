import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIRequestOptions, AIResponse } from "@/types";
import { calculateCost } from "../routing.config";
import { logger } from "@/lib/logger";

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey =
      process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey.includes("your_")) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

export async function callGemini(
  options: AIRequestOptions,
  model: string
): Promise<AIResponse> {
  const client = getClient();
  const start = Date.now();

  logger.debug({ provider: "gemini", model, stage: options.stage }, "AI call");

  const genModel = client.getGenerativeModel({
    model,
    systemInstruction: options.systemPrompt,
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxTokens ?? 4096,
      responseMimeType:
        options.responseFormat === "json" ? "application/json" : "text/plain",
    },
  });

  const result = await genModel.generateContent(options.prompt);
  const latencyMs = Date.now() - start;

  const content = result.response.text();
  const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens =
    result.response.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = inputTokens + outputTokens;

  const cost = calculateCost(model, inputTokens, outputTokens);

  logger.debug(
    { provider: "gemini", model, latencyMs, totalTokens, cost },
    "AI call complete"
  );

  return {
    content,
    tokensUsed: totalTokens,
    provider: "gemini",
    model,
    estimatedCostUsd: cost,
    latencyMs,
  };
}
