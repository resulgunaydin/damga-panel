import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity, stageForStatus } from "@/lib/business";
import type { AppointmentStatus } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: AppointmentStatus[] = ["PLANLANDI", "YAPILDI", "IPTAL"];
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PLANLANDI: "planlandı",
  YAPILDI: "yapıldı",
  IPTAL: "iptal edildi",
};

// Firma hâlâ RANDEVU durumundaysa ve planlı başka randevusu kalmadıysa
// firmayı "Sunum gönderildi"ye geri al (huni dürüst kalsın).
async function revertIfNoPlanned(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { status: true },
  });
  if (business?.status !== "RANDEVU") return;
  const planned = await prisma.appointment.count({
    where: { businessId, status: "PLANLANDI" },
  });
  if (planned === 0) {
    await prisma.business.update({
      where: { id: businessId },
      data: { status: "SUNUM_GONDERILDI", stage: stageForStatus("SUNUM_GONDERILDI") },
    });
  }
}

// Randevuyu güncelle: durum (yapıldı/iptal), tarih (ertele), yer, not.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const current = await prisma.appointment.findUnique({
    where: { id },
    include: { business: { select: { id: true, name: true } } },
  });
  if (!current) {
    return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });
  }

  const data: {
    status?: AppointmentStatus;
    scheduledAt?: Date;
    location?: string | null;
    note?: string | null;
  } = {};
  const notes: string[] = [];

  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status as AppointmentStatus)) {
      return NextResponse.json({ error: "Geçersiz randevu durumu." }, { status: 400 });
    }
    const status = body.status as AppointmentStatus;
    if (status !== current.status) {
      data.status = status;
      notes.push(`Randevu ${STATUS_LABEL[status]}`);
    }
  }

  if (body.scheduledAt) {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih." }, { status: 400 });
    }
    if (d.getTime() !== current.scheduledAt.getTime()) {
      data.scheduledAt = d;
      notes.push(`Randevu ertelendi: ${d.toLocaleString("tr-TR")}`);
    }
  }

  if (typeof body.location === "string") data.location = body.location.trim() || null;
  if (typeof body.note === "string") data.note = body.note.trim() || null;

  const appointment = await prisma.appointment.update({ where: { id }, data });

  // Hatırlatma görevi: tarih değişince güncellenir; yapıldı/iptal olunca kapanır.
  if (data.scheduledAt) {
    await prisma.task.updateMany({
      where: { appointmentId: id, status: "ACIK" },
      data: { dueAt: data.scheduledAt },
    });
  }
  if (data.status === "YAPILDI" || data.status === "IPTAL") {
    await prisma.task.updateMany({
      where: { appointmentId: id, status: { not: "TAMAM" } },
      data: { status: "TAMAM", completedAt: new Date() },
    });
  }
  if (data.status === "PLANLANDI") {
    await prisma.task.updateMany({
      where: { appointmentId: id, status: "TAMAM" },
      data: { status: "ACIK", completedAt: null },
    });
  }

  if (data.status === "IPTAL") await revertIfNoPlanned(current.business.id);

  for (const n of notes) await logActivity(current.business.id, n);

  return NextResponse.json({ appointment });
}

// Randevuyu sil (bağlı hatırlatma görevi cascade ile gider).
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const current = await prisma.appointment.findUnique({
    where: { id },
    select: { businessId: true, scheduledAt: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });
  }

  await prisma.appointment.delete({ where: { id } });
  await revertIfNoPlanned(current.businessId);
  await logActivity(
    current.businessId,
    `Randevu silindi (${current.scheduledAt.toLocaleString("tr-TR")}).`,
  );

  return NextResponse.json({ ok: true });
}
