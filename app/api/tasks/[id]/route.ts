import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// Görevi tamamla veya ertele.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.action === "complete") {
    const task = await prisma.task.update({
      where: { id },
      data: { status: "TAMAM", completedAt: new Date() },
    });
    return NextResponse.json({ task });
  }
  if (body.action === "snooze") {
    const days = Number(body.days) > 0 ? Number(body.days) : 1;
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const task = await prisma.task.update({
      where: { id },
      data: { status: "ERTELENDI", snoozedUntil: until },
    });
    return NextResponse.json({ task });
  }
  return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
