"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Filter,
  Globe,
  MapPin,
  Phone,
  Plus,
  Radar,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyWebsite } from "@/lib/website";
import { isLandlinePhone } from "@/lib/phone";

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
  mapsUri: string | null;
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
  "tarama-tavani": "Bu arama için sorgu tavanına ulaşıldı — durdum.",
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

  // Filtreler
  const [q, setQ] = useState("");
  const [siteFilter, setSiteFilter] = useState<"hepsi" | "var" | "sosyal" | "yok">("hepsi");
  const [sabitHaric, setSabitHaric] = useState(false);
  const [sort, setSort] = useState<"skor" | "isim" | "yorum" | "puan">("skor");
  const [bulkAdding, setBulkAdding] = useState(false);

  const neverRun = usage.scanQueries === 0;
  const unscoredAll = businesses.filter((b) => !b.scoreBreakdown);
  const allScored = businesses.length > 0 && unscoredAll.length === 0;

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const list = businesses.filter((b) => {
      const kind = classifyWebsite(b.website);
      if (siteFilter === "var" && kind !== "gercek") return false;
      if (siteFilter === "sosyal" && kind !== "sosyal") return false;
      if (siteFilter === "yok" && (kind === "gercek" || kind === "sosyal")) return false;
      if (sabitHaric && isLandlinePhone(b.phone)) return false;
      if (needle) {
        const hay = `${b.name} ${b.address ?? ""}`.toLocaleLowerCase("tr");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const cmp: Record<typeof sort, (a: Business, b: Business) => number> = {
      skor: (a, b) => b.coarseScore - a.coarseScore,
      isim: (a, b) => a.name.localeCompare(b.name, "tr"),
      yorum: (a, b) => (b.googleReviews ?? 0) - (a.googleReviews ?? 0),
      puan: (a, b) => (b.googleRating ?? 0) - (a.googleRating ?? 0),
    };
    return [...list].sort(cmp[sort]);
  }, [businesses, q, siteFilter, sabitHaric, sort]);

  const unscored = filtered.filter((b) => !b.scoreBreakdown);
  const addable = useMemo(() => filtered.filter((b) => !b.inWorkList), [filtered]);

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

  async function bulkAdd() {
    const ids = addable.map((b) => b.id);
    if (ids.length === 0) return;
    setBulkAdding(true);
    setMsg(null);
    const idSet = new Set(ids);
    setBusinesses((bs) => bs.map((b) => (idSet.has(b.id) ? { ...b, inWorkList: true } : b)));
    try {
      const res = await fetch("/api/businesses/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, inWorkList: true }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMsg(`${data.updated} firma çalışma listesine eklendi.`);
    } catch {
      setBusinesses((bs) => bs.map((b) => (idSet.has(b.id) ? { ...b, inWorkList: false } : b)));
      setMsg("Toplu ekleme başarısız oldu.");
    } finally {
      setBulkAdding(false);
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
          <ArrowLeft className="size-4" /> Arama Alanı
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
              onClick={() => score(allScored)}
              disabled={scoring || businesses.length === 0}
              title="Site sağlığı + Google verisiyle fırsat skoru (ücretsiz)"
            >
              <Filter className={`size-4 ${scoring ? "animate-pulse" : ""}`} />
              {scoring ? "Puanlanıyor…" : allScored ? "Yeniden puanla" : "Puanla"}
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
          Bu arama sorgusu:{" "}
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
        <div className="flex flex-col gap-4">
          {/* Filtre & arama çubuğu */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Firma / adres ara…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  ["hepsi", "Hepsi"],
                  ["yok", "Site yok"],
                  ["sosyal", "Sosyal"],
                  ["var", "Site var"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSiteFilter(k)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    siteFilter === k ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setSabitHaric((v) => !v)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  sabitHaric ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-accent"
                }`}
                title="0850, 0332 gibi sabit hat numaralarını hariç tut"
              >
                Sabit hat hariç
              </button>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-background h-8 rounded-lg border px-2 text-sm"
            >
              <option value="skor">Skora göre</option>
              <option value="yorum">Yoruma göre</option>
              <option value="puan">Puana göre</option>
              <option value="isim">İsme göre</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={bulkAdd}
              disabled={bulkAdding || addable.length === 0}
              title="Şu an görünen (filtrelenmiş) firmaların hepsini çalışma listesine ekle"
            >
              <Plus className="size-4" />
              {bulkAdding ? "Ekleniyor…" : `Filtrelenenleri Çalışmaya Ekle (${addable.length})`}
            </Button>
          </div>

          <p className="text-muted-foreground text-sm">
            {filtered.length} firma gösteriliyor
            {unscoredAll.length > 0 && (
              <>
                {" · "}
                {unscoredAll.length} henüz puanlanmadı — <b>Puanla</b>’ya basın
              </>
            )}
          </p>

          {filtered.length === 0 && (
            <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
              Bu süzgeçle firma yok.
            </div>
          )}

          {BUCKETS.map((bucket) => {
            const items = filtered.filter(
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
          <a
            href={
              b.mapsUri ??
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address ?? ""}`)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary inline-flex items-center gap-1 font-medium hover:underline"
            title="Google Haritalar'da aç"
          >
            {b.name}
            <MapPin className="size-3 opacity-50" />
          </a>
          {b.googleRating != null && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Star className="size-3 fill-current text-amber-500" />
              {b.googleRating.toFixed(1)} ({b.googleReviews ?? 0})
            </span>
          )}
          {(() => {
            const kind = classifyWebsite(b.website);
            if (kind === "gercek")
              return (
                <a
                  href={b.website!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Globe className="size-3" /> site <ExternalLink className="size-3" />
                </a>
              );
            if (kind === "sosyal")
              return (
                <a
                  href={b.website!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400"
                  title="Sadece sosyal medya — gerçek sitesi yok"
                >
                  sosyal medya <ExternalLink className="size-3" />
                </a>
              );
            return <span className="text-xs font-medium text-orange-600">site yok</span>;
          })()}
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
