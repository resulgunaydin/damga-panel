// Firma durum/aşama iş kuralları + aktivite defteri (Bölüm 3.2, 3.4, 4.9).

import { prisma } from "@/lib/prisma";
import type {
  ActivityKind,
  BusinessStatus,
  FunnelStage,
  LossReason,
} from "@/lib/generated/prisma/enums";

export const BUSINESS_STATUSES: BusinessStatus[] = [
  "YENI",
  "ARAMAYA_HAZIR",
  "ARANDI_ULASILAMADI",
  "SUNUM_GONDERILDI",
  "RANDEVU",
  "TEKLIF_YAPILDI",
  "KAYIP",
  "IS_DEVAM",
  "IS_BITTI",
];

export const LOSS_REASONS: LossReason[] = [
  "ILGISIZ",
  "FIYAT",
  "RAKIBE_GITTI",
  "IHTIYAC_YOK",
  "ULASILAMADI",
];

export const STATUS_LABEL: Record<BusinessStatus, string> = {
  YENI: "Yeni",
  ARAMAYA_HAZIR: "Aramaya hazır",
  ARANDI_ULASILAMADI: "Arandı — ulaşılamadı",
  SUNUM_GONDERILDI: "Sunum gönderildi",
  RANDEVU: "Randevu ayarlandı",
  TEKLIF_YAPILDI: "Teklif yapıldı",
  KAYIP: "Kayıp",
  IS_DEVAM: "İş devam ediyor",
  IS_BITTI: "İş bitti",
};

export const LOSS_LABEL: Record<LossReason, string> = {
  ILGISIZ: "İlgisiz",
  FIYAT: "Fiyat",
  RAKIBE_GITTI: "Rakibe gitti",
  IHTIYAC_YOK: "İhtiyaç yok",
  ULASILAMADI: "Ulaşılamadı",
};

// Durumdan huni aşamasını türetir (telefon pivotu).
export function stageForStatus(status: BusinessStatus): FunnelStage {
  switch (status) {
    case "SUNUM_GONDERILDI":
    case "RANDEVU":
    case "TEKLIF_YAPILDI":
    case "KAYIP":
      return "POTANSIYEL";
    case "IS_DEVAM":
    case "IS_BITTI":
      return "MUSTERI";
    default:
      // YENI, ARAMAYA_HAZIR, ARANDI_ULASILAMADI
      return "ELEME";
  }
}

// Firma defterine kayıt düşer (Bölüm 4.9).
export async function logActivity(
  businessId: string,
  message: string,
  kind: ActivityKind = "SISTEM",
): Promise<void> {
  await prisma.activity.create({ data: { businessId, kind, message } });
}
