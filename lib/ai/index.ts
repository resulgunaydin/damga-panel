// Sağlayıcı-bağımsız AI metin üretimi (Bölüm 4.7 + 6).
// İki sağlayıcı: Anthropic (resmi SDK) ve Google Gemini (REST).
// Aktif sağlayıcı AppSetting("ai.provider") ile çalışma anında değiştirilir;
// yoksa AI_PROVIDER env'i, o da yoksa "gemini".

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export type AiProviderName = "anthropic" | "gemini";
export type AiTier = "simple" | "complex";

export type GenerateInput = {
  system?: string;
  prompt: string;
  tier?: AiTier; // basit üretim → ucuz model
  maxTokens?: number;
};
export type GenerateResult = {
  text: string;
  provider: AiProviderName;
  model: string;
};

// Model eşlemesi (env ile geçersiz kılınabilir).
export const AI_MODELS: Record<AiProviderName, Record<AiTier, string>> = {
  anthropic: {
    complex: process.env.ANTHROPIC_MODEL_COMPLEX ?? "claude-opus-4-8",
    simple: process.env.ANTHROPIC_MODEL_SIMPLE ?? "claude-haiku-4-5",
  },
  gemini: {
    complex: process.env.GEMINI_MODEL_COMPLEX ?? "gemini-2.5-pro",
    simple: process.env.GEMINI_MODEL_SIMPLE ?? "gemini-2.5-flash",
  },
};

export const PROVIDER_LABEL: Record<AiProviderName, string> = {
  anthropic: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
};

function isProvider(v: unknown): v is AiProviderName {
  return v === "anthropic" || v === "gemini";
}

// Aktif sağlayıcıyı oku.
export async function getAiProvider(): Promise<AiProviderName> {
  const row = await prisma.appSetting.findUnique({ where: { key: "ai.provider" } });
  const stored = (row?.value as { provider?: string } | null)?.provider;
  if (isProvider(stored)) return stored;
  if (isProvider(process.env.AI_PROVIDER)) return process.env.AI_PROVIDER;
  return "gemini";
}

// Aktif sağlayıcıyı değiştir.
export async function setAiProvider(provider: AiProviderName): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "ai.provider" },
    create: { key: "ai.provider", value: { provider } },
    update: { value: { provider } },
  });
}

// Sağlayıcının anahtarı .env'de tanımlı mı?
export function providerConfigured(provider: AiProviderName): boolean {
  return provider === "anthropic"
    ? !!process.env.ANTHROPIC_API_KEY
    : !!process.env.GEMINI_API_KEY;
}

function missingKeyError(provider: AiProviderName): Error {
  const key = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY";
  return new Error(`${key} tanımlı değil (.env).`);
}

// ─── Anthropic ───
async function genAnthropic(
  input: GenerateInput,
  tier: AiTier,
  maxTokens: number,
): Promise<GenerateResult> {
  const model = AI_MODELS.anthropic[tier];
  const client = new Anthropic(); // ANTHROPIC_API_KEY env'den
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: input.system,
    messages: [{ role: "user", content: input.prompt }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { text, provider: "anthropic", model };
}

// ─── Gemini (REST) ───
async function genGemini(
  input: GenerateInput,
  tier: AiTier,
  maxTokens: number,
): Promise<GenerateResult> {
  const model = AI_MODELS.gemini[tier];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (input.system) body.systemInstruction = { parts: [{ text: input.system }] };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Gemini hatası (${res.status})`);
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  return { text, provider: "gemini", model };
}

// Ana giriş: aktif sağlayıcıyla metin üret.
export async function generateText(input: GenerateInput): Promise<GenerateResult> {
  const provider = await getAiProvider();
  if (!providerConfigured(provider)) throw missingKeyError(provider);
  const tier = input.tier ?? "complex";
  const maxTokens = input.maxTokens ?? 1024;
  return provider === "anthropic"
    ? genAnthropic(input, tier, maxTokens)
    : genGemini(input, tier, maxTokens);
}
