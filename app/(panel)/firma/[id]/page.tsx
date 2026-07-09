import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { opportunitiesFromSignals } from "@/lib/opportunity";
import { hasRealWebsite } from "@/lib/website";
import { stageForStatus } from "@/lib/business";
import type { Signal } from "@/lib/scoring";
import { FirmaDetay } from "@/components/firma/firma-detay";

export const dynamic = "force-dynamic";

export default async function FirmaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      search: { select: { city: true, district: true, sector: true } },
      messages: { where: { kind: "ON_MESAJ" }, orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
      analyses: { orderBy: { generatedAt: "desc" } },
      customer: {
        include: {
          jobs: {
            orderBy: { createdAt: "desc" },
            include: { payments: { orderBy: { paidAt: "asc" } } },
          },
        },
      },
    },
  });
  if (!business) notFound();

  const breakdown = business.scoreBreakdown as { signals?: Signal[] } | null;
  const opportunities = opportunitiesFromSignals(breakdown?.signals);

  // Tür başına en güncel analiz
  const latestByKind = new Map<string, (typeof business.analyses)[number]>();
  for (const a of business.analyses) {
    if (!latestByKind.has(a.kind)) latestByKind.set(a.kind, a);
  }

  return (
    <FirmaDetay
      opportunities={opportunities}
      hasPlaceId={!!business.placeId}
      hasSearch={!!business.searchId}
      hasWebsite={hasRealWebsite(business.website)}
      analyses={Array.from(latestByKind.values()).map((a) => ({
        kind: a.kind,
        result: a.result,
        generatedAt: a.generatedAt.toISOString(),
      }))}
      business={{
        id: business.id,
        name: business.name,
        phone: business.phone,
        website: business.website,
        address: business.address,
        mapsUri: (business.social as { googleMapsUri?: string } | null)?.googleMapsUri ?? null,
        status: business.status,
        blacklisted: business.blacklisted,
        coarseScore: business.coarseScore,
        googleRating: business.googleRating,
        googleReviews: business.googleReviews,
        context: business.search
          ? `${business.search.city}${business.search.district ? " · " + business.search.district : ""} · ${business.search.sector}`
          : null,
      }}
      isEleme={stageForStatus(business.status) === "ELEME"}
      initialMessage={business.messages[0]?.content ?? null}
      activities={business.activities.map((a) => ({
        id: a.id,
        kind: a.kind,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      }))}
      isCustomer={business.stage === "MUSTERI" || !!business.customer}
      jobs={(business.customer?.jobs ?? []).map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        deadline: j.deadline ? j.deadline.toISOString() : null,
        note: j.note,
        agreedAmount: j.agreedAmount != null ? Number(j.agreedAmount) : null,
        payments: j.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          note: p.note,
          paidAt: p.paidAt.toISOString(),
        })),
      }))}
    />
  );
}
