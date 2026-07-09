"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, KeyRound, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsTabs } from "@/components/settings/settings-tabs";

type Models = Record<"anthropic" | "gemini", Record<"simple" | "complex", string>>;
type Provider = "anthropic" | "gemini";
type Keys = { gemini: string[]; anthropic: string; envGemini: boolean; envAnthropic: boolean };

const CARDS: { key: Provider; title: string; note: string }[] = [
  { key: "gemini", title: "Gemini (Google)", note: "Ücretsiz katmanı var (AI Studio). Hızlı başlangıç için ideal." },
  { key: "anthropic", title: "Claude (Anthropic)", note: "Kullandıkça öde (Console'da kredi gerekir). En kaliteli üretim." },
];

export function AiSettings({
  initial,
}: {
  initial: {
    provider: Provider;
    anthropic: boolean;
    gemini: boolean;
    models: Models;
    keys: Keys;
  };
}) {
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [configured, setConfigured] = useState({ anthropic: initial.anthropic, gemini: initial.gemini });
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  // Anahtar yönetimi
  const [geminiKeys, setGeminiKeys] = useState<string[]>(initial.keys.gemini);
  const [anthropicKey, setAnthropicKey] = useState(initial.keys.anthropic);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysMsg, setKeysMsg] = useState<string | null>(null);

  async function choose(p: Provider) {
    if (p === provider) return;
    const prev = provider;
    setProvider(p);
    setTestMsg(null);
    try {
      const res = await fetch("/api/ai/provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProvider(prev);
    }
  }

  async function refreshStatus() {
    const res = await fetch("/api/ai/status");
    if (res.ok) {
      const d = await res.json();
      setConfigured({ anthropic: d.providers.anthropic.configured, gemini: d.providers.gemini.configured });
    }
  }

  async function saveKeys() {
    setSavingKeys(true);
    setKeysMsg(null);
    try {
      const res = await fetch("/api/ai/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemini: geminiKeys.filter((k) => k.trim()), anthropic: anthropicKey.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Kaydedilemedi");
      setGeminiKeys(d.gemini);
      setAnthropicKey(d.anthropic);
      await refreshStatus();
      setKeysMsg("Kaydedildi.");
      setTimeout(() => setKeysMsg(null), 2500);
    } catch (e) {
      setKeysMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setSavingKeys(false);
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
        <Link href="/calisma-alani" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> Arama Alanı
        </Link>
        <h1 className="font-heading flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="size-6" /> Ayarlar
        </h1>
        <p className="text-muted-foreground text-sm">
          AI sağlayıcı, sorgu sınırları ve sunum markası tek yerden yönetilir.
        </p>
      </div>

      <SettingsTabs />

      <div>
        <h2 className="font-heading text-lg font-bold">AI Sağlayıcı</h2>
        <p className="text-muted-foreground text-sm">Mesaj ve analiz üretiminde kullanılacak sağlayıcı ve anahtarlar.</p>
      </div>

      {/* Sağlayıcı seçimi */}
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => {
          const active = provider === c.key;
          const ready = configured[c.key];
          return (
            <button
              key={c.key}
              onClick={() => choose(c.key)}
              className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition ${
                active ? "border-primary/50 ring-primary/30 ring-2" : "hover:bg-accent/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.title}</span>
                {active && <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">Aktif</span>}
              </div>
              <p className="text-muted-foreground text-sm">{c.note}</p>
              <div className="mt-1 text-xs">
                {ready ? (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Check className="size-3" /> Anahtar hazır
                  </span>
                ) : (
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <X className="size-3" /> Anahtar yok
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={test} disabled={testing || !configured[provider]}>
          {testing ? "Test ediliyor…" : "Bağlantıyı test et"}
        </Button>
        {testMsg && <span className="text-sm">{testMsg}</span>}
      </div>

      {/* API Anahtarları */}
      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-heading flex items-center gap-2 font-bold">
            <KeyRound className="size-4" /> API Anahtarları
          </h2>
          <p className="text-muted-foreground text-sm">
            Birden fazla <b>Gemini</b> anahtarı ekle — biri kotaya takılınca sistem <b>otomatik sıradakine geçer</b>.
          </p>
        </div>

        {/* Gemini anahtarları */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Gemini anahtarları</label>
          {geminiKeys.length === 0 && (
            <p className="text-muted-foreground text-xs">Henüz eklenmedi.</p>
          )}
          {geminiKeys.map((k, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={k}
                onChange={(e) => setGeminiKeys((ks) => ks.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder="AIza… / AQ.…"
                className="font-mono text-xs"
              />
              <button
                onClick={() => setGeminiKeys((ks) => ks.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:bg-accent shrink-0 rounded-md p-2 hover:text-red-600"
                title="Sil"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setGeminiKeys((ks) => [...ks, ""])}>
            <Plus className="size-4" /> Anahtar ekle
          </Button>
          {initial.keys.envGemini && (
            <p className="text-muted-foreground text-xs">
              + 1 anahtar <code>.env</code>’den yedek olarak listenin sonuna ekli.
            </p>
          )}
        </div>

        {/* Claude anahtarı */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Claude (Anthropic) anahtarı</label>
          <Input
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-…"
            className="font-mono text-xs"
          />
          {initial.keys.envAnthropic && !anthropicKey && (
            <p className="text-muted-foreground text-xs"><code>.env</code>’deki anahtar kullanılıyor.</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={saveKeys} disabled={savingKeys}>
            {savingKeys ? "Kaydediliyor…" : "Anahtarları kaydet"}
          </Button>
          {keysMsg && <span className="text-muted-foreground text-sm">{keysMsg}</span>}
        </div>
      </section>

      <p className="text-muted-foreground text-xs">
        Yeni Gemini anahtarı (ücretsiz, farklı Google hesabı taze kota verir): aistudio.google.com/app/apikey ·
        Claude kredisi: console.anthropic.com → Billing.
      </p>
    </main>
  );
}
