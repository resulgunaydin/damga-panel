import { NextResponse } from "next/server";
import { setAiProvider, type AiProviderName } from "@/lib/ai";

// Aktif AI sağlayıcısını değiştir (Claude ↔ Gemini).
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const provider = body.provider;
  if (provider !== "anthropic" && provider !== "gemini") {
    return NextResponse.json({ error: "Geçersiz sağlayıcı." }, { status: 400 });
  }
  await setAiProvider(provider as AiProviderName);
  return NextResponse.json({ provider });
}
