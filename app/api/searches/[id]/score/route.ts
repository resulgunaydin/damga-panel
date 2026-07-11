import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSite, mapWithConcurrency } from "@/lib/site-check";
import { computeScore, getScoringConfig } from "@/lib/scoring";
import { hasRealWebsite } from "@/lib/website";

type Ctx = { params: Promise<{ id: string }> };

// Segmentteki firmalara kaba eleme skoru uygular (AI'sız, ücretsiz site kontrolü).
// Cache (Bölüm 5): daha önce skorlananlar tekrar taranmaz — ?force=1 ile yeniden.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const force = new URL(req.url).searchParams.get("force") === "1";

  const businesses = await prisma.business.findMany({
    where: { searchId: id, blacklisted: false },
    select: {
      id: true,
      website: true,
      googleRating: true,
      googleReviews: true,
      scoreBreakdown: true,
    },
  });

  const targets = force
    ? businesses
    : businesses.filter((b) => b.scoreBreakdown == null);

  const scoringCfg = await getScoringConfig();

  await mapWithConcurrency(targets, 10, async (b) => {
    // Sadece gerçek siteler için sağlık kontrolü (sosyal/rehber çekilmez).
    const siteCheck = hasRealWebsite(b.website) ? await checkSite(b.website!) : null;
    const result = computeScore(
      {
        website: b.website,
        googleRating: b.googleRating,
        googleReviews: b.googleReviews,
      },
      siteCheck,
      scoringCfg,
    );
    await prisma.business.update({
      where: { id: b.id },
      data: {
        coarseScore: result.score,
        scoreBreakdown: {
          score: result.score,
          bucket: result.bucket,
          signals: result.signals,
          siteCheck: result.siteCheck,
        } as object,
      },
    });
  });

  // Güncel kova dağılımı
  const all = await prisma.business.findMany({
    where: { searchId: id, blacklisted: false },
    select: { scoreBreakdown: true },
  });
  let sicak = 0,
    ilik = 0,
    soguk = 0,
    scored = 0;
  for (const b of all) {
    const bucket = (b.scoreBreakdown as { bucket?: string } | null)?.bucket;
    if (!bucket) continue;
    scored++;
    if (bucket === "SICAK") sicak++;
    else if (bucket === "ILIK") ilik++;
    else soguk++;
  }

  return NextResponse.json({
    justScored: targets.length,
    scored,
    sicak,
    ilik,
    soguk,
    total: all.length,
  });
}
