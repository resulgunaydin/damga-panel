import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/workspace/kanban-board";

export const dynamic = "force-dynamic";

export default async function CalismaListemPage() {
  const businesses = await prisma.business.findMany({
    where: { inWorkList: true, blacklisted: false },
    orderBy: [{ coarseScore: "desc" }],
    select: {
      id: true,
      name: true,
      status: true,
      stage: true,
      coarseScore: true,
      lossReason: true,
      phone: true,
      website: true,
      googleRating: true,
      googleReviews: true,
      search: { select: { city: true, district: true, sector: true } },
    },
  });

  return (
    <KanbanBoard
      initial={businesses.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        stage: b.stage,
        coarseScore: b.coarseScore,
        lossReason: b.lossReason,
        phone: b.phone,
        website: b.website,
        googleRating: b.googleRating,
        googleReviews: b.googleReviews,
        context: b.search
          ? `${b.search.city}${b.search.district ? " · " + b.search.district : ""} · ${b.search.sector}`
          : null,
      }))}
    />
  );
}
