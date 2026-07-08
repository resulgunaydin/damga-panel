import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/ai";
import { getCachedOrCompute } from "@/lib/cache";
import { getBranding } from "@/lib/branding";
import { logActivity } from "@/lib/business";
import type { MessageKind } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

// Ön mesaj sistem yönergesi (Bölüm 4.4): araştırılmış hissi veren nabız yoklama, satış değil.
// Ajans adına (kurumsal ama sıcak) yazılır; kaba eleme gözlemlerine dayanır (jargon yok).
function onMesajSystem(agency: string): string {
  return `Sen, dijital hizmetler veren "${agency}" firması adına, potansiyel bir müşteri firmaya gönderilecek ilk WhatsApp mesajını yazıyorsun.
Amaç: firmayı önceden incelediğini hissettirip kısa bir görüşmeye kapı aralamak — bu mesajda satış YAPMA, fiyat KONUŞMA.

Ses ve üslup:
- "${agency}" adına, KURUMSAL ama sıcak bir dille yaz. Bir firma temsilcisi konuşuyor; laubali, aşırı samimi ya da bir arkadaş gibi DEĞİL.
- Mesajın doğal bir yerinde kendini "${agency}" olarak belli et; firmayı önceden incelediğin doğal biçimde hissedilsin ("...incelerken fark ettik" gibi), ama "sizi araştırdık" diye zorlama.
- Türkçe, 3-4 kısa cümle. Çoğu insan teknik terim anlamaz: SEO, SSL, viewport, responsive gibi jargon KULLANMA; her şeyi günlük dille anlat.

İçerik kuralları:
- SADECE sana verilen gözlemlere dayan; veri dışında hiçbir şey uydurma.
- Verildiyse önce olumlu bir tespitle başla (işini iyi yaptıklarını hissettir), sonra EN FAZLA İKİ eksiği nazikçe söyle ve bunun onlara ne kaybettirdiğini tek sade cümleyle bağla. Firmayı detaya boğma.
- Fiyat, paket, hizmet listesi ya da rakam VERME.
- En fazla bir emoji; abartılı övgü yok.
- Sonunda kısa bir görüşme için nazik, cevabı kolaylaştıran bir soru olsun.
- Sadece mesaj metnini yaz; açıklama, tırnak veya başlık ekleme.`;
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
    `"${input.agency}" adına aşağıdaki firmaya gönderilecek ilk WhatsApp mesajını yaz.`,
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

// Firma için mesaj üretir (şimdilik ON_MESAJ). Cache: varsa üretmez, regenerate ile yeniden.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const kind: MessageKind = body.kind ?? "ON_MESAJ";
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
          system: onMesajSystem(agency),
          prompt: buildPrompt({
            agency,
            name: business.name,
            sector: business.search?.sector ?? null,
            city: business.search?.city ?? null,
            positive: positiveNote(business.googleRating, business.googleReviews),
            observations: observationsFromBreakdown(business.scoreBreakdown),
          }),
          tier: "simple",
          maxTokens: 350,
        });
        const msg = await prisma.message.create({
          data: {
            businessId: id,
            kind,
            content: result.text,
            model: `${result.provider}:${result.model}`,
          },
        });
        await logActivity(id, `Ön mesaj üretildi (${result.provider}).`);
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
