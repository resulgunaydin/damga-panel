"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gauge, Settings } from "lucide-react";

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
  const data = initial;
  const dailyPct = Math.min(100, Math.round((data.todayTotal / data.caps.dailyCap) * 100));
  const dailyLeft = Math.max(0, data.caps.dailyCap - data.todayTotal);
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

      {/* Tavan bilgisi — düzenleme Ayarlar'da */}
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Sorgu tavanları</h2>
        <p className="text-muted-foreground text-sm">
          Günlük: <b className="text-foreground">{data.caps.dailyCap}</b> · Tarama başına:{" "}
          <b className="text-foreground">{data.caps.perScanCap}</b>. Tavan dolunca keşif/analiz
          durur ve sana sorar (Bölüm 4.2).
        </p>
        <Link
          href="/ayarlar/limitler"
          className="text-primary mt-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <Settings className="size-3.5" /> Tavanları değiştir (Ayarlar)
        </Link>
      </div>
    </main>
  );
}
