// Kaba eleme fırsat skoru (Bölüm 4.3) — AI'sız, otomatik.
// "Ne kadar açığı var = ne kadar satılır." Dürüstlük kuralı (Bölüm 4.5):
// tespit edilemeyen sinyaller "detected: false" ile açıkça işaretlenir.

import type { SiteCheck } from "@/lib/site-check";

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

export function bucketOf(score: number): ScoreResult["bucket"] {
  if (score >= 70) return "SICAK";
  if (score >= 40) return "ILIK";
  return "SOGUK";
}

export function computeScore(
  b: ScoreInput,
  siteCheck: SiteCheck | null,
): ScoreResult {
  const signals: Signal[] = [];
  const hasSite = !!b.website;

  if (!hasSite) {
    signals.push({ key: "site-yok", label: "Site yok", points: 40, detected: true });
  } else if (siteCheck) {
    if (!siteCheck.reachable) {
      signals.push({
        key: "site-acilmiyor",
        label: "Site açılmıyor",
        points: 20,
        detected: true,
      });
    } else {
      if (!siteCheck.https) {
        signals.push({ key: "ssl-yok", label: "SSL yok", points: 15, detected: true });
      }
      if (!siteCheck.hasViewport) {
        signals.push({
          key: "mobil-bozuk",
          label: "Mobil uyumsuz",
          points: 15,
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
    if (b.googleReviews < 30) {
      signals.push({
        key: "az-yorum",
        label: `Az yorum (${b.googleReviews})`,
        points: 15,
        detected: true,
      });
    }
  } else {
    signals.push({ key: "yorum-yok-veri", label: "Yorum verisi yok", points: 0, detected: false });
  }

  // Puan
  if (b.googleRating != null) {
    if (b.googleRating < 4.0) {
      signals.push({
        key: "dusuk-puan",
        label: `Düşük puan (${b.googleRating.toFixed(1)})`,
        points: 10,
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
  return { score, bucket: bucketOf(score), signals, siteCheck };
}
