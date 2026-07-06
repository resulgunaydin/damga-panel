// Google PageSpeed Insights API (Bölüm 4.5) — website hız/SEO/erişilebilirlik.
// Anahtar varsa kota yükselir; yoksa da (sınırlı) çalışır.

export type PageSpeedResult = {
  performance: number | null; // 0-100
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  lcp: string | null; // en büyük içerik boyaması (görüntü değeri)
};

export async function runPageSpeed(url: string): Promise<PageSpeedResult> {
  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", c);
  }
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (key) params.set("key", key);

  const res = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `PageSpeed hatası (${res.status})`);
  }
  const cats = data.lighthouseResult?.categories ?? {};
  const pct = (s?: number) => (typeof s === "number" ? Math.round(s * 100) : null);
  return {
    performance: pct(cats.performance?.score),
    seo: pct(cats.seo?.score),
    accessibility: pct(cats.accessibility?.score),
    bestPractices: pct(cats["best-practices"]?.score),
    lcp: data.lighthouseResult?.audits?.["largest-contentful-paint"]?.displayValue ?? null,
  };
}
