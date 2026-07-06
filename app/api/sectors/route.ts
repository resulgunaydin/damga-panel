import { NextResponse } from "next/server";
import { getSectors, setSectors, type SectorItem } from "@/lib/sectors";

export async function GET() {
  const sectors = await getSectors();
  return NextResponse.json({ sectors });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.sectors)) {
    return NextResponse.json({ error: "Geçersiz liste." }, { status: 400 });
  }
  await setSectors(body.sectors as SectorItem[]);
  const sectors = await getSectors();
  return NextResponse.json({ sectors });
}
