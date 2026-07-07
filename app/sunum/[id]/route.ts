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

  // Açılma takibi (ilk açılışta)
  if (!presentation.openedAt) {
    await prisma.presentation.update({
      where: { id },
      data: { openedAt: new Date() },
    });
  }

  const url = new URL(req.url);
  const themeOverride = url.searchParams.get("theme");
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
