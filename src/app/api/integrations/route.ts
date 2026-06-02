import { NextResponse } from "next/server";
import { getIntegrationRegistry } from "@/integrations/registry";

export async function GET() {
  const registry = getIntegrationRegistry();

  return NextResponse.json({
    count: registry.length,
    implemented: registry.filter((i) => i.implemented).length,
    stubbed: registry.filter((i) => !i.implemented).length,
    integrations: registry,
  });
}
