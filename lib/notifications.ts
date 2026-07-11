// Anlık bildirim / hatırlatma motoru.
// Randevular (yaklaşan / zamanı gelen) ve vadesi gelmiş görevler için canlı bildirim
// üretir. İstemci (bildirim zili) bunu periyodik yoklar; ayarlar AppSetting'te saklanır.

import { prisma } from "@/lib/prisma";

export type NotificationSettings = {
  enabled: boolean; // bildirimler açık mı
  appointmentLeadMinutes: number; // randevudan kaç dk önce "yaklaşıyor" uyarısı
  browserNotifications: boolean; // masaüstü (tarayıcı) bildirimi göster
  sound: boolean; // yeni bildirimde ses çal
  taskReminders: boolean; // vadesi gelen görevleri de bildir
};

export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  enabled: true,
  appointmentLeadMinutes: 60,
  browserNotifications: true,
  sound: false,
  taskReminders: true,
};

const KEY = "notifications";

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
  const v = (row?.value ?? {}) as Partial<NotificationSettings>;
  return {
    enabled: v.enabled ?? NOTIFICATION_DEFAULTS.enabled,
    appointmentLeadMinutes:
      typeof v.appointmentLeadMinutes === "number"
        ? v.appointmentLeadMinutes
        : NOTIFICATION_DEFAULTS.appointmentLeadMinutes,
    browserNotifications: v.browserNotifications ?? NOTIFICATION_DEFAULTS.browserNotifications,
    sound: v.sound ?? NOTIFICATION_DEFAULTS.sound,
    taskReminders: v.taskReminders ?? NOTIFICATION_DEFAULTS.taskReminders,
  };
}

export async function saveNotificationSettings(
  patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const next: NotificationSettings = {
    enabled: typeof patch.enabled === "boolean" ? patch.enabled : current.enabled,
    appointmentLeadMinutes:
      typeof patch.appointmentLeadMinutes === "number" && patch.appointmentLeadMinutes >= 0
        ? Math.min(patch.appointmentLeadMinutes, 24 * 60)
        : current.appointmentLeadMinutes,
    browserNotifications:
      typeof patch.browserNotifications === "boolean"
        ? patch.browserNotifications
        : current.browserNotifications,
    sound: typeof patch.sound === "boolean" ? patch.sound : current.sound,
    taskReminders:
      typeof patch.taskReminders === "boolean" ? patch.taskReminders : current.taskReminders,
  };
  await prisma.appSetting.upsert({
    where: { key: KEY },
    update: { value: next },
    create: { key: KEY, value: next },
  });
  return next;
}

export type AppNotification = {
  id: string; // kararlı kimlik (aynı olay tekrar bildirilmesin diye istemci bunu izler)
  type: "appointment" | "task";
  severity: "due" | "soon"; // due = zamanı geldi/geçti, soon = yaklaşıyor
  title: string;
  message: string;
  at: string; // ilgili zaman (ISO)
  href: string; // tıklayınca gidilecek yer
  read: boolean; // kullanıcı okundu işaretledi mi
};

// ── Okundu durumu (kalıcı) ───────────────────────────────────────────────────
// Bildirimler durumdan türediği için "okundu" bilgisini id→zaman eşlemesi olarak
// AppSetting'te tutarız. 30 günden eski kayıtlar budanır (sınırsız büyümesin).
const READ_KEY = "notifications.read";
const READ_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getReadMap(): Promise<Record<string, string>> {
  const row = await prisma.appSetting.findUnique({ where: { key: READ_KEY } });
  const v = (row?.value ?? {}) as Record<string, string>;
  // Süresi geçmişleri ayıkla.
  const now = Date.now();
  const cleaned: Record<string, string> = {};
  for (const [id, iso] of Object.entries(v)) {
    if (now - new Date(iso).getTime() < READ_TTL_MS) cleaned[id] = iso;
  }
  return cleaned;
}

export async function markRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const map = await getReadMap();
  const nowIso = new Date().toISOString();
  for (const id of ids) map[id] = nowIso;
  await prisma.appSetting.upsert({
    where: { key: READ_KEY },
    update: { value: map },
    create: { key: READ_KEY, value: map },
  });
}

// O anki tüm bildirimleri okundu işaretle.
export async function markAllRead(): Promise<void> {
  const items = await buildNotifications();
  await markRead(items.map((n) => n.id));
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// O anki bildirimleri hesaplar (durumdan türetilir; kalıcı kayıt tutulmaz).
export async function buildNotifications(
  settings?: NotificationSettings,
): Promise<AppNotification[]> {
  const cfg = settings ?? (await getNotificationSettings());
  if (!cfg.enabled) return [];

  const now = Date.now();
  const lead = cfg.appointmentLeadMinutes * MIN;
  const out: Omit<AppNotification, "read">[] = [];

  // ── Randevular (yalnızca PLANLANDI) ──────────────────────────────────────
  // Yaklaşan: (now, now+lead] · Zamanı gelmiş/geçmiş: son 3 gün içinde now'a kadar.
  const windowStart = new Date(now - 3 * 24 * HOUR);
  const windowEnd = new Date(now + lead);
  const appts = await prisma.appointment.findMany({
    where: {
      status: "PLANLANDI",
      scheduledAt: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { scheduledAt: "asc" },
    include: { business: { select: { id: true, name: true } } },
  });

  for (const a of appts) {
    const t = a.scheduledAt.getTime();
    const name = a.business?.name ?? "Firma";
    const timeStr = a.scheduledAt.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const href = a.business ? `/firma/${a.business.id}` : "/randevular";
    if (t <= now) {
      out.push({
        id: `appt:${a.id}:due`,
        type: "appointment",
        severity: "due",
        title: "Randevu zamanı geldi",
        message: `${name} · ${timeStr}${a.location ? ` · ${a.location}` : ""}`,
        at: a.scheduledAt.toISOString(),
        href,
      });
    } else {
      const mins = Math.round((t - now) / MIN);
      const rel = mins >= 60 ? `${Math.round(mins / 60)} sa` : `${mins} dk`;
      out.push({
        id: `appt:${a.id}:soon`,
        type: "appointment",
        severity: "soon",
        title: `Randevu yaklaşıyor (${rel})`,
        message: `${name} · ${timeStr}${a.location ? ` · ${a.location}` : ""}`,
        at: a.scheduledAt.toISOString(),
        href,
      });
    }
  }

  // ── Görevler (vadesi gelmiş) ─────────────────────────────────────────────
  if (cfg.taskReminders) {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ status: "ACIK" }, { status: "ERTELENDI", snoozedUntil: { lte: new Date(now) } }],
        dueAt: { not: null, lte: new Date(now) },
      },
      orderBy: [{ dueAt: "asc" }],
      include: { business: { select: { id: true, name: true } } },
      take: 50,
    });
    for (const task of tasks) {
      out.push({
        id: `task:${task.id}`,
        type: "task",
        severity: "due",
        title: "Görev zamanı",
        message: task.title,
        at: (task.dueAt ?? task.createdAt).toISOString(),
        href: task.business ? `/firma/${task.business.id}` : "/gorevler",
      });
    }
  }

  // Okundu bayrağını uygula.
  const readMap = await getReadMap();
  return out.map((n) => ({ ...n, read: readMap[n.id] != null }));
}
