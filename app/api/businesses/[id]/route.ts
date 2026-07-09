import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BUSINESS_STATUSES,
  LOSS_REASONS,
  STATUS_LABEL,
  logActivity,
  stageForStatus,
} from "@/lib/business";
import type { BusinessStatus, LossReason } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

// Firmayı günceller: çalışma listesine ekle/çıkar, durum değiştir (+kayıp sebebi),
// kara liste. Durum değişince aşama türetilir ve deftere kayıt düşer (Bölüm 3.2/4.9).
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const current = await prisma.business.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }

  const data: {
    status?: BusinessStatus;
    stage?: ReturnType<typeof stageForStatus>;
    lossReason?: LossReason | null;
    inWorkList?: boolean;
    inCallList?: boolean;
    blacklisted?: boolean;
  } = {};
  const activities: string[] = [];

  if (typeof body.inWorkList === "boolean" && body.inWorkList !== current.inWorkList) {
    data.inWorkList = body.inWorkList;
    activities.push(
      body.inWorkList ? "Çalışma listesine eklendi." : "Çalışma listesinden çıkarıldı.",
    );
  }

  // "Bugün Aranacaklar" kuyruğu işareti (telefon pivotu) — defter kaydı gürültüsü yaratmaz.
  if (typeof body.inCallList === "boolean" && body.inCallList !== current.inCallList) {
    data.inCallList = body.inCallList;
  }

  if (typeof body.status === "string") {
    if (!BUSINESS_STATUSES.includes(body.status as BusinessStatus)) {
      return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
    }
    const status = body.status as BusinessStatus;
    if (status !== current.status) {
      data.status = status;
      data.stage = stageForStatus(status);
      activities.push(
        `Durum: ${STATUS_LABEL[current.status]} → ${STATUS_LABEL[status]}`,
      );
    }
    // Kayıp sebebi yalnızca KAYIP durumunda tutulur.
    if (status === "KAYIP") {
      if (body.lossReason && LOSS_REASONS.includes(body.lossReason as LossReason)) {
        data.lossReason = body.lossReason as LossReason;
      }
    } else {
      data.lossReason = null;
    }
  }

  if (typeof body.blacklisted === "boolean") {
    data.blacklisted = body.blacklisted;
    if (body.blacklisted) activities.push("Kara listeye alındı.");
  }

  const business = await prisma.business.update({ where: { id }, data });
  for (const message of activities) {
    await logActivity(id, message);
  }

  return NextResponse.json(business);
}
