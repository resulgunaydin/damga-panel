// Sektör Kataloğu — kullanıcının kendi sektörleri + varsayılan anahtar kelimeleri.
// Şema değişikliği gerektirmemek için AppSetting("sectors")'ta JSON olarak tutulur.

import { prisma } from "@/lib/prisma";

export type SectorItem = { name: string; keywords: string[] };

const DEFAULTS: SectorItem[] = [
  { name: "diş kliniği", keywords: ["diş hekimi", "ağız ve diş sağlığı", "ortodonti", "implant"] },
  { name: "güzellik salonu", keywords: ["güzellik merkezi", "cilt bakımı", "epilasyon"] },
  { name: "kuaför", keywords: ["kuaför", "berber", "saç tasarım"] },
  { name: "avukat", keywords: ["hukuk bürosu", "avukatlık ofisi"] },
  { name: "emlak ofisi", keywords: ["emlak", "gayrimenkul danışmanı"] },
  { name: "restoran", keywords: ["restoran", "lokanta", "cafe"] },
  { name: "oto servis", keywords: ["oto servis", "oto tamir", "lastikçi"] },
  { name: "veteriner", keywords: ["veteriner kliniği", "hayvan hastanesi"] },
];

export async function getSectors(): Promise<SectorItem[]> {
  const row = await prisma.appSetting.findUnique({ where: { key: "sectors" } });
  const v = row?.value as SectorItem[] | null;
  return Array.isArray(v) && v.length > 0 ? v : DEFAULTS;
}

export async function setSectors(list: SectorItem[]): Promise<void> {
  const clean = list
    .map((s) => ({
      name: String(s.name ?? "").trim(),
      keywords: Array.isArray(s.keywords)
        ? s.keywords.map((k) => String(k).trim()).filter(Boolean)
        : [],
    }))
    .filter((s) => s.name);
  await prisma.appSetting.upsert({
    where: { key: "sectors" },
    create: { key: "sectors", value: clean },
    update: { value: clean },
  });
}
