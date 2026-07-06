import { NextResponse } from "next/server";
import { getCaps, setCaps } from "@/lib/quota";

// Sorgu tavanlarını güncelle (Bölüm 4.2/4.12).
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const current = await getCaps();
  const dailyCap = Number(body.dailyCap ?? current.dailyCap);
  const perScanCap = Number(body.perScanCap ?? current.perScanCap);

  if (
    !Number.isInteger(dailyCap) ||
    !Number.isInteger(perScanCap) ||
    dailyCap < 1 ||
    perScanCap < 1
  ) {
    return NextResponse.json(
      { error: "Tavanlar 1 veya daha büyük tam sayı olmalı." },
      { status: 400 },
    );
  }
  const caps = { dailyCap, perScanCap };
  await setCaps(caps);
  return NextResponse.json(caps);
}
