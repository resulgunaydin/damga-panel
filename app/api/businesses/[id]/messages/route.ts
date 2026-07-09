import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/ai";
import { getCachedOrCompute } from "@/lib/cache";
import { getBranding } from "@/lib/branding";
import { logActivity } from "@/lib/business";
import type { MessageKind } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

// Arama script'i sistem yönergesi (telefon pivotu): firmayı TELEFONLA ararken kullanılacak
// kısa açılış konuşması + olası itirazlara sözlü cevap notları. Satış değil, sunum göndermeye izin alma.
function aramaScriptSystem(agency: string): string {
  return `Sen, dijital hizmetler veren "${agency}" firması adına saha ekibine, bir firmayı TELEFONLA ararken kullanacağı kısa bir konuşma metni (script) hazırlıyorsun.
Amaç: kısa ve doğal bir açılışla firmanın ilgisini ölçmek ve "size hazırladığımız kısa bir sunumu göndersek inceler misiniz?" iznini almak. Telefonda SATIŞ YAPMA, FİYAT KONUŞMA, uzun konuşturma.

Ses ve üslup:
- "${agency}" adına, KURUMSAL ama sıcak ve öz. Telefonda karşı taraf meşguldür; kısa cümleler.
- Türkçe. Teknik terim (SEO, SSL, responsive) KULLANMA; günlük dille anlat.
- Konuşuluyormuş gibi yaz; okunacak bir paragraf değil, telefonda söylenecek doğal cümleler.

Çıktı biçimi (aynen bu başlıklarla, sade metin, madde işareti olarak "-" kullan):
AÇILIŞ:
- Selam + kendini "${agency}" olarak tanıtma + aradığın kişiye 1 cümlede neden aradığın (önceden incelediğini doğal hissettir).
NEDEN ARIYORUM:
- Verilen gözlemlerden EN FAZLA İKİ tanesini sade dille, tek cümleyle söyle; bunun onlara ne kaybettirdiğini kısaca bağla. Olumlu tespit verildiyse önce onunla başla.
KABUL SORUSU:
- "Hazırladığımız kısa sunumu WhatsApp'tan göndersek inceler misiniz?" fikrini nazik ve cevabı kolay bir soruyla sor.
OLASI İTİRAZLAR:
- 3 madde: sık itiraz (ör. "vaktim yok", "ilgilenmiyorum", "zaten sitemiz var") → her birine tek cümlelik sakin, ısrarcı olmayan sözlü cevap.

Kurallar: SADECE verilen gözlemlere dayan, uydurma. Fiyat/paket/rakam verme. Sadece script'i yaz; ekstra açıklama ekleme.`;
}

// Kaba eleme sinyali → müşteriye dönük, jargonsuz gözlem cümlesi.
type Signal = { key: string; label: string; points: number; detected: boolean };
const GOZLEM: Record<string, string> = {
  "site-yok": "İnternetten sizi arayan biri, ulaşabileceği bir web sitenizin olmadığını görüyor.",
  "site-acilmiyor": "Web siteniz şu anda ziyaretçilere açılmıyor gibi görünüyor.",
  "ssl-yok": "Web sitenize girenlere tarayıcı 'güvenli değil' uyarısı gösteriyor olabilir.",
  "mobil-bozuk":
    "Web siteniz telefonda düzgün görüntülenmiyor; oysa müşterilerin çoğu size telefondan bakıyor.",
  "az-yorum": "Google'da işletmenizin, hak ettiğinden daha az sayıda değerlendirmesi var.",
  "dusuk-puan":
    "Google puanınız, verdiğiniz hizmetin gerçekte olduğundan daha zayıf görünmesine yol açıyor olabilir.",
};

// scoreBreakdown.signals'tan en güçlü (en yüksek puanlı) 2 gerçek gözlemi seç (dürüstlük: yalnız detected).
function observationsFromBreakdown(scoreBreakdown: unknown): string[] {
  const signals = (scoreBreakdown as { signals?: Signal[] } | null)?.signals;
  if (!Array.isArray(signals)) return [];
  return signals
    .filter((s) => s.detected && GOZLEM[s.key])
    .sort((a, b) => b.points - a.points)
    .slice(0, 2)
    .map((s) => GOZLEM[s.key]);
}

// Yüksek puan → "işini iyi yapıyor" olumlu tespiti (araştırılmış + saygılı his).
function positiveNote(rating: number | null, reviews: number | null): string | null {
  if (rating == null || rating < 4.5) return null;
  return reviews != null && reviews > 0
    ? `Google puanınız yüksek (${rating.toFixed(1)}), müşterileriniz sizden memnun görünüyor.`
    : `Google puanınız yüksek (${rating.toFixed(1)}), işinizi iyi yaptığınız belli.`;
}

function buildPrompt(input: {
  agency: string;
  name: string;
  sector: string | null;
  city: string | null;
  positive: string | null;
  observations: string[];
}): string {
  const lines = [
    `"${input.agency}" adına aşağıdaki firmayı telefonla ararken kullanılacak arama script'ini yaz.`,
    ``,
    `Firma: ${input.name}`,
  ];
  if (input.sector) lines.push(`Sektör: ${input.sector}`);
  if (input.city) lines.push(`Şehir: ${input.city}`);
  lines.push(``, `İncelemede öne çıkanlar:`);
  if (input.positive) lines.push(`- Olumlu: ${input.positive}`);
  for (const o of input.observations) lines.push(`- Eksik: ${o}`);
  if (!input.positive && input.observations.length === 0) {
    lines.push(
      `- Belirgin bir eksik tespit edilemedi. Bu durumda eksik UYDURMA; firmanın sektörüne ve işine dair sıcak ama kurumsal bir tanışma mesajı yaz.`,
    );
  }
  return lines.join("\n");
}

// Firmaya ait mesajları döner.
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const messages = await prisma.message.findMany({
    where: { businessId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ messages });
}

// Firma için mesaj üretir (varsayılan ARAMA_SCRIPT). Cache: varsa üretmez, regenerate ile yeniden.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const kind: MessageKind = body.kind ?? "ARAMA_SCRIPT";
  const regenerate = body.regenerate === true;

  const business = await prisma.business.findUnique({
    where: { id },
    include: { search: { select: { city: true, sector: true } } },
  });
  if (!business) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }

  // Ajans adı (kurumsal kimlik) — marka ayarından, yoksa "Damga Bilişim".
  const branding = await getBranding();
  const agency = (branding.agencyName && branding.agencyName.trim()) || "Damga Bilişim";

  // Cache (Bölüm 5): aynı türde mesaj varsa yeniden üretme; regenerate ile tazele.
  try {
    const { data: message, cached } = await getCachedOrCompute({
      force: regenerate,
      find: () =>
        prisma.message.findFirst({
          where: { businessId: id, kind },
          orderBy: { createdAt: "desc" },
        }),
      compute: async () => {
        const result = await generateText({
          system: aramaScriptSystem(agency),
          prompt: buildPrompt({
            agency,
            name: business.name,
            sector: business.search?.sector ?? null,
            city: business.search?.city ?? null,
            positive: positiveNote(business.googleRating, business.googleReviews),
            observations: observationsFromBreakdown(business.scoreBreakdown),
          }),
          tier: "simple",
          maxTokens: kind === "ARAMA_SCRIPT" ? 600 : 350,
        });
        const msg = await prisma.message.create({
          data: {
            businessId: id,
            kind,
            content: result.text,
            model: `${result.provider}:${result.model}`,
          },
        });
        // Arama script'i üretmek "aramaya hazır" sinyalidir: YENI → ARAMAYA_HAZIR.
        if (kind === "ARAMA_SCRIPT" && business.status === "YENI") {
          await prisma.business.update({
            where: { id },
            data: { status: "ARAMAYA_HAZIR", stage: "ELEME" },
          });
        }
        const etiket = kind === "ARAMA_SCRIPT" ? "Arama script'i" : "Mesaj";
        await logActivity(id, `${etiket} üretildi (${result.provider}).`);
        return msg;
      },
    });
    return NextResponse.json({ message, cached });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Üretim başarısız." },
      { status: 500 },
    );
  }
}
