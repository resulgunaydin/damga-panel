import { NextResponse } from "next/server";
import { getScoringConfig, saveScoringConfig, type ScoringConfig } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getScoringConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<ScoringConfig>;
  const config = await saveScoringConfig(body);
  return NextResponse.json({ config });
}
