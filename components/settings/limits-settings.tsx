"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsTabs } from "@/components/settings/settings-tabs";

type Caps = { dailyCap: number; perScanCap: number };
type Summary = {
  caps: Caps;
  todayTotal: number;
  monthTotal: number;
  monthLabel: string;
};

export function LimitsSettings({ initial }: { initial: Summary }) {
  const [caps, setCaps] = useState<Caps>(initial.caps);
  const [daily, setDaily] = useState(String(initial.caps.dailyCap));
  const [perScan, setPerScan] = useState(String(initial.caps.perScanCap));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const dailyPct = Math.min(100, Math.round((initial.todayTotal / caps.dailyCap) * 100));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/usage/caps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCap: Number(daily), perScanCap: Number(perScan) }),
      });
      const c = await res.json();
      if (!res.ok) throw new Error(c.error ?? "Kaydedilemedi");
      setCaps(c);
      setMsg("Sınırlar güncellendi.");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Arama Alanı
        </Link>
        <h1 className="font-heading flex items-center gap-2 text-2xl font-bold">
          <Gauge className="size-6" /> Ayarlar
        </h1>
        <p className="text-muted-foreground text-sm">
          AI sağlayıcı, sorgu sınırları ve sunum markası tek yerden yönetilir.
        </p>
      </div>

      <SettingsTabs />

      <div>
        <h2 className="font-heading text-lg font-bold">Sınırlar & Kota</h2>
        <p className="text-muted-foreground text-sm">
          Google Places sorgu tavanları — tavan dolunca keşif/tarama durur ve sana sorar
          (Bölüm 4.2/4.12). Bugünkü kullanım referans için altta.
        </p>
      </div>

      {/* Bugünkü kullanım referansı */}
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Bugün</div>
        <div className="mt-1 text-2xl font-semibold">
          {initial.todayTotal}
          <span className="text-muted-foreground text-base font-normal"> / {caps.dailyCap}</span>
        </div>
        <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full ${dailyPct >= 100 ? "bg-red-500" : dailyPct >= 80 ? "bg-orange-500" : "bg-green-500"}`}
            style={{ width: `${dailyPct}%` }}
          />
        </div>
        <Link href="/kullanim" className="text-primary mt-2 inline-block text-xs hover:underline">
          Detaylı kullanım dökümü →
        </Link>
      </div>

      {/* Tavan ayarları */}
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">Sorgu tavanları</h3>
        <p className="text-muted-foreground text-sm">
          Şu anda sistemdeki tek ayarlanabilir sınır bu ikisi — başka bir sınır durumu yok.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Günlük tavan
            <Input
              type="number"
              min={1}
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              className="mt-1"
            />
            <span className="text-muted-foreground mt-1 block text-xs">
              Bir günde toplam kaç Google Places sorgusu yapılabilir.
            </span>
          </label>
          <label className="text-sm">
            Tarama başına tavan
            <Input
              type="number"
              min={1}
              value={perScan}
              onChange={(e) => setPerScan(e.target.value)}
              className="mt-1"
            />
            <span className="text-muted-foreground mt-1 block text-xs">
              Tek bir segment taramasında en fazla kaç sorgu harcanabilir.
            </span>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          {msg && <span className="text-muted-foreground text-sm">{msg}</span>}
        </div>
      </div>
    </main>
  );
}
