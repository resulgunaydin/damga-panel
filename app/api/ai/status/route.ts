import { NextResponse } from "next/server";
import {
  AI_MODELS,
  getAiProvider,
  providerConfigured,
} from "@/lib/ai";

// Aktif sağlayıcı + hangi sağlayıcıların anahtarı hazır.
export async function GET() {
  const [provider, anthropic, gemini] = await Promise.all([
    getAiProvider(),
    providerConfigured("anthropic"),
    providerConfigured("gemini"),
  ]);
  return NextResponse.json({
    provider,
    providers: {
      anthropic: { configured: anthropic },
      gemini: { configured: gemini },
    },
    models: AI_MODELS,
  });
}
