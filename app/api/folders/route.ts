import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Yeni klasör oluştur (arama yapılmadan da oluşturulabilir — Bölüm 4.1).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Klasör adı gerekli." }, { status: 400 });
  }
  const folder = await prisma.folder.create({
    data: { name, parentId: body.parentId ?? null },
  });
  return NextResponse.json(folder, { status: 201 });
}
