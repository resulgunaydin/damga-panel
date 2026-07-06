import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SECTIONS,
  buildContext,
  draftSection,
  type SectionConfig,
} from "@/lib/presentation";
import { opportunitiesFromSignals } from "@/lib/opportunity";
import { logActivity } from "@/lib/business";
import type { Signal } from "@/lib/scoring";

type Ctx = { params: Promise<{ id: string }> };

type AnalysisJson = { metrics?: { label: string; value: string }[]; summary?: string };
type CompJson = { rows?: { name: string; self?: boolean }[]; explanation?: string };

// Firma için sunum oluşturur: bölümleri AI ile taslaklar (Bölüm 4.8).
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      search: { select: { city: true, sector: true } },
      analyses: { orderBy: { generatedAt: "desc" } },
    },
  });
  if (!business) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }

  const latest = new Map<string, (typeof business.analyses)[number]>();
  for (const a of business.analyses) if (!latest.has(a.kind)) latest.set(a.kind, a);
  const website = latest.get("WEBSITE")?.result as AnalysisJson | undefined;
  const gbp = latest.get("GOOGLE_BUSINESS")?.result as AnalysisJson | undefined;
  const comp = latest.get("COMPETITOR")?.result as CompJson | undefined;

  const breakdown = business.scoreBreakdown as { signals?: Signal[] } | null;
  const opportunities = opportunitiesFromSignals(breakdown?.signals).map((o) => o.area);

  const context = buildContext({
    name: business.name,
    sector: business.search?.sector ?? null,
    city: business.search?.city ?? null,
    hasWebsite: !!business.website,
    websiteSummary: website?.summary ?? null,
    gbpSummary: gbp?.summary ?? null,
    competitorText: comp?.explanation ?? null,
    opportunities,
  });

  try {
    const sections = DEFAULT_SECTIONS;
    const enabled = sections.filter((s) => s.enabled);
    const drafts = await Promise.all(enabled.map((s) => draftSection(s.key, context)));
    const content: Record<string, string> = {};
    enabled.forEach((s, i) => {
      content[s.key] = drafts[i];
    });

    const presentation = await prisma.presentation.create({
      data: {
        businessId: id,
        sectionConfig: sections as object,
        content: content as object,
      },
    });
    await logActivity(id, "Sunum taslağı oluşturuldu.");
    return NextResponse.json({ presentation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sunum üretilemedi." },
      { status: 500 },
    );
  }
}

// Firmanın en güncel sunumunu döner.
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const presentation = await prisma.presentation.findFirst({
    where: { businessId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ presentation });
}
