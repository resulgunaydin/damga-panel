// Tekil ajans marka satırı (PresentationTemplate) get/save.
import { prisma } from "@/lib/prisma";
import { DEFAULT_BRAND_COLOR } from "@/lib/presentation/brand";
import { DEFAULT_THEME_ID } from "@/lib/presentation/themes";
import { DEFAULT_SECTIONS, type Branding } from "@/lib/presentation";

const SINGLETON = "singleton";
export const MAX_LOGO_CHARS = 1_600_000; // ~1.2MB base64

export type BrandingRecord = Branding & { defaultThemeId: string };

export async function getBranding(): Promise<BrandingRecord> {
  const row = await prisma.presentationTemplate.findUnique({ where: { id: SINGLETON } });
  const contact = (row?.contact as BrandingRecord["contact"]) ?? {};
  return {
    logoUrl: row?.logoUrl ?? null,
    agencyName: row?.agencyName ?? null,
    website: row?.website ?? null,
    brandColor: row?.brandColor ?? DEFAULT_BRAND_COLOR,
    contact,
    defaultThemeId: row?.defaultThemeId ?? DEFAULT_THEME_ID,
  };
}

export type BrandingPatch = Partial<{
  logoUrl: string | null;
  agencyName: string | null;
  website: string | null;
  brandColor: string | null;
  defaultThemeId: string | null;
  contact: { phone?: string | null; email?: string | null; address?: string | null };
}>;

export async function saveBranding(patch: BrandingPatch): Promise<BrandingRecord> {
  await prisma.presentationTemplate.upsert({
    where: { id: SINGLETON },
    create: {
      id: SINGLETON,
      defaultSections: DEFAULT_SECTIONS as unknown as object,
      logoUrl: patch.logoUrl ?? null,
      agencyName: patch.agencyName ?? null,
      website: patch.website ?? null,
      brandColor: patch.brandColor ?? DEFAULT_BRAND_COLOR,
      defaultThemeId: patch.defaultThemeId ?? DEFAULT_THEME_ID,
      contact: (patch.contact ?? {}) as object,
    },
    update: {
      ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
      ...(patch.agencyName !== undefined ? { agencyName: patch.agencyName } : {}),
      ...(patch.website !== undefined ? { website: patch.website } : {}),
      ...(patch.brandColor !== undefined ? { brandColor: patch.brandColor } : {}),
      ...(patch.defaultThemeId !== undefined ? { defaultThemeId: patch.defaultThemeId } : {}),
      ...(patch.contact !== undefined ? { contact: patch.contact as object } : {}),
    },
  });
  return getBranding();
}

// Logo data-URI doğrulama: tür + boyut. Geçerliyse null, değilse hata mesajı.
export function validateLogo(dataUri: string): string | null {
  if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(dataUri))
    return "Logo PNG, JPG, WebP veya SVG olmalı.";
  if (dataUri.length > MAX_LOGO_CHARS) return "Logo çok büyük (en fazla ~1.2MB).";
  return null;
}
