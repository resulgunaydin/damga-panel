import { prisma } from "@/lib/prisma";
import { getScoringConfig } from "@/lib/scoring";
import { ScoringSettings } from "@/components/settings/scoring-settings";

export const dynamic = "force-dynamic";

type Bd = {
  bucket?: string;
  signals?: { key: string; label: string; detected: boolean }[];
};

export default async function AyarlarPuanlamaPage() {
  const [config, businesses] = await Promise.all([
    getScoringConfig(),
    prisma.business.findMany({
      where: { blacklisted: false },
      select: { coarseScore: true, scoreBreakdown: true },
    }),
  ]);

  let scored = 0,
    sicak = 0,
    ilik = 0,
    soguk = 0,
    scoreSum = 0;
  const freq: Record<string, { label: string; count: number }> = {};
  for (const b of businesses) {
    const bd = b.scoreBreakdown as Bd | null;
    if (!bd?.bucket) continue;
    scored++;
    scoreSum += b.coarseScore;
    if (bd.bucket === "SICAK") sicak++;
    else if (bd.bucket === "ILIK") ilik++;
    else soguk++;
    for (const s of bd.signals ?? []) {
      if (!s.detected) continue;
      // "Az yorum (12)" → "Az yorum": tür bazında topla.
      const label = s.label.replace(/\s*\(.*\)\s*$/, "");
      const cur = freq[s.key] ?? { label, count: 0 };
      cur.count++;
      freq[s.key] = cur;
    }
  }
  const total = businesses.length;
  const signals = Object.entries(freq)
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count);

  return (
    <ScoringSettings
      config={config}
      data={{
        total,
        scored,
        unscored: total - scored,
        sicak,
        ilik,
        soguk,
        avg: scored ? Math.round(scoreSum / scored) : 0,
        signals,
      }}
    />
  );
}
