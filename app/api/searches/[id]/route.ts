import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// Segmenti güncelle (klasöre taşı / alanlarını düzenle).
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: {
    folderId?: string | null;
    city?: string;
    district?: string | null;
    sector?: string;
  } = {};

  if ("folderId" in body) data.folderId = body.folderId ?? null;
  if (typeof body.city === "string" && body.city.trim()) data.city = body.city.trim();
  if ("district" in body) data.district = String(body.district ?? "").trim() || null;
  if (typeof body.sector === "string" && body.sector.trim()) data.sector = body.sector.trim();

  const search = await prisma.search.update({ where: { id }, data });
  return NextResponse.json(search);
}

// Segmenti sil (bağlı firmalar da silinir — henüz firma yok).
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.search.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
