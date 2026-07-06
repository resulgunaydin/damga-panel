import { prisma } from "@/lib/prisma";
import { Workspace } from "@/components/workspace/workspace";

export const dynamic = "force-dynamic";

export default async function CalismaAlaniPage() {
  const [folders, searches] = await Promise.all([
    prisma.folder.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.search.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <Workspace
      initialFolders={folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        order: f.order,
      }))}
      initialSegments={searches.map((s) => ({
        id: s.id,
        city: s.city,
        district: s.district,
        sector: s.sector,
        keywords: s.keywords,
        folderId: s.folderId,
        lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
      }))}
    />
  );
}
