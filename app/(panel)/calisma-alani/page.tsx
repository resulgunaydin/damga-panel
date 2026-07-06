import { prisma } from "@/lib/prisma";
import { getSectors } from "@/lib/sectors";
import { Workspace } from "@/components/workspace/workspace";

export const dynamic = "force-dynamic";

export default async function CalismaAlaniPage() {
  const sectors = await getSectors();
  const searches = await prisma.search.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      city: true,
      district: true,
      sector: true,
      keywords: true,
      lastRunAt: true,
      queryCount: true,
      gridState: true,
      _count: { select: { businesses: true } },
    },
  });

  return (
    <Workspace
      initialSectors={sectors}
      initialSegments={searches.map((s) => {
        const done = (s.gridState as { done?: boolean } | null)?.done === true;
        const scanState =
          s.queryCount === 0 ? "bos" : done ? "tamam" : "kismi";
        return {
          id: s.id,
          city: s.city,
          district: s.district,
          sector: s.sector,
          keywords: s.keywords,
          lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
          firmaCount: s._count.businesses,
          scanState: scanState as "bos" | "kismi" | "tamam",
        };
      })}
    />
  );
}
