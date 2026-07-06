import { NextResponse } from "next/server";
import { runScanBatch } from "@/lib/discovery";

type Ctx = { params: Promise<{ id: string }> };

// Tek bir tarama grubu ("Devamını Gör") çalıştırır. Otomatik toplu tarama yok.
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY tanımlı değil (.env)." },
      { status: 400 },
    );
  }
  try {
    const summary = await runScanBatch(id);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tarama başarısız." },
      { status: 500 },
    );
  }
}
