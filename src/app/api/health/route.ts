import { NextResponse } from "next/server";
import { validateEnvironment, getConfiguredProviders } from "@/lib/env-validator";

export async function GET() {
  const validation = validateEnvironment();
  const providers = getConfiguredProviders();

  const envCheck = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
      ? process.env.OPENAI_API_KEY.substring(0, 10) + "..."
      : "NOT SET",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + "..."
      : "NOT SET",
    GROQ_API_KEY: process.env.GROQ_API_KEY
      ? process.env.GROQ_API_KEY.substring(0, 10) + "..."
      : "NOT SET",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
      ? process.env.GEMINI_API_KEY.substring(0, 10) + "..."
      : "NOT SET",
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY
      ? process.env.GOOGLE_AI_API_KEY.substring(0, 10) + "..."
      : "NOT SET",
  };

  return NextResponse.json({
    status: validation.isValid ? "ok" : "missing_keys",
    environment: process.env.NODE_ENV,
    validation: {
      isValid: validation.isValid,
      missing: validation.missing,
      configured: validation.configured,
    },
    configuredProviders: providers,
    apiKeysPreview: envCheck,
  });
}
