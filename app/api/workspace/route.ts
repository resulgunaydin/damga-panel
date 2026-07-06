import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Çalışma alanının tamamını döner: klasör ağacı (düz liste) + segmentler.
export async function GET() {
  const [folders, searches] = await Promise.all([
    prisma.folder.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.search.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ folders, searches });
}
