// Kaba eleme fırsat skoru (Bölüm 4.3) — AI'sız, otomatik.
// "Ne kadar açığı var = ne kadar satılır." Dürüstlük kuralı (Bölüm 4.5):
// tespit edilemeyen sinyaller "detected: false" ile açıkça işaretlenir.

import { prisma } from "@/lib/prisma";
import type { SiteCheck } from "@/lib/site-check";
import { classifyWebsite } from "@/lib/website";

// ── Yapılandırılabilir puanlama ──────────────────────────────────────────────
// Puanlar ve eşikler Ayarlar'dan (AppSetting "scoring.config") gelir; yoksa varsayılan.
export type ScoringConfig = {
  siteYok: number; // gerçek site yok → puan
  siteAcilmiyor: number; // site açılmıyor → puan
  sslYok: number; // SSL yok → puan
  mobilBozuk: number; // mobil uyumsuz → puan
  azYorum: number; // az yorum → puan
  azYorumMax: number; // yorum < bu → "az yorum"
  dusukPuan: number; // düşük puan → puan
  dusukPuanMax: number; // google puanı < bu → "düşük puan"
  sicakMin: number; // skor >= bu → SICAK
  ilikMin: number; // skor >= bu → ILIK (altı SOGUK)
};

export const DEFAULT_SCORING: ScoringConfig = {
  siteYok: 40,
  siteAcilmiyor: 20,
  sslYok: 15,
  mobilBozuk: 15,
  azYorum: 15,
  azYorumMax: 30,
  dusukPuan: 10,
  dusukPuanMax: 4.0,
  sicakMin: 70,
  ilikMin: 40,
};

export async function getScoringConfig(): Promise<ScoringConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: "scoring.config" } });
  const v = (row?.value ?? {}) as Partial<ScoringConfig>;
  const out = { ...DEFAULT_SCORING };
  for (const k of Object.keys(DEFAULT_SCORING) as (keyof ScoringConfig)[]) {
    if (typeof v[k] === "number" && Number.isFinite(v[k])) out[k] = v[k] as number;
  }
  return out;
}

export async function saveScoringConfig(patch: Partial<ScoringConfig>): Promise<ScoringConfig> {
  const current = await getScoringConfig();
  const next = { ...current };
  for (const k of Object.keys(DEFAULT_SCORING) as (keyof ScoringConfig)[]) {
    const val = patch[k];
    if (typeof val === "number" && Number.isFinite(val) && val >= 0) next[k] = val;
  }
  await prisma.appSetting.upsert({
    where: { key: "scoring.config" },
    update: { value: next },
    create: { key: "scoring.config", value: next },
  });
  return next;
}

export type Signal = {
  key: string;
  label: string;
  points: number;
  detected: boolean; // false → sinyal teknik olarak tespit edilemedi
};

export type ScoreResult = {
  score: number;
  bucket: "SICAK" | "ILIK" | "SOGUK";
  signals: Signal[];
  siteCheck: SiteCheck | null;
};

export type ScoreInput = {
  website: string | null;
  googleRating: number | null;
  googleReviews: number | null;
};

export function bucketOf(
  score: number,
  sicakMin = DEFAULT_SCORING.sicakMin,
  ilikMin = DEFAULT_SCORING.ilikMin,
): ScoreResult["bucket"] {
  if (score >= sicakMin) return "SICAK";
  if (score >= ilikMin) return "ILIK";
  return "SOGUK";
}

export function computeScore(
  b: ScoreInput,
  siteCheck: SiteCheck | null,
  cfg: ScoringConfig = DEFAULT_SCORING,
): ScoreResult {
  const signals: Signal[] = [];
  const kind = classifyWebsite(b.website);
  const hasRealSite = kind === "gercek";

  if (!hasRealSite) {
    // Instagram/Facebook (sosyal) ya da rehber/tanıtım sayfası gerçek site sayılmaz
    // → puanlamada "Site yok" gibi işlenir.
    signals.push({ key: "site-yok", label: "Site yok", points: cfg.siteYok, detected: true });
  } else if (siteCheck) {
    if (!siteCheck.reachable) {
      signals.push({
        key: "site-acilmiyor",
        label: "Site açılmıyor",
        points: cfg.siteAcilmiyor,
        detected: true,
      });
    } else {
      if (!siteCheck.https) {
        signals.push({ key: "ssl-yok", label: "SSL yok", points: cfg.sslYok, detected: true });
      }
      if (!siteCheck.hasViewport) {
        signals.push({
          key: "mobil-bozuk",
          label: "Mobil uyumsuz",
          points: cfg.mobilBozuk,
          detected: true,
        });
      }
    }
  } else {
    // Site var ama henüz kontrol edilmedi → tespit edilemedi.
    signals.push({
      key: "site-kontrol-yok",
      label: "Site sağlığı kontrol edilmedi",
      points: 0,
      detected: false,
    });
  }

  // Yorum sayısı
  if (b.googleReviews != null) {
    if (b.googleReviews < cfg.azYorumMax) {
      signals.push({
        key: "az-yorum",
        label: `Az yorum (${b.googleReviews})`,
        points: cfg.azYorum,
        detected: true,
      });
    }
  } else {
    signals.push({ key: "yorum-yok-veri", label: "Yorum verisi yok", points: 0, detected: false });
  }

  // Puan
  if (b.googleRating != null) {
    if (b.googleRating < cfg.dusukPuanMax) {
      signals.push({
        key: "dusuk-puan",
        label: `Düşük puan (${b.googleRating.toFixed(1)})`,
        points: cfg.dusukPuan,
        detected: true,
      });
    }
  } else {
    signals.push({ key: "puan-yok-veri", label: "Puan verisi yok", points: 0, detected: false });
  }

  // Son yorum tarihi Places keşif verisinde yok → tespit edilemez (dürüstlük).
  signals.push({
    key: "son-yorum-tazeligi",
    label: "Son yorum tazeliği tespit edilemedi",
    points: 0,
    detected: false,
  });

  const score = signals.reduce((s, x) => s + x.points, 0);
  return { score, bucket: bucketOf(score, cfg.sicakMin, cfg.ilikMin), signals, siteCheck };
}
