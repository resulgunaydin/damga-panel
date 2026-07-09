import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordCall, CALL_OUTCOMES } from "@/lib/calls";
import { LOSS_REASONS } from "@/lib/business";
import type { CallOutcome, LossReason } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

// Firmaya ait arama kayıtlarını döner (kronolojik).
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const calls = await prisma.call.findMany({
    where: { businessId: id },
    orderBy: { calledAt: "desc" },
  });
  return NextResponse.json({ calls });
}

// Arama sonucu kaydeder → firma durumunu/kuyruğunu günceller (Bölüm: telefon pivotu).
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const outcome = body.outcome as CallOutcome;
  if (!CALL_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "Geçersiz arama sonucu." }, { status: 400 });
  }

  // TEKRAR_ARA için tarih (opsiyonel); geçersizse yok say.
  let nextCallAt: Date | null = null;
  if (outcome === "TEKRAR_ARA" && body.nextCallAt) {
    const d = new Date(body.nextCallAt);
    if (!Number.isNaN(d.getTime())) nextCallAt = d;
  }

  // ULASILDI_RET için kayıp sebebi (opsiyonel; geçersizse recordCall varsayılanı kullanır).
  let lossReason: LossReason | null = null;
  if (outcome === "ULASILDI_RET" && body.lossReason && LOSS_REASONS.includes(body.lossReason)) {
    lossReason = body.lossReason as LossReason;
  }

  try {
    const { status } = await recordCall({
      businessId: id,
      outcome,
      note: typeof body.note === "string" ? body.note : null,
      nextCallAt,
      lossReason,
    });
    return NextResponse.json({ ok: true, status }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Arama kaydedilemedi." },
      { status: 500 },
    );
  }
}
