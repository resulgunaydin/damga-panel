import { NextResponse } from "next/server";
import { getBranding, saveBranding, validateLogo, type BrandingPatch } from "@/lib/branding";
import { THEME_LIST } from "@/lib/presentation/themes";

export const dynamic = "force-dynamic";

export async function GET() {
  const branding = await getBranding();
  const themes = THEME_LIST.map((t) => ({ id: t.id, name: t.name, description: t.description }));
  return NextResponse.json({ branding, themes });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as BrandingPatch | null;
  if (!body) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  if (typeof body.logoUrl === "string" && body.logoUrl) {
    const err = validateLogo(body.logoUrl);
    if (err) return NextResponse.json({ error: err }, { status: 413 });
  }
  const branding = await saveBranding(body);
  return NextResponse.json({ branding });
}
