import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCaps, getDailyUsage } from "@/lib/quota";
import { SegmentDetail, type Breakdown } from "@/components/workspace/segment-detail";

export const dynamic = "force-dynamic";

export default async function SegmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const search = await prisma.search.findUnique({ where: { id } });
  if (!search) notFound();

  const [businesses, caps, placesToday] = await Promise.all([
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
  ]);

  return (
    <SegmentDetail
      search={{
        id: search.id,
        city: search.city,
        district: search.district,
        sector: search.sector,
        keywords: search.keywords,
        queryCount: search.queryCount,
      }}
      initialBusinesses={businesses.map((b) => ({
        ...b,
        scoreBreakdown: b.scoreBreakdown as unknown as Breakdown,
      }))}
      initialUsage={{
        caps,
        placesToday,
        scanQueries: search.queryCount,
      }}
    />
  );
}
