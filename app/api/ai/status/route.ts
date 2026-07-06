import { NextResponse } from "next/server";
import {
  AI_MODELS,
  getAiProvider,
  providerConfigured,
} from "@/lib/ai";

// Aktif sağlayıcı + hangi sağlayıcıların anahtarı hazır.
export async function GET() {
  const provider = await getAiProvider();
  return NextResponse.json({
    provider,
    providers: {
      anthropic: { configured: providerConfigured("anthropic") },
      gemini: { configured: providerConfigured("gemini") },
    },
    models: AI_MODELS,
  });
}
