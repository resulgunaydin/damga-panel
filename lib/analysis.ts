// Analiz motoru çıktı biçimi + Google Business analizi (Bölüm 4.5).
// Dürüstlük kuralı: her sinyal kesin / tahmini / tespit-edilemedi olarak işaretlenir.

import type { PlaceDetails } from "@/lib/places";
import type { PageSpeedResult } from "@/lib/pagespeed";
import type { BrowserObs } from "@/lib/browser";

export type SignalLevel = "kesin" | "tahmini" | "tespit-edilemedi";
export type Metric = { label: string; value: string; level: SignalLevel };
export type AnalysisResult = {
  metrics: Metric[];
  summary: string;
};

function monthsAgo(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24 * 30));
}

// Google Business (GBP) analizi — Places detayından.
export function computeGbpAnalysis(d: PlaceDetails): AnalysisResult {
  const metrics: Metric[] = [];

  metrics.push({
    label: "Google puanı",
    value: d.rating != null ? d.rating.toFixed(1) : "—",
    level: d.rating != null ? "kesin" : "tespit-edilemedi",
  });
  metrics.push({
    label: "Yorum sayısı",
    value: d.reviewCount != null ? String(d.reviewCount) : "—",
    level: d.reviewCount != null ? "kesin" : "tespit-edilemedi",
  });

  // Son yorum tazeliği (en yeni yorum tarihinden)
  const newest = d.reviews
    .map((r) => r.publishTime)
    .filter(Boolean)
    .sort()
    .at(-1) as string | undefined;
  const ay = monthsAgo(newest ?? null);
  metrics.push({
    label: "Son yorum",
    value: ay == null ? "—" : ay <= 0 ? "bu ay" : `${ay} ay önce`,
    level: ay == null ? "tespit-edilemedi" : "kesin",
  });

  // Fotoğraf (Places en fazla ~10 referans döner → alt sınır)
  metrics.push({
    label: "Fotoğraf",
    value: d.photoCount != null ? `en az ${d.photoCount}` : "—",
    level: d.photoCount != null ? "tahmini" : "tespit-edilemedi",
  });

  // Cevaplanan yorum oranı: Places detayında sahibin yanıtı gelmez.
  metrics.push({
    label: "Cevaplanan yorum oranı",
    value: "tespit edilemedi",
    level: "tespit-edilemedi",
  });

  // Aktivite (son yorum tazeliğinden türetilir)
  let aktivite = "—";
  let aktiviteLevel: SignalLevel = "tespit-edilemedi";
  if (ay != null) {
    aktivite = ay <= 1 ? "aktif" : ay <= 3 ? "orta" : "durgun";
    aktiviteLevel = "tahmini";
  }
  metrics.push({ label: "Aktivite", value: aktivite, level: aktiviteLevel });

  // Özet (satış açısı)
  const acik: string[] = [];
  if (d.reviewCount != null && d.reviewCount < 30) acik.push("az yorum");
  if (ay != null && ay > 3) acik.push("uzun süredir yeni yorum yok");
  if (d.rating != null && d.rating < 4.0) acik.push("puan düşük");
  const summary =
    acik.length > 0
      ? `Google Business açıkları: ${acik.join(", ")}. Yorum/itibar çalışması satılabilir.`
      : "Google Business profili iyi durumda; belirgin açık yok.";

  return { metrics, summary };
}

// Website analizi (Bölüm 4.5) — PageSpeed + gerçek tarayıcı gözlemi.
export function computeWebsiteAnalysis(
  ps: PageSpeedResult,
  obs: BrowserObs,
): AnalysisResult {
  const metrics: Metric[] = [];

  metrics.push({
    label: "Site açılıyor mu",
    value: obs.reachable ? "evet" : "hayır",
    level: "kesin",
  });
  metrics.push({
    label: "Yüklenme süresi",
    value: obs.loadMs != null ? `${(obs.loadMs / 1000).toFixed(1)} sn` : "—",
    level: obs.loadMs != null ? "kesin" : "tespit-edilemedi",
  });
  metrics.push({
    label: "Mobil uyumlu (viewport)",
    value: obs.hasViewport ? "evet" : "hayır",
    level: "kesin",
  });

  const scoreMetric = (label: string, v: number | null): Metric => ({
    label,
    value: v != null ? `${v}/100` : "—",
    level: v != null ? "kesin" : "tespit-edilemedi",
  });
  metrics.push(scoreMetric("Performans (PageSpeed)", ps.performance));
  metrics.push(scoreMetric("SEO", ps.seo));
  metrics.push(scoreMetric("Erişilebilirlik", ps.accessibility));
  metrics.push(scoreMetric("En iyi uygulamalar", ps.bestPractices));
  metrics.push({
    label: "LCP (en büyük içerik)",
    value: ps.lcp ?? "—",
    level: ps.lcp ? "kesin" : "tespit-edilemedi",
  });

  // Kalite puanı = mevcut PageSpeed skorlarının ortalaması (0-100)
  const scores = [ps.performance, ps.seo, ps.accessibility, ps.bestPractices].filter(
    (x): x is number => x != null,
  );
  const quality = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
  metrics.push({
    label: "Website kalite puanı",
    value: quality != null ? `${quality}/100` : "—",
    level: quality != null ? "tahmini" : "tespit-edilemedi",
  });

  const acik: string[] = [];
  if (!obs.reachable) acik.push("site açılmıyor");
  if (!obs.hasViewport) acik.push("mobil uyumsuz");
  if (obs.loadMs != null && obs.loadMs > 4000) acik.push("yavaş yükleniyor");
  if (ps.performance != null && ps.performance < 50) acik.push("performans düşük");
  if (ps.seo != null && ps.seo < 70) acik.push("SEO zayıf");

  const summary =
    acik.length > 0
      ? `Website açıkları: ${acik.join(", ")}. Yenileme/optimizasyon satılabilir.`
      : "Website teknik olarak iyi durumda; belirgin açık az.";

  return { metrics, summary };
}
