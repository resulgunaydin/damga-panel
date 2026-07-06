"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Summary = {
  caps: { dailyCap: number; perScanCap: number };
  todayTotal: number;
  monthTotal: number;
  byKind: Record<string, number>;
  monthLabel: string;
};

// Tür etiketleri (Bölüm 4.12 / 5).
const KIND_LABELS: Record<string, string> = {
  PLACES_SEARCH: "Yer araması (Places)",
  PLACE_DETAILS: "Yer detayı",
  WEBSITE_ANALYSIS: "Website analizi",
  PAGESPEED: "PageSpeed",
  GBP_ANALYSIS: "Google Business",
  COMPETITOR_ANALYSIS: "Rakip analizi",
  AI_MESSAGE: "AI mesaj üretimi",
  AI_ANALYSIS: "AI analiz üretimi",
};

export function UsageDashboard({ initial }: { initial: Summary }) {
  const [data, setData] = useState<Summary>(initial);
  const [daily, setDaily] = useState(String(initial.caps.dailyCap));
  const [perScan, setPerScan] = useState(String(initial.caps.perScanCap));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const dailyPct = Math.min(100, Math.round((data.todayTotal / data.caps.dailyCap) * 100));
  const dailyLeft = Math.max(0, data.caps.dailyCap - data.todayTotal);

  async function saveCaps() {
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
      setData((d) => ({ ...d, caps: c }));
      setMsg("Tavanlar güncellendi.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setSaving(false);
    }
  }

  const kinds = Object.keys(KIND_LABELS);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Arama Alanı
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Gauge className="size-6" /> Kullanım & Bütçe
        </h1>
        <p className="text-muted-foreground text-sm">
          Sistemin masraf-kontrol felsefesi: tavan dolunca dur ve sor.
        </p>
      </div>

      {/* Bugün / Bu ay */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Bugün</div>
          <div className="mt-1 text-2xl font-semibold">
            {data.todayTotal}
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              / {data.caps.dailyCap}
            </span>
          </div>
          <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${dailyPct >= 100 ? "bg-red-500" : dailyPct >= 80 ? "bg-orange-500" : "bg-green-500"}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            Tavana kalan: {dailyLeft} sorgu
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Bu ay ({data.monthLabel})</div>
          <div className="mt-1 text-2xl font-semibold">{data.monthTotal}</div>
          <div className="text-muted-foreground mt-2 text-xs">
            Tüm türlerin toplam çağrısı
          </div>
        </div>
      </div>

      {/* Tür kırılımı */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Tür (bu ay)</th>
              <th className="px-4 py-2 text-right font-medium">Çağrı</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
              <tr key={k} className="border-t">
                <td className="px-4 py-2">{KIND_LABELS[k]}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {data.byKind[k] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tavan ayarları */}
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Sorgu tavanları</h2>
        <p className="text-muted-foreground text-sm">
          Tavan dolunca keşif/analiz durur ve sana sorar (Bölüm 4.2).
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
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={saveCaps} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          {msg && <span className="text-muted-foreground text-sm">{msg}</span>}
        </div>
      </div>
    </main>
  );
}
