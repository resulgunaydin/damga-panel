import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// Silme onayı için etki özeti: ne kaybolacak, yeniden taramanın bedeli ne.
// Firma silme Cascade → müşteri · iş · ödeme kayıtları da gider (schema.prisma).
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const search = await prisma.search.findUnique({
    where: { id },
    select: { id: true, city: true, district: true, sector: true, queryCount: true },
  });
  if (!search) {
    return NextResponse.json({ error: "Arama bulunamadı." }, { status: 404 });
  }

  const [businesses, inWorkList, customers] = await Promise.all([
    prisma.business.count({ where: { searchId: id } }),
    prisma.business.count({ where: { searchId: id, inWorkList: true } }),
    prisma.customer.count({ where: { business: { searchId: id } } }),
  ]);

  return NextResponse.json({
    search,
    impact: { businesses, inWorkList, customers, queryCount: search.queryCount },
  });
}

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

// Segmenti sil — bağlı firmalar da silinir (Cascade).
// Kasıtlı: firmalar kalsaydı placeId dedup'ı yüzünden aynı bölge yeniden
// taranınca bir daha çıkmazlardı. UI silmeden önce etki özetini gösterir.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const deleted = await prisma.business.count({ where: { searchId: id } });
  await prisma.search.delete({ where: { id } });
  return NextResponse.json({ ok: true, deletedBusinesses: deleted });
}
