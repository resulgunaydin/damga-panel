// Kota korkulukları + kullanım sayaçları (Bölüm 4.2, 4.12).
// Her pahalı dış çağrı ApiUsage'da gün bazında sayılır; tavan dolunca DUR ve sor.

import { prisma } from "@/lib/prisma";
import type { ApiUsageKind } from "@/lib/generated/prisma/enums";

export type Caps = {
  dailyCap: number; // günlük toplam sorgu tavanı
  perScanCap: number; // tek segment taraması başına sorgu tavanı
};

const DEFAULT_CAPS: Caps = { dailyCap: 1000, perScanCap: 120 };

// Bugünün tarihini (UTC gün başı) döner — ApiUsage.day için.
function today(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Ayarlardan tavanları oku; yoksa varsayılan.
export async function getCaps(): Promise<Caps> {
  const row = await prisma.appSetting.findUnique({ where: { key: "quota.caps" } });
  const v = (row?.value ?? {}) as Partial<Caps>;
  return {
    dailyCap: typeof v.dailyCap === "number" ? v.dailyCap : DEFAULT_CAPS.dailyCap,
    perScanCap: typeof v.perScanCap === "number" ? v.perScanCap : DEFAULT_CAPS.perScanCap,
  };
}

// Bir çağrı türünün bugünkü toplam sayısı.
export async function getDailyUsage(kind: ApiUsageKind): Promise<number> {
  const row = await prisma.apiUsage.findUnique({
    where: { kind_day: { kind, day: today() } },
  });
  return row?.count ?? 0;
}

// Bugünün tüm türler toplamı (kullanım göstergesi için).
export async function getTodayTotal(): Promise<number> {
  const rows = await prisma.apiUsage.findMany({ where: { day: today() } });
  return rows.reduce((sum, r) => sum + r.count, 0);
}

// Bir çağrıyı say (gün bazında artır).
export async function incrementUsage(kind: ApiUsageKind, by = 1): Promise<void> {
  const day = today();
  await prisma.apiUsage.upsert({
    where: { kind_day: { kind, day } },
    create: { kind, day, count: by },
    update: { count: { increment: by } },
  });
}
