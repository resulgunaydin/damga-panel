import { NextResponse } from "next/server";
import { getStoredKeys, setStoredKeys } from "@/lib/ai";

export async function GET() {
  return NextResponse.json(await getStoredKeys());
}

// API anahtarlarını kaydet (çoklu Gemini + Claude).
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const gemini = Array.isArray(body.gemini) ? body.gemini.map((k: unknown) => String(k)) : [];
  const anthropic = typeof body.anthropic === "string" ? body.anthropic : null;
  await setStoredKeys(gemini, anthropic);
  return NextResponse.json(await getStoredKeys());
}
