import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Toplu firma işlemleri (filtreye göre çoklu seçim):
//  - action "addToWork"  → seçilenleri çalışma listesine ekle (inWorkList=true)
//  - action "removeFromWork" → çalışma listesinden çıkar (inWorkList=false)
//  - action "delete"     → KALICI (hard) sil (soft delete/kara listeden farklı; kayıtlar tümden gider)
// Not: kalıcı silme, dedup'ı da temizler → aynı firma sonraki taramada tekrar çekilebilir.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? (body.ids as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const action = String(body.action ?? "");

  if (ids.length === 0) {
    return NextResponse.json({ error: "Firma seçilmedi." }, { status: 400 });
  }

  if (action === "delete") {
    // İlişkili kayıtlar şemada onDelete: Cascade — arama/randevu/mesaj/analiz vb. birlikte silinir.
    const { count } = await prisma.business.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, action, count });
  }

  if (action === "addToWork" || action === "removeFromWork") {
    const inWorkList = action === "addToWork";
    // Kara listedekilere dokunma; yalnızca gerçekten değişecek olanları güncelle.
    const targets = await prisma.business.findMany({
      where: { id: { in: ids }, blacklisted: false, inWorkList: !inWorkList },
      select: { id: true },
    });
    const targetIds = targets.map((t) => t.id);
    if (targetIds.length === 0) {
      return NextResponse.json({ ok: true, action, count: 0 });
    }
    await prisma.business.updateMany({
      where: { id: { in: targetIds } },
      data: { inWorkList },
    });
    // Defter kaydı (her firma için) — huni geçmişi dürüst kalsın.
    await prisma.activity.createMany({
      data: targetIds.map((businessId) => ({
        businessId,
        kind: "SISTEM" as const,
        message: inWorkList
          ? "Toplu işlemle çalışma listesine eklendi."
          : "Toplu işlemle çalışma listesinden çıkarıldı.",
      })),
    });
    return NextResponse.json({ ok: true, action, count: targetIds.length });
  }

  return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
}
