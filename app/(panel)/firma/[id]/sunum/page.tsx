import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SunumEditor } from "@/components/firma/sunum-editor";
import { DEFAULT_SECTIONS, type SectionConfig } from "@/lib/presentation";
import { getBranding } from "@/lib/branding";
import { THEME_LIST } from "@/lib/presentation/themes";

export const dynamic = "force-dynamic";

export default async function SunumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!business) notFound();

  const presentation = await prisma.presentation.findFirst({
    where: { businessId: id },
    orderBy: { createdAt: "desc" },
  });

  const branding = await getBranding();
  const themes = THEME_LIST.map((t) => ({ id: t.id, name: t.name }));

  return (
    <SunumEditor
      businessId={business.id}
      businessName={business.name}
      initial={
        presentation
          ? {
              id: presentation.id,
              sections: presentation.sectionConfig as unknown as SectionConfig[],
              content: presentation.content as Record<string, string>,
              format: presentation.format,
              openedAt: presentation.openedAt ? presentation.openedAt.toISOString() : null,
              themeId: presentation.themeId ?? null,
            }
          : null
      }
      defaultSections={DEFAULT_SECTIONS}
      themes={themes}
      globalThemeId={branding.defaultThemeId}
    />
  );
}
