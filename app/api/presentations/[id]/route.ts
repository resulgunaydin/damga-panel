import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// Sunumu güncelle: bölüm konfigürasyonu (aç/kapat/sıra), içerik, format.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.sectionConfig) data.sectionConfig = body.sectionConfig;
  if (body.content) data.content = body.content;
  if (body.format === "HTML" || body.format === "PDF" || body.format === "IKISI") {
    data.format = body.format;
  }
  if (body.status === "TASLAK" || body.status === "URETILDI") data.status = body.status;

  const presentation = await prisma.presentation.update({ where: { id }, data });
  return NextResponse.json({ presentation });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.presentation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
