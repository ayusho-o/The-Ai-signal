import type { AIProvider, AIRequestOptions, AIResponse } from "@/types";
import {
  getModelConfig,
  getFallbackConfig,
  ROUTING_CONFIG,
} from "./routing.config";
import { callOpenAI } from "./providers/openai.provider";
import { callAnthropic } from "./providers/anthropic.provider";
import { callGroq } from "./providers/groq.provider";
import { callGemini } from "./providers/gemini.provider";
import { callDeepSeek } from "./providers/deepseek.provider";
import { callOpenRouter } from "./providers/openrouter.provider";
import { callMistral } from "./providers/mistral.provider";
import { logger } from "@/lib/logger";

// ============================================================
// Multi-Provider AI Gateway
// Routes requests to the correct provider based on routing config.
// Falls back to OpenRouter on 429 or 5xx errors.
// ============================================================

type ProviderCallFn = (
  options: AIRequestOptions,
  model: string
) => Promise<AIResponse>;

const PROVIDER_MAP: Record<AIProvider, ProviderCallFn> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  groq: callGroq,
  gemini: callGemini,
  google_ai: callGemini, // uses same SDK
  deepseek: callDeepSeek,
  openrouter: callOpenRouter,
  mistral: callMistral,
};

function isRateLimitOrServerError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("500") || msg.includes("502") || msg.includes("503"))
      return true;
    if (msg.includes("overloaded") || msg.includes("capacity")) return true;
  }
  return false;
}

function isConfigError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("not configured") || msg.includes("api_key") || msg.includes("apikey")
    );
  }
  return false;
}

export async function generateWithAI(
  options: AIRequestOptions
): Promise<AIResponse> {
  const stage = options.stage;

  // Force specific provider/model if requested
  if (options.forceProvider && options.forceModel) {
    const fn = PROVIDER_MAP[options.forceProvider];
    if (!fn) throw new Error(`Unknown provider: ${options.forceProvider}`);
    return fn(options, options.forceModel);
  }

  // Get routing config for this stage
  const routingKey =
    stage === "repair" || stage === "validation" ? "repair" : stage;
  const routing =
    ROUTING_CONFIG[routingKey as keyof typeof ROUTING_CONFIG] ??
    ROUTING_CONFIG.repair;

  const primaryConfig = routing.primary;
  const fallbackConfig = routing.fallback;

  // Try primary provider
  try {
    const fn = PROVIDER_MAP[primaryConfig.provider];
    if (!fn) throw new Error(`Unknown provider: ${primaryConfig.provider}`);

    const mergedOptions: AIRequestOptions = {
      ...options,
      temperature: options.temperature ?? primaryConfig.temperature,
      maxTokens: options.maxTokens ?? primaryConfig.maxTokens,
    };

    logger.debug(
      {
        stage,
        provider: primaryConfig.provider,
        model: primaryConfig.model,
      },
      "Routing to primary provider"
    );

    return await fn(mergedOptions, primaryConfig.model);
  } catch (primaryError) {
    const isConfigErr = isConfigError(primaryError);
    const isRateLimit = isRateLimitOrServerError(primaryError);

    logger.warn(
      {
        stage,
        provider: primaryConfig.provider,
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
        isConfigErr,
        isRateLimit,
      },
      "Primary provider failed, trying fallback"
    );

    // Try configured fallback first
    try {
      const fn = PROVIDER_MAP[fallbackConfig.provider];
      if (!fn) throw new Error(`Unknown fallback provider: ${fallbackConfig.provider}`);

      const mergedOptions: AIRequestOptions = {
        ...options,
        temperature: options.temperature ?? fallbackConfig.temperature,
        maxTokens: options.maxTokens ?? fallbackConfig.maxTokens,
      };

      logger.debug(
        {
          stage,
          provider: fallbackConfig.provider,
          model: fallbackConfig.model,
        },
        "Routing to fallback provider"
      );

      return await fn(mergedOptions, fallbackConfig.model);
    } catch (fallbackError) {
      logger.warn(
        {
          stage,
          provider: fallbackConfig.provider,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        },
        "Fallback provider failed, trying OpenRouter universal fallback"
      );

      // Final fallback: OpenRouter
      if (primaryConfig.provider === "openrouter") {
        throw fallbackError; // already tried openrouter
      }

      try {
        return await callOpenRouter(options, primaryConfig.model);
      } catch (openRouterError) {
        logger.error(
          {
            stage,
            error: openRouterError instanceof Error ? openRouterError.message : String(openRouterError),
          },
          "All AI providers failed"
        );
        
        // Build helpful error message
        const errorDetails = [
          `Primary (${primaryConfig.provider}): ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
          `Fallback (${fallbackConfig.provider}): ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          `OpenRouter: ${openRouterError instanceof Error ? openRouterError.message : String(openRouterError)}`
        ];
        
        throw new Error(
          `All AI providers failed for stage ${stage}.\n${errorDetails.join('\n')}\n\nPlease check that your API keys are properly configured in Vercel environment variables.`
        );
      }
    }
  }
}

// For repair — use the model that produced the failure, escalate on second failure
export async function generateRepairWithAI(
  options: AIRequestOptions,
  failedProvider: AIProvider,
  failedModel: string,
  isEscalated: boolean
): Promise<AIResponse> {
  if (!isEscalated) {
    // Try same provider/model that failed
    try {
      const fn = PROVIDER_MAP[failedProvider];
      if (fn) {
        logger.debug(
          { provider: failedProvider, model: failedModel },
          "Repair: using same provider as failure"
        );
        return await fn(options, failedModel);
      }
    } catch {
      // fall through to escalation
    }
  }

  // Escalated: use repair routing config
  const repairPrimary = getModelConfig("repair");
  const repairFallback = getFallbackConfig("repair");

  try {
    const fn = PROVIDER_MAP[repairPrimary.provider];
    if (fn) {
      return await fn(options, repairPrimary.model);
    }
  } catch {
    const fn = PROVIDER_MAP[repairFallback.provider];
    if (fn) {
      return await fn(options, repairFallback.model);
    }
  }

  throw new Error("Repair escalation: all providers failed");
}
