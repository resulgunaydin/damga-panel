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

// ─── API anahtar yönetimi (çoklu + otomatik rotasyon) ───
// Anahtarlar AppSetting("ai.keys")'te tutulur; .env her zaman yedek olarak eklenir.
type KeysConfig = { gemini: string[]; anthropic: string | null };

async function getKeysConfig(): Promise<KeysConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: "ai.keys" } });
  const v = row?.value as { gemini?: unknown; anthropic?: unknown } | null;
  return {
    gemini: Array.isArray(v?.gemini)
      ? (v!.gemini as unknown[]).map((k) => String(k).trim()).filter(Boolean)
      : [],
    anthropic: typeof v?.anthropic === "string" && v.anthropic.trim() ? v.anthropic.trim() : null,
  };
}

// UI'nin düzenlediği (kayıtlı) anahtarlar + .env yedeği.
export async function getStoredKeys(): Promise<{
  gemini: string[];
  anthropic: string;
  envGemini: boolean;
  envAnthropic: boolean;
}> {
  const cfg = await getKeysConfig();
  return {
    gemini: cfg.gemini,
    anthropic: cfg.anthropic ?? "",
    envGemini: !!process.env.GEMINI_API_KEY,
    envAnthropic: !!process.env.ANTHROPIC_API_KEY,
  };
}

export async function setStoredKeys(gemini: string[], anthropic: string | null): Promise<void> {
  const value: KeysConfig = {
    gemini: gemini.map((k) => k.trim()).filter(Boolean),
    anthropic: (anthropic ?? "").trim() || null,
  };
  await prisma.appSetting.upsert({
    where: { key: "ai.keys" },
    create: { key: "ai.keys", value },
    update: { value },
  });
}

// Etkin Gemini anahtar listesi (rotasyon sırası): önce kayıtlılar, sonra .env.
async function getGeminiKeys(): Promise<string[]> {
  const cfg = await getKeysConfig();
  const env = process.env.GEMINI_API_KEY;
  return [...new Set([...cfg.gemini, ...(env ? [env] : [])])];
}
async function getAnthropicKey(): Promise<string | null> {
  const cfg = await getKeysConfig();
  return cfg.anthropic ?? process.env.ANTHROPIC_API_KEY ?? null;
}

// Sağlayıcının en az bir anahtarı var mı?
export async function providerConfigured(provider: AiProviderName): Promise<boolean> {
  return provider === "anthropic"
    ? !!(await getAnthropicKey())
    : (await getGeminiKeys()).length > 0;
}

function missingKeyError(provider: AiProviderName): Error {
  return new Error(
    provider === "anthropic"
      ? "Claude (Anthropic) anahtarı tanımlı değil — Ayarlar’dan ekleyin."
      : "Gemini anahtarı tanımlı değil — Ayarlar’dan ekleyin.",
  );
}

// ─── Anthropic ───
async function genAnthropic(
  input: GenerateInput,
  tier: AiTier,
  maxTokens: number,
): Promise<GenerateResult> {
  const model = AI_MODELS.anthropic[tier];
  const key = await getAnthropicKey();
  const client = new Anthropic(key ? { apiKey: key } : {});
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
  const generationConfig: Record<string, unknown> = { maxOutputTokens: maxTokens };
  // Flash modellerde "düşünme" varsayılan açık ve çıktı bütçesini yer;
  // kısa üretimlerde kapatıp tüm bütçeyi metne bırakırız.
  if (model.includes("flash")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig,
  };
  if (input.system) body.systemInstruction = { parts: [{ text: input.system }] };

  const keys = await getGeminiKeys();
  if (keys.length === 0) throw missingKeyError("gemini");

  // Kota (429) gelen anahtarı atla, sıradaki anahtarla dene (otomatik rotasyon).
  let quotaHit = 0;
  for (const key of keys) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p: { text?: string }) => p.text ?? "").join("").trim();
      return { text, provider: "gemini", model };
    }
    if (res.status === 429) {
      quotaHit++;
      continue; // bu anahtar kotada → sıradakini dene
    }
    throw new Error(data?.error?.message ?? `Gemini hatası (${res.status})`);
  }
  throw new Error(
    `Tüm Gemini anahtarları (${quotaHit}/${keys.length}) kotada. Ayarlar’dan yeni anahtar ekleyin, yarın tekrar deneyin ya da Claude’a geçin.`,
  );
}

// Ana giriş: aktif sağlayıcıyla metin üret.
export async function generateText(input: GenerateInput): Promise<GenerateResult> {
  const provider = await getAiProvider();
  if (!(await providerConfigured(provider))) throw missingKeyError(provider);
  const tier = input.tier ?? "complex";
  const maxTokens = input.maxTokens ?? 1024;
  return provider === "anthropic"
    ? genAnthropic(input, tier, maxTokens)
    : genGemini(input, tier, maxTokens);
}
