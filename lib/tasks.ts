// Takip otomasyonu (Bölüm 4.10): kural bazlı sessizlik sayaçları → görev üretir.
// Süreler ayarlardan (AppSetting "followup.days") gelir; varsayılan 3/7/15.

import { prisma } from "@/lib/prisma";

export type FollowUpDays = { recall: number; sunum1: number; sunum2: number; sunum3: number };
const DEFAULTS: FollowUpDays = { recall: 2, sunum1: 3, sunum2: 7, sunum3: 15 };

export async function getFollowUpDays(): Promise<FollowUpDays> {
  const row = await prisma.appSetting.findUnique({ where: { key: "followup.days" } });
  const v = (row?.value ?? {}) as Partial<FollowUpDays> & { onMesaj?: number };
  return {
    // Eski ayar "onMesaj" alanını "recall" için geriye-uyumlu oku.
    recall: v.recall ?? v.onMesaj ?? DEFAULTS.recall,
    sunum1: v.sunum1 ?? DEFAULTS.sunum1,
    sunum2: v.sunum2 ?? DEFAULTS.sunum2,
    sunum3: v.sunum3 ?? DEFAULTS.sunum3,
  };
}

const DAY = 1000 * 60 * 60 * 24;
const daysSince = (d: Date) => (Date.now() - d.getTime()) / DAY;

// Sessizlik sayaçlarına göre takip görevleri + deadline hatırlatmaları üretir.
// Idempotent: aynı firma için açık bir takip görevi varsa yenisini eklemez.
export async function generateFollowUpTasks(): Promise<number> {
  const cfg = await getFollowUpDays();
  let created = 0;

  // Firma başına açık takip görevi var mı? (tekilleştirme)
  const openBiz = await prisma.task.findMany({
    where: { status: "ACIK", kind: "TAKIP", businessId: { not: null } },
    select: { businessId: true },
  });
  const hasOpen = new Set(openBiz.map((t) => t.businessId));

  const businesses = await prisma.business.findMany({
    where: {
      inWorkList: true,
      blacklisted: false,
      status: { in: ["ARANDI_ULASILAMADI", "SUNUM_GONDERILDI", "TEKLIF_YAPILDI"] },
    },
    select: { id: true, name: true, status: true, updatedAt: true },
  });

  for (const b of businesses) {
    if (hasOpen.has(b.id)) continue;
    const gun = daysSince(b.updatedAt);
    let title: string | null = null;

    if (b.status === "ARANDI_ULASILAMADI" && gun >= cfg.recall) {
      title = `Tekrar ara — ulaşılamamıştı (${b.name})`;
    } else if (b.status === "SUNUM_GONDERILDI") {
      if (gun >= cfg.sunum3) title = `Yeni kampanya öner (${b.name})`;
      else if (gun >= cfg.sunum2) title = `Teklifi hatırlat (${b.name})`;
      else if (gun >= cfg.sunum1) title = `İncelediler mi? Firmayı ara (${b.name})`;
    } else if (b.status === "TEKLIF_YAPILDI" && gun >= cfg.sunum2) {
      title = `Teklif takibi yap (${b.name})`;
    }

    if (title) {
      await prisma.task.create({
        data: { title, kind: "TAKIP", businessId: b.id, dueAt: new Date() },
      });
      created++;
    }
  }

  // Deadline hatırlatmaları (Gerçek Müşteri işleri)
  const openDeadline = await prisma.task.findMany({
    where: { status: "ACIK", kind: "DEADLINE", jobId: { not: null } },
    select: { jobId: true },
  });
  const hasDeadline = new Set(openDeadline.map((t) => t.jobId));

  const soon = new Date(Date.now() + 3 * DAY);
  const jobs = await prisma.job.findMany({
    where: { status: { not: "BITTI" }, deadline: { not: null, lte: soon } },
    select: { id: true, title: true, deadline: true, customer: { select: { businessId: true } } },
  });
  for (const j of jobs) {
    if (hasDeadline.has(j.id)) continue;
    await prisma.task.create({
      data: {
        title: `Termin yaklaşıyor: ${j.title}`,
        kind: "DEADLINE",
        jobId: j.id,
        businessId: j.customer.businessId,
        dueAt: j.deadline,
      },
    });
    created++;
  }

  return created;
}

// Görev Kutusu için aktif görevler (açık + ertelemesi dolmuş).
export async function listActiveTasks() {
  const now = new Date();
  return prisma.task.findMany({
    where: {
      OR: [
        { status: "ACIK" },
        { status: "ERTELENDI", snoozedUntil: { lte: now } },
      ],
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    include: { business: { select: { id: true, name: true } } },
  });
}
