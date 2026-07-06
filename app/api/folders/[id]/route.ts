import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// Klasörü yeniden adlandır veya başka klasörün altına taşı.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { name?: string; parentId?: string | null } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Klasör adı boş olamaz." }, { status: 400 });
    }
    data.name = name;
  }
  if ("parentId" in body) {
    if (body.parentId === id) {
      return NextResponse.json(
        { error: "Klasör kendi altına taşınamaz." },
        { status: 400 },
      );
    }
    data.parentId = body.parentId ?? null;
  }

  const folder = await prisma.folder.update({ where: { id }, data });
  return NextResponse.json(folder);
}

// Klasörü sil. Alt klasörler de silinir; içindeki segmentler klasörsüz kalır (silinmez).
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
