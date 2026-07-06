import { NextResponse } from "next/server";
import { getUsageSummary } from "@/lib/quota";

// Kullanım/bütçe özeti (Bölüm 4.12).
export async function GET() {
  const summary = await getUsageSummary();
  return NextResponse.json(summary);
}
