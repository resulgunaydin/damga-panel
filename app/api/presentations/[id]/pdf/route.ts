import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderHtml, type SectionConfig } from "@/lib/presentation";
import { getBranding } from "@/lib/branding";
import { renderPdf } from "@/lib/browser";

type Ctx = { params: Promise<{ id: string }> };

// Sunumu PDF olarak üretir (Playwright HTML→PDF, Bölüm 4.8).
// ?preview=1 → sadece render; durum "URETILDI"e çekilmez, tarayıcıda gömülü gösterim için inline.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const isPreview = new URL(req.url).searchParams.get("preview") === "1";
  const presentation = await prisma.presentation.findUnique({
    where: { id },
    include: { business: { select: { name: true } } },
  });
  if (!presentation) {
    return NextResponse.json({ error: "Sunum bulunamadı." }, { status: 404 });
  }
  const branding = await getBranding();
  const html = renderHtml({
    firmName: presentation.business.name,
    sections: presentation.sectionConfig as unknown as SectionConfig[],
    content: presentation.content as Record<string, string>,
    themeId: presentation.themeId,
    branding,
  });
  const pdf = await renderPdf(html);
  if (!isPreview) {
    await prisma.presentation.update({
      where: { id },
      data: { status: "URETILDI" },
    });
  }
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": isPreview
        ? `inline; filename="onizleme.pdf"`
        : `attachment; filename="sunum.pdf"`,
    },
  });
}
