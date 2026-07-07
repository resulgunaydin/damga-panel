import { getBranding } from "@/lib/branding";
import { THEME_LIST } from "@/lib/presentation/themes";
import { BrandingSettings } from "@/components/settings/branding-settings";

export const dynamic = "force-dynamic";

export default async function SunumAyarPage() {
  const branding = await getBranding();
  const themes = THEME_LIST.map((t) => ({ id: t.id, name: t.name, description: t.description }));
  return <BrandingSettings initial={branding} themes={themes} />;
}
