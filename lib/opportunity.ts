// Satış Fırsatı Motoru (Bölüm 4.6) — FİYATSIZ.
// Firmanın tespit edilen açıklarını (kaba eleme sinyalleri; ileride derin analiz)
// hizmet bazlı önceliğe dönüştürür: "önce web sitesi, sonra yorum çalışması".

import type { Signal } from "@/lib/scoring";

export type Opportunity = {
  area: string; // hizmet alanı
  priority: number; // 1-3 yıldız
  reasons: string[]; // hangi sinyallerden geldi
};

// Sinyal → hizmet alanı + öncelik eşlemesi.
const MAP: Record<string, { area: string; priority: number }> = {
  "site-yok": { area: "Web sitesi", priority: 3 },
  "site-acilmiyor": { area: "Web sitesi", priority: 3 },
  "ssl-yok": { area: "Web sitesi (güvenlik/SSL)", priority: 2 },
  "mobil-bozuk": { area: "Mobil uyumlu site", priority: 2 },
  "az-yorum": { area: "Yorum / itibar çalışması", priority: 2 },
  "dusuk-puan": { area: "İtibar yönetimi", priority: 1 },
};

// scoreBreakdown.signals'tan öncelikli fırsat listesi üretir.
export function opportunitiesFromSignals(
  signals: Signal[] | undefined,
): Opportunity[] {
  if (!signals) return [];
  const byArea = new Map<string, Opportunity>();
  for (const s of signals) {
    if (!s.detected) continue;
    const m = MAP[s.key];
    if (!m) continue;
    const existing = byArea.get(m.area);
    if (existing) {
      existing.priority = Math.max(existing.priority, m.priority);
      existing.reasons.push(s.label);
    } else {
      byArea.set(m.area, { area: m.area, priority: m.priority, reasons: [s.label] });
    }
  }
  return Array.from(byArea.values()).sort((a, b) => b.priority - a.priority);
}
