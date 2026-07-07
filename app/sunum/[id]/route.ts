import { prisma } from "@/lib/prisma";
import { renderHtml, type SectionConfig } from "@/lib/presentation";
import { getBranding } from "@/lib/branding";

type Ctx = { params: Promise<{ id: string }> };

// Genel sunum önizlemesi (HTML link). Açılınca openedAt işaretlenir (Bölüm 4.8).
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const presentation = await prisma.presentation.findUnique({
    where: { id },
    include: { business: { select: { name: true } } },
  });
  if (!presentation) {
    return new Response("Sunum bulunamadı.", { status: 404 });
  }

  const url = new URL(req.url);
  const isPreview = url.searchParams.get("preview") === "1";
  const themeOverride = url.searchParams.get("theme");

  // Açılma takibi (ilk açılışta) — kendi önizlememizde işaretleme.
  if (!presentation.openedAt && !isPreview) {
    await prisma.presentation.update({
      where: { id },
      data: { openedAt: new Date() },
    });
  }
  const branding = await getBranding();
  const html = renderHtml({
    firmName: presentation.business.name,
    sections: presentation.sectionConfig as unknown as SectionConfig[],
    content: presentation.content as Record<string, string>,
    themeId: themeOverride ?? presentation.themeId ?? branding.defaultThemeId,
    branding,
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
