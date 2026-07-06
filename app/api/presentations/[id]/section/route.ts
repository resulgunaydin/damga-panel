import { NextResponse } from "next/server";
import { hasRealWebsite } from "@/lib/website";
import { prisma } from "@/lib/prisma";
import { buildContext, draftSection, type SectionKey } from "@/lib/presentation";
import { opportunitiesFromSignals } from "@/lib/opportunity";
import type { Signal } from "@/lib/scoring";

type Ctx = { params: Promise<{ id: string }> };
type AnalysisJson = { summary?: string };
type CompJson = { explanation?: string };

// Tek bölümü yeniden üret (Bölüm 4.8 — "yeniden üret").
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const key = body.key as SectionKey;
  if (!key) return NextResponse.json({ error: "Bölüm anahtarı gerekli." }, { status: 400 });

  const presentation = await prisma.presentation.findUnique({ where: { id } });
  if (!presentation) {
    return NextResponse.json({ error: "Sunum bulunamadı." }, { status: 404 });
  }
  const business = await prisma.business.findUnique({
    where: { id: presentation.businessId },
    include: {
      search: { select: { city: true, sector: true } },
      analyses: { orderBy: { generatedAt: "desc" } },
    },
  });
  if (!business) return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });

  const latest = new Map<string, (typeof business.analyses)[number]>();
  for (const a of business.analyses) if (!latest.has(a.kind)) latest.set(a.kind, a);
  const breakdown = business.scoreBreakdown as { signals?: Signal[] } | null;

  const context = buildContext({
    name: business.name,
    sector: business.search?.sector ?? null,
    city: business.search?.city ?? null,
    hasWebsite: hasRealWebsite(business.website),
    websiteSummary: (latest.get("WEBSITE")?.result as AnalysisJson | undefined)?.summary ?? null,
    gbpSummary: (latest.get("GOOGLE_BUSINESS")?.result as AnalysisJson | undefined)?.summary ?? null,
    competitorText: (latest.get("COMPETITOR")?.result as CompJson | undefined)?.explanation ?? null,
    opportunities: opportunitiesFromSignals(breakdown?.signals).map((o) => o.area),
  });

  try {
    const text = await draftSection(key, context);
    const content = { ...(presentation.content as Record<string, string>), [key]: text };
    const updated = await prisma.presentation.update({
      where: { id },
      data: { content: content as object },
    });
    return NextResponse.json({ presentation: updated, text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Üretilemedi." },
      { status: 500 },
    );
  }
}
