import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity, stageForStatus } from "@/lib/business";

type Ctx = { params: Promise<{ id: string }> };

// Firmaya ait randevuları döner.
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const appointments = await prisma.appointment.findMany({
    where: { businessId: id },
    orderBy: { scheduledAt: "desc" },
  });
  return NextResponse.json({ appointments });
}

// Randevu oluşturur → durum RANDEVU, Google Takvim senkronu (varsa), hatırlatma görevi.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Geçerli bir randevu tarihi gerekli." }, { status: 400 });
  }
  const location = typeof body.location === "string" ? body.location.trim() || null : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  const business = await prisma.business.findUnique({
    where: { id },
    select: { name: true, status: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }

  const appointment = await prisma.appointment.create({
    data: { businessId: id, scheduledAt, location, note },
  });

  // Durum → RANDEVU (aşama Potansiyel).
  await prisma.business.update({
    where: { id },
    data: { status: "RANDEVU", stage: stageForStatus("RANDEVU"), inCallList: false },
  });

  // Bildirim/hatırlatma: Görev Kutusuna randevu günü için hatırlatma düşer (randevuya bağlı).
  await prisma.task.create({
    data: {
      title: `Randevu: ${business.name}`,
      kind: "DEADLINE",
      businessId: id,
      appointmentId: appointment.id,
      dueAt: scheduledAt,
    },
  });

  const tarih = scheduledAt.toLocaleString("tr-TR");
  await logActivity(id, `Randevu ayarlandı: ${tarih}${location ? ` · ${location}` : ""}`);

  return NextResponse.json({ appointment }, { status: 201 });
}
