import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderHtml, type SectionConfig } from "@/lib/presentation";
import { renderPdf } from "@/lib/browser";

type Ctx = { params: Promise<{ id: string }> };

// Sunumu PDF olarak üretir (Playwright HTML→PDF, Bölüm 4.8).
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const presentation = await prisma.presentation.findUnique({
    where: { id },
    include: { business: { select: { name: true } } },
  });
  if (!presentation) {
    return NextResponse.json({ error: "Sunum bulunamadı." }, { status: 404 });
  }
  const html = renderHtml({
    firmName: presentation.business.name,
    sections: presentation.sectionConfig as unknown as SectionConfig[],
    content: presentation.content as Record<string, string>,
  });
  const pdf = await renderPdf(html);
  await prisma.presentation.update({
    where: { id },
    data: { status: "URETILDI" },
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sunum.pdf"`,
    },
  });
}
