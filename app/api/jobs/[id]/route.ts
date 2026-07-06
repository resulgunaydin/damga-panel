import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { JobStatus } from "@/lib/generated/prisma/enums";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: JobStatus[] = ["BASLAMADI", "DEVAM", "BITTI"];

// İş satırını güncelle (durum/başlık/deadline/not/anlaşılan tutar — elle).
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.status === "string" && STATUSES.includes(body.status as JobStatus)) {
    data.status = body.status;
  }
  if ("deadline" in body) data.deadline = body.deadline ? new Date(body.deadline) : null;
  if ("note" in body) data.note = String(body.note ?? "").trim() || null;
  if ("agreedAmount" in body) {
    data.agreedAmount =
      body.agreedAmount != null && body.agreedAmount !== ""
        ? String(body.agreedAmount)
        : null;
  }
  const job = await prisma.job.update({
    where: { id },
    data,
    include: { payments: true },
  });
  return NextResponse.json({ job });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
