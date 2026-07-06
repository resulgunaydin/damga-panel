import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCaps, getDailyUsage, getTodayTotal } from "@/lib/quota";

type Ctx = { params: Promise<{ id: string }> };

// Bir segmentin keşfedilen firmalarını + kullanım/tavan bilgisini döner (Bölüm 4.12).
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const search = await prisma.search.findUnique({ where: { id } });
  if (!search) {
    return NextResponse.json({ error: "Segment bulunamadı." }, { status: 404 });
  }

  const [businesses, caps, placesToday, todayTotal] = await Promise.all([
    prisma.business.findMany({
      where: { searchId: id, blacklisted: false },
      orderBy: [{ coarseScore: "desc" }, { googleReviews: "desc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        website: true,
        address: true,
        googleRating: true,
        googleReviews: true,
        status: true,
        coarseScore: true,
        scoreBreakdown: true,
      },
    }),
    getCaps(),
    getDailyUsage("PLACES_SEARCH"),
    getTodayTotal(),
  ]);

  return NextResponse.json({
    search: {
      id: search.id,
      city: search.city,
      district: search.district,
      sector: search.sector,
      keywords: search.keywords,
      queryCount: search.queryCount,
      lastRunAt: search.lastRunAt,
    },
    businesses,
    usage: {
      caps,
      placesToday,
      todayTotal,
      scanQueries: search.queryCount,
    },
  });
}
