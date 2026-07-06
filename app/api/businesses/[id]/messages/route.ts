import { NextResponse } from "next/server";
import { hasRealWebsite } from "@/lib/website";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/ai";
import { getCachedOrCompute } from "@/lib/cache";
import { logActivity } from "@/lib/business";
import type { MessageKind } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

// Ön mesaj sistem yönergesi (Bölüm 4.4): nabız yoklama, satış değil.
const ON_MESAJ_SYSTEM = `Sen bir dijital ajansın satış temsilcisi adına kısa, samimi, kişisel WhatsApp ön mesajları yazıyorsun.
Amaç: firmanın canlı ve ilgili olup olmadığını anlamak — satış yapmak DEĞİL.
Kurallar:
- 2-3 kısa cümle, resmi değil sıcak bir dil, Türkçe.
- Firma adına doğal biçimde hitap et.
- Fiyat, paket ya da hizmet detayı VERME.
- Abartılı övgü ve bol emoji YOK (en fazla bir tane).
- Sonunda nazik, cevap almayı kolaylaştıran kısa bir soru olsun.
- Sadece mesaj metnini yaz; açıklama, tırnak veya başlık ekleme.`;

function buildPrompt(b: {
  name: string;
  sector: string | null;
  city: string | null;
  hasWebsite: boolean;
}): string {
  const parts = [`Firma adı: ${b.name}`];
  if (b.sector) parts.push(`Sektör: ${b.sector}`);
  if (b.city) parts.push(`Şehir: ${b.city}`);
  parts.push(`Web sitesi: ${b.hasWebsite ? "var" : "yok"}`);
  return `Aşağıdaki firmaya gönderilecek bir WhatsApp ön mesajı yaz:\n${parts.join("\n")}`;
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
          system: ON_MESAJ_SYSTEM,
          prompt: buildPrompt({
            name: business.name,
            sector: business.search?.sector ?? null,
            city: business.search?.city ?? null,
            hasWebsite: hasRealWebsite(business.website),
          }),
          tier: "simple",
          maxTokens: 300,
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
