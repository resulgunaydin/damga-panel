import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// İşe tahsilat ekler — tutar tamamen ELLE (Bölüm 4.11). Sistem rakam üretmez.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params; // jobId
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Geçerli bir tutar girin." }, { status: 400 });
  }
  const payment = await prisma.payment.create({
    data: {
      jobId: id,
      amount: String(amount),
      note: String(body.note ?? "").trim() || null,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    },
  });
  return NextResponse.json({ payment }, { status: 201 });
}
