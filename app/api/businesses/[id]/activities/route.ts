import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/business";

type Ctx = { params: Promise<{ id: string }> };

// Firma defterini döner (kronolojik).
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const activities = await prisma.activity.findMany({
    where: { businessId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ activities });
}

// Elle not ekler (Bölüm 4.9): "aradım / konuştuk" gibi.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Not boş olamaz." }, { status: 400 });
  }
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }
  await logActivity(id, message, "NOT");
  const activity = await prisma.activity.findFirst({
    where: { businessId: id, kind: "NOT" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ activity }, { status: 201 });
}
