import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { placeDetails } from "@/lib/places";
import { computeGbpAnalysis } from "@/lib/analysis";
import { generateText } from "@/lib/ai";
import { logActivity } from "@/lib/business";
import { getCaps, getDailyUsage, incrementUsage } from "@/lib/quota";
import type { AnalysisKind } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

// Derin analiz (elle tetiklenen pahalı adım — Bölüm 4.5).
// Şimdilik GOOGLE_BUSINESS; WEBSITE (#13) ve COMPETITOR (#15) eklenecek.
// Cache (Bölüm 5): analiz varsa yeniden üretmez; ?force=1 ile tazele.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const kind = (url.searchParams.get("kind") ?? "GOOGLE_BUSINESS") as AnalysisKind;

  const business = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      placeId: true,
      searchId: true,
      name: true,
      website: true,
      googleRating: true,
      googleReviews: true,
      coarseScore: true,
    },
  });
  if (!business) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }

  // Cache
  if (!force) {
    const existing = await prisma.analysis.findFirst({
      where: { businessId: id, kind },
      orderBy: { generatedAt: "desc" },
    });
    if (existing) return NextResponse.json({ analysis: existing, cached: true });
  }

  if (kind === "GOOGLE_BUSINESS") {
    if (!business.placeId) {
      return NextResponse.json(
        { error: "Bu firmanın Google kaydı (place_id) yok — GBP analizi yapılamaz." },
        { status: 400 },
      );
    }
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_PLACES_API_KEY tanımlı değil." },
        { status: 400 },
      );
    }
    // Kota korkuluğu
    const [caps, daily] = await Promise.all([getCaps(), getDailyUsage("PLACE_DETAILS")]);
    if (daily >= caps.dailyCap) {
      return NextResponse.json(
        { error: "Günlük sorgu tavanına ulaşıldı — durdum." },
        { status: 429 },
      );
    }
    try {
      const details = await placeDetails(business.placeId);
      await incrementUsage("PLACE_DETAILS");
      await incrementUsage("GBP_ANALYSIS");
      const result = computeGbpAnalysis(details);
      const analysis = await prisma.analysis.create({
        data: { businessId: id, kind, result: result as object },
      });
      await logActivity(id, "Google Business analizi yapıldı.");
      return NextResponse.json({ analysis, cached: false });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Analiz başarısız." },
        { status: 500 },
      );
    }
  }

  if (kind === "COMPETITOR") {
    if (!business.searchId) {
      return NextResponse.json(
        { error: "Rakip analizi için firma bir aramaya (şehir+sektör) bağlı olmalı." },
        { status: 400 },
      );
    }
    // Aynı arama (şehir+sektör) içindeki en üst rakipler — kendi keşif verimiz.
    const rivals = await prisma.business.findMany({
      where: { searchId: business.searchId, blacklisted: false, id: { not: id } },
      orderBy: [{ googleReviews: "desc" }, { googleRating: "desc" }],
      take: 3,
      select: {
        name: true,
        googleRating: true,
        googleReviews: true,
        website: true,
        coarseScore: true,
      },
    });
    if (rivals.length === 0) {
      return NextResponse.json(
        { error: "Aynı segmentte kıyaslanacak rakip firma bulunamadı." },
        { status: 400 },
      );
    }

    const rows = [
      {
        name: business.name,
        rating: business.googleRating,
        reviews: business.googleReviews,
        hasWebsite: !!business.website,
        score: business.coarseScore,
        self: true,
      },
      ...rivals.map((r) => ({
        name: r.name,
        rating: r.googleRating,
        reviews: r.googleReviews,
        hasWebsite: !!r.website,
        score: r.coarseScore,
        self: false,
      })),
    ];

    // AI açıklaması — sadece verilen verilere dayan, uydurma yok (dürüstlük).
    let explanation = "";
    try {
      const table = rows
        .map(
          (r) =>
            `${r.self ? "» " : "  "}${r.name} — puan ${r.rating ?? "?"}, yorum ${r.reviews ?? "?"}, site ${r.hasWebsite ? "var" : "yok"}`,
        )
        .join("\n");
      const out = await generateText({
        system:
          "Bir dijital ajansın satış analisti gibisin. SADECE verilen tabloya dayan, veri dışında hiçbir şey uydurma (rakibin reklam kullanıp kullanmadığı gibi bilinmeyenleri söyleme). 2-4 cümle, Türkçe. Hedef firmanın (») rakiplerine göre nerede geride olduğunu ve hangi hizmetin satılabileceğini açıkla.",
        prompt: `Hedef firma » ile işaretli.\n${table}\n\nHedef firma neden geride, ne satılabilir?`,
        tier: "simple",
        maxTokens: 400,
      });
      explanation = out.text;
      await incrementUsage("AI_ANALYSIS");
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "AI açıklaması üretilemedi." },
        { status: 500 },
      );
    }

    const analysis = await prisma.analysis.create({
      data: { businessId: id, kind, result: { rows, explanation } as object },
    });
    await logActivity(id, "Rakip analizi yapıldı.");
    return NextResponse.json({ analysis, cached: false });
  }

  return NextResponse.json(
    { error: `Bu analiz türü henüz desteklenmiyor: ${kind}` },
    { status: 400 },
  );
}
