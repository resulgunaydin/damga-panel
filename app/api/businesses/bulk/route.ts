import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/business";

// Birden fazla firmayı tek seferde çalışma listesine ekler (Bölüm 4.3 toplu ekleme).
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0 || typeof body.inWorkList !== "boolean") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const toUpdate = await prisma.business.findMany({
    where: { id: { in: ids }, inWorkList: { not: body.inWorkList } },
    select: { id: true },
  });
  if (toUpdate.length === 0) {
    return NextResponse.json({ updated: 0 });
  }
  const updateIds = toUpdate.map((b) => b.id);

  await prisma.business.updateMany({
    where: { id: { in: updateIds } },
    data: { inWorkList: body.inWorkList },
  });
  for (const id of updateIds) {
    await logActivity(
      id,
      body.inWorkList ? "Çalışma listesine eklendi (toplu)." : "Çalışma listesinden çıkarıldı (toplu).",
    );
  }

  return NextResponse.json({ updated: updateIds.length });
}
