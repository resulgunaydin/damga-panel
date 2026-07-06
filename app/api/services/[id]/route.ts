import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { name?: string; description?: string | null; active?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("description" in body) data.description = String(body.description ?? "").trim() || null;
  if (typeof body.active === "boolean") data.active = body.active;

  const service = await prisma.serviceCatalog.update({ where: { id }, data });
  return NextResponse.json({ service });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.serviceCatalog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
