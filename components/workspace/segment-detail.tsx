"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Phone,
  Radar,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Business = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  googleRating: number | null;
  googleReviews: number | null;
  status: string;
};
type Usage = {
  caps: { dailyCap: number; perScanCap: number };
  placesToday: number;
  scanQueries: number;
};
type ScanSummary = {
  newCount: number;
  queriesThisBatch: number;
  totalQueries: number;
  done: boolean;
  stopped: boolean;
  stoppedReason: string | null;
  frontierSize: number;
};

const REASON: Record<string, string> = {
  "gunluk-tavan": "Günlük sorgu tavanına ulaşıldı — durdum.",
  "tarama-tavani": "Bu segment için sorgu tavanına ulaşıldı — durdum.",
  "alan-bulunamadi": "Bu il/ilçe için alan sınırı bulunamadı.",
};

export function SegmentDetail({
  search,
  initialBusinesses,
  initialUsage,
}: {
  search: {
    id: string;
    city: string;
    district: string | null;
    sector: string;
    keywords: string[];
    queryCount: number;
  };
  initialBusinesses: Business[];
  initialUsage: Usage;
}) {
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [usage, setUsage] = useState<Usage>(initialUsage);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const neverRun = usage.scanQueries === 0;

  async function refresh() {
    const res = await fetch(`/api/searches/${search.id}/businesses`);
    if (!res.ok) return;
    const data = await res.json();
    setBusinesses(data.businesses);
    setUsage(data.usage);
  }

  async function scan() {
    setScanning(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/searches/${search.id}/scan`, { method: "POST" });
      const s: ScanSummary & { error?: string } = await res.json();
      if (!res.ok) throw new Error(s.error ?? "Tarama başarısız.");
      await refresh();

      const parts = [`${s.newCount} yeni firma`, `${s.queriesThisBatch} sorgu`];
      if (s.stopped && s.stoppedReason) {
        parts.push(REASON[s.stoppedReason] ?? s.stoppedReason);
      } else if (s.done) {
        parts.push("Tarama tamamlandı — yeni bölge kalmadı.");
        setDone(true);
      } else if (s.frontierSize > 0) {
        parts.push("“Devamını Gör” ile sürdürebilirsin.");
      }
      setMsg(parts.join(" · "));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Çalışma Alanı
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {search.city}
              {search.district ? ` · ${search.district}` : ""}
            </h1>
            <p className="text-muted-foreground">{search.sector}</p>
            {search.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {search.keywords.map((k) => (
                  <span
                    key={k}
                    className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button onClick={scan} disabled={scanning || done}>
            <Radar className={`size-4 ${scanning ? "animate-pulse" : ""}`} />
            {scanning
              ? "Taranıyor…"
              : done
                ? "Tarandı"
                : neverRun
                  ? "Taramayı başlat"
                  : "Devamını Gör"}
          </Button>
        </div>
      </div>

      {/* Kullanım / bütçe göstergesi (Bölüm 4.12) */}
      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 rounded-lg border px-4 py-3 text-sm">
        <span>
          Bu segment sorgusu:{" "}
          <b className="text-foreground">{usage.scanQueries}</b> /{" "}
          {usage.caps.perScanCap}
        </span>
        <span>
          Bugün toplam Places:{" "}
          <b className="text-foreground">{usage.placesToday}</b> /{" "}
          {usage.caps.dailyCap}
        </span>
        <span>
          Bulunan firma: <b className="text-foreground">{businesses.length}</b>
        </span>
      </div>

      {msg && (
        <div className="rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200">
          {msg}
        </div>
      )}

      {/* Firma listesi (kaba eleme + kovalar #5'te) */}
      {businesses.length === 0 ? (
        <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
          <Radar className="size-8 opacity-40" />
          <p>Henüz firma yok.</p>
          <p className="text-xs">
            “Taramayı başlat” ile Google Places’ten firmaları çek.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Firma</th>
                <th className="px-4 py-2 font-medium">Telefon</th>
                <th className="px-4 py-2 font-medium">Web</th>
                <th className="px-4 py-2 font-medium">Puan</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-2">
                    <div className="font-medium">{b.name}</div>
                    {b.address && (
                      <div className="text-muted-foreground text-xs">{b.address}</div>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-2">
                    {b.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" /> {b.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {b.website ? (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Globe className="size-3" /> var{" "}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="font-medium text-orange-600">site yok</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-2">
                    {b.googleRating != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3 fill-current text-amber-500" />
                        {b.googleRating.toFixed(1)}
                        <span className="text-xs">({b.googleReviews ?? 0})</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
