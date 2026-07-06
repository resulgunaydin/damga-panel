import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Yeni arama segmenti oluştur (henüz çalıştırılmaz — tarama #4'te).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const city = String(body.city ?? "").trim();
  const sector = String(body.sector ?? "").trim();
  if (!city || !sector) {
    return NextResponse.json(
      { error: "Şehir ve sektör gerekli." },
      { status: 400 },
    );
  }
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.map((k: unknown) => String(k).trim()).filter(Boolean)
    : [];
  const district = String(body.district ?? "").trim() || null;

  // Çakışma koruması: aynı il·ilçe·sektör araması zaten varsa engelle.
  const existing = await prisma.search.findFirst({
    where: {
      city: { equals: city, mode: "insensitive" },
      sector: { equals: sector, mode: "insensitive" },
      district: district
        ? { equals: district, mode: "insensitive" }
        : null,
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu il · ilçe · sektör araması zaten var.", existingId: existing.id },
      { status: 409 },
    );
  }

  const search = await prisma.search.create({
    data: {
      city,
      district,
      sector,
      keywords,
      folderId: body.folderId ?? null,
    },
  });
  return NextResponse.json(search, { status: 201 });
}
