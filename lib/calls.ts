// Telefon araması kaydı + sonuç → durum geçişi (telefon pivotu).
// Tek giriş: recordCall — Call satırı açar, firma durumunu/kuyruğunu günceller, deftere yazar.

import { prisma } from "@/lib/prisma";
import { logActivity, stageForStatus, STATUS_LABEL } from "@/lib/business";
import type {
  BusinessStatus,
  CallOutcome,
  FunnelStage,
  LossReason,
} from "@/lib/generated/prisma/enums";

export const CALL_OUTCOMES: CallOutcome[] = [
  "ULASILDI_KABUL",
  "ULASILDI_RET",
  "ULASILAMADI",
  "TEKRAR_ARA",
];

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  ULASILDI_KABUL: "Ulaşıldı — sunum istiyor",
  ULASILDI_RET: "Ulaşıldı — ilgilenmiyor",
  ULASILAMADI: "Ulaşılamadı",
  TEKRAR_ARA: "Sonra tekrar ara",
};

export type RecordCallInput = {
  businessId: string;
  outcome: CallOutcome;
  note?: string | null;
  nextCallAt?: Date | null; // TEKRAR_ARA için
  lossReason?: LossReason | null; // ULASILDI_RET için
};

// Aramayı kaydeder, sonuca göre firma durumunu ve arama kuyruğunu günceller.
export async function recordCall(input: RecordCallInput) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { status: true },
  });
  if (!business) throw new Error("Firma bulunamadı.");

  const nextCallAt = input.outcome === "TEKRAR_ARA" ? (input.nextCallAt ?? null) : null;

  // Sonuç → yeni firma durumu + kuyruk davranışı.
  const update: {
    status?: BusinessStatus;
    stage?: FunnelStage;
    lossReason?: LossReason | null;
    inCallList: boolean;
    nextCallAt: Date | null;
  } = { inCallList: false, nextCallAt };

  switch (input.outcome) {
    case "ULASILDI_KABUL":
      update.status = "SUNUM_GONDERILDI";
      break;
    case "ULASILDI_RET":
      update.status = "KAYIP";
      update.lossReason = input.lossReason ?? "ILGISIZ";
      break;
    case "ULASILAMADI":
      update.status = "ARANDI_ULASILAMADI";
      break;
    case "TEKRAR_ARA":
      // Durum korunur; nextCallAt ile kuyruğa geri döner.
      break;
  }
  if (update.status) update.stage = stageForStatus(update.status);

  await prisma.$transaction([
    prisma.call.create({
      data: {
        businessId: input.businessId,
        outcome: input.outcome,
        note: input.note?.trim() || null,
        nextCallAt,
      },
    }),
    prisma.business.update({ where: { id: input.businessId }, data: update }),
  ]);

  const parts = [`Arama: ${CALL_OUTCOME_LABEL[input.outcome]}`];
  if (update.status) parts.push(`→ ${STATUS_LABEL[update.status]}`);
  if (nextCallAt) parts.push(`(tekrar: ${nextCallAt.toLocaleDateString("tr-TR")})`);
  if (input.note?.trim()) parts.push(`— ${input.note.trim()}`);
  await logActivity(input.businessId, parts.join(" "));

  return { status: update.status ?? business.status };
}
