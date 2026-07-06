"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Filter,
  Globe,
  Phone,
  Plus,
  Radar,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Signal = { key: string; label: string; points: number; detected: boolean };
export type Breakdown = {
  score: number;
  bucket: "SICAK" | "ILIK" | "SOGUK";
  signals: Signal[];
} | null;
type Business = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  googleRating: number | null;
  googleReviews: number | null;
  status: string;
  inWorkList: boolean;
  coarseScore: number;
  scoreBreakdown: Breakdown;
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
type ScoreSummary = {
  justScored: number;
  scored: number;
  sicak: number;
  ilik: number;
  soguk: number;
  total: number;
};

const REASON: Record<string, string> = {
  "gunluk-tavan": "Günlük sorgu tavanına ulaşıldı — durdum.",
  "tarama-tavani": "Bu segment için sorgu tavanına ulaşıldı — durdum.",
  "alan-bulunamadi": "Bu il/ilçe için alan sınırı bulunamadı.",
};

const BUCKETS = [
  {
    key: "SICAK" as const,
    title: "🔥 Sıcak",
    hint: "70+ · en çok açığı olan",
    accent: "border-orange-300 dark:border-orange-900/60",
    badge: "bg-orange-500 text-white",
  },
  {
    key: "ILIK" as const,
    title: "🟡 Ilık",
    hint: "40–69",
    accent: "border-amber-200 dark:border-amber-900/50",
    badge: "bg-amber-400 text-black",
  },
  {
    key: "SOGUK" as const,
    title: "⚪ Soğuk",
    hint: "<40 · zaten iyi durumda",
    accent: "border-border",
    badge: "bg-muted text-muted-foreground",
  },
];

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
  const [scoring, setScoring] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const neverRun = usage.scanQueries === 0;
  const unscored = businesses.filter((b) => !b.scoreBreakdown);

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
      if (s.stopped && s.stoppedReason) parts.push(REASON[s.stoppedReason] ?? s.stoppedReason);
      else if (s.done) {
        parts.push("Tarama tamamlandı — yeni bölge kalmadı.");
        setDone(true);
      } else if (s.frontierSize > 0) parts.push("“Devamını Gör” ile sürdürebilirsin.");
      setMsg(parts.join(" · "));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setScanning(false);
    }
  }

  async function toggleWork(id: string, next: boolean) {
    setBusinesses((bs) =>
      bs.map((b) => (b.id === id ? { ...b, inWorkList: next } : b)),
    );
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inWorkList: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // geri al
      setBusinesses((bs) =>
        bs.map((b) => (b.id === id ? { ...b, inWorkList: !next } : b)),
      );
      setMsg("Çalışma listesi güncellenemedi.");
    }
  }

  async function score(force = false) {
    setScoring(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/searches/${search.id}/score${force ? "?force=1" : ""}`,
        { method: "POST" },
      );
      const s: ScoreSummary & { error?: string } = await res.json();
      if (!res.ok) throw new Error(s.error ?? "Skorlama başarısız.");
      await refresh();
      setMsg(
        `${s.justScored} firma skorlandı · 🔥 ${s.sicak} · 🟡 ${s.ilik} · ⚪ ${s.soguk}`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setScoring(false);
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => score(false)}
              disabled={scoring || businesses.length === 0}
              title="Site sağlığı + Google verisiyle fırsat skoru (ücretsiz)"
            >
              <Filter className={`size-4 ${scoring ? "animate-pulse" : ""}`} />
              {scoring ? "Eleniyor…" : "Kaba Ele"}
            </Button>
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
      </div>

      {/* Kullanım / bütçe göstergesi (Bölüm 4.12) */}
      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 rounded-lg border px-4 py-3 text-sm">
        <span>
          Bu segment sorgusu:{" "}
          <b className="text-foreground">{usage.scanQueries}</b> / {usage.caps.perScanCap}
        </span>
        <span>
          Bugün toplam Places:{" "}
          <b className="text-foreground">{usage.placesToday}</b> / {usage.caps.dailyCap}
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

      {businesses.length === 0 ? (
        <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
          <Radar className="size-8 opacity-40" />
          <p>Henüz firma yok.</p>
          <p className="text-xs">“Taramayı başlat” ile Google Places’ten firmaları çek.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {unscored.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {unscored.length} firma henüz skorlanmadı — <b>Kaba Ele</b>’ye basın.
            </p>
          )}

          {BUCKETS.map((bucket) => {
            const items = businesses.filter(
              (b) => b.scoreBreakdown?.bucket === bucket.key,
            );
            if (items.length === 0) return null;
            return (
              <section key={bucket.key}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="font-semibold">{bucket.title}</h2>
                  <span className="text-muted-foreground text-xs">
                    {bucket.hint} · {items.length}
                  </span>
                </div>
                <div className={`divide-y overflow-hidden rounded-lg border ${bucket.accent}`}>
                  {items.map((b) => (
                    <FirmRow key={b.id} b={b} badge={bucket.badge} onToggleWork={toggleWork} />
                  ))}
                </div>
              </section>
            );
          })}

          {unscored.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-2 font-semibold">Skorlanmadı</h2>
              <div className="divide-y overflow-hidden rounded-lg border">
                {unscored.map((b) => (
                  <FirmRow
                    key={b.id}
                    b={b}
                    badge="bg-muted text-muted-foreground"
                    onToggleWork={toggleWork}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function FirmRow({
  b,
  badge,
  onToggleWork,
}: {
  b: Business;
  badge: string;
  onToggleWork: (id: string, next: boolean) => void;
}) {
  const detected = b.scoreBreakdown?.signals.filter((s) => s.detected) ?? [];
  const undetected = b.scoreBreakdown?.signals.filter((s) => !s.detected).length ?? 0;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${badge}`}
        title="Fırsat skoru"
      >
        {b.scoreBreakdown ? b.coarseScore : "–"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="font-medium">{b.name}</span>
          {b.googleRating != null && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Star className="size-3 fill-current text-amber-500" />
              {b.googleRating.toFixed(1)} ({b.googleReviews ?? 0})
            </span>
          )}
          {b.website ? (
            <a
              href={b.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Globe className="size-3" /> site <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="text-xs font-medium text-orange-600">site yok</span>
          )}
          {b.phone && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Phone className="size-3" /> {b.phone}
            </span>
          )}
        </div>
        {b.address && (
          <div className="text-muted-foreground truncate text-xs">{b.address}</div>
        )}
        {detected.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {detected.map((s) => (
              <span
                key={s.key}
                className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {s.label} +{s.points}
              </span>
            ))}
            {undetected > 0 && (
              <span className="text-muted-foreground px-1 py-0.5 text-xs">
                · {undetected} sinyal tespit edilemedi
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => onToggleWork(b.id, !b.inWorkList)}
        className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
          b.inWorkList
            ? "border-green-300 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300"
            : "hover:bg-accent"
        }`}
        title={b.inWorkList ? "Çalışma listemden çıkar" : "Çalışma listeme ekle"}
      >
        {b.inWorkList ? (
          <>
            <Check className="size-3" /> Listede
          </>
        ) : (
          <>
            <Plus className="size-3" /> Çalışmaya ekle
          </>
        )}
      </button>
    </div>
  );
}
