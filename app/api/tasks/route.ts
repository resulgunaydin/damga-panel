import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listActiveTasks } from "@/lib/tasks";

// Görev Kutusu: aktif görevler.
export async function GET() {
  const tasks = await listActiveTasks();
  return NextResponse.json({ tasks });
}

// Elle görev ekle (Bölüm 4.10).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Görev başlığı gerekli." }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      title,
      kind: "MANUEL",
      dueAt: body.dueAt ? new Date(body.dueAt) : new Date(),
      businessId: body.businessId ?? null,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}
