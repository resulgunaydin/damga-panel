import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/business";

type Ctx = { params: Promise<{ id: string }> };

// Firmaya iş satırı ekler (Bölüm 4.11). İlk işte Customer kaydı upsert edilir.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "İş başlığı gerekli." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) {
    return NextResponse.json({ error: "Firma bulunamadı." }, { status: 404 });
  }

  // Gerçek müşteri kaydını garanti et (1:1).
  const customer = await prisma.customer.upsert({
    where: { businessId: id },
    create: { businessId: id },
    update: {},
  });

  const job = await prisma.job.create({
    data: {
      customerId: customer.id,
      title,
      deadline: body.deadline ? new Date(body.deadline) : null,
      note: String(body.note ?? "").trim() || null,
      agreedAmount:
        body.agreedAmount != null && body.agreedAmount !== ""
          ? String(body.agreedAmount)
          : null,
    },
    include: { payments: true },
  });
  await logActivity(id, `İş eklendi: ${title}`);
  return NextResponse.json({ job }, { status: 201 });
}
