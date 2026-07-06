import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Hizmet Listesi (Bölüm 4.6) — FİYATSIZ. Sadece "hangi hizmetler var".
export async function GET() {
  const services = await prisma.serviceCatalog.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ services });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Hizmet adı gerekli." }, { status: 400 });
  }
  const service = await prisma.serviceCatalog.create({
    data: {
      name,
      description: String(body.description ?? "").trim() || null,
    },
  });
  return NextResponse.json({ service }, { status: 201 });
}
