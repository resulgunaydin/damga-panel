"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Models = Record<"anthropic" | "gemini", Record<"simple" | "complex", string>>;
type Provider = "anthropic" | "gemini";

const CARDS: { key: Provider; title: string; note: string }[] = [
  {
    key: "gemini",
    title: "Gemini (Google)",
    note: "Ücretsiz katmanı var (AI Studio). Hızlı başlangıç için ideal.",
  },
  {
    key: "anthropic",
    title: "Claude (Anthropic)",
    note: "Kullandıkça öde (Console'da kredi gerekir). En kaliteli üretim.",
  },
];

export function AiSettings({
  initial,
}: {
  initial: {
    provider: Provider;
    anthropic: boolean;
    gemini: boolean;
    models: Models;
  };
}) {
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const configured = { anthropic: initial.anthropic, gemini: initial.gemini };

  async function choose(p: Provider) {
    if (p === provider) return;
    const prev = provider;
    setProvider(p);
    setTestMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/ai/provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProvider(prev);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/ai/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test başarısız.");
      setTestMsg(`✅ ${data.provider} · ${data.model}: “${data.text}”`);
    } catch (e) {
      setTestMsg(`❌ ${e instanceof Error ? e.message : "Hata"}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Çalışma Alanı
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-6" /> AI Sağlayıcı
        </h1>
        <p className="text-muted-foreground text-sm">
          Mesaj ve analiz üretiminde kullanılacak sağlayıcı. İstediğin an değiştir.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => {
          const active = provider === c.key;
          const ready = configured[c.key];
          return (
            <button
              key={c.key}
              onClick={() => choose(c.key)}
              disabled={saving}
              className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition ${
                active ? "border-orange-400 ring-2 ring-orange-400/40" : "hover:bg-accent/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.title}</span>
                {active && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{c.note}</p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {ready ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <Check className="size-3" /> Anahtar hazır
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <X className="size-3" /> Anahtar yok (.env)
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                <div>Basit: {initial.models[c.key].simple}</div>
                <div>Karmaşık: {initial.models[c.key].complex}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={test} disabled={testing || !configured[provider]}>
          {testing ? "Test ediliyor…" : "Bağlantıyı test et"}
        </Button>
        {!configured[provider] && (
          <span className="text-muted-foreground text-sm">
            Önce {provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"} anahtarını
            .env'e ekle.
          </span>
        )}
      </div>

      {testMsg && (
        <div className="rounded-md border px-4 py-2 text-sm">{testMsg}</div>
      )}

      <p className="text-muted-foreground text-xs">
        Gemini ücretsiz anahtarı: aistudio.google.com/app/apikey · Claude kredisi:
        console.anthropic.com → Billing.
      </p>
    </main>
  );
}
