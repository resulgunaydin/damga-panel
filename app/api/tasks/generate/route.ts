import { NextResponse } from "next/server";
import { generateFollowUpTasks } from "@/lib/tasks";

// Takip görevlerini üret (elle tazele veya worker tetikler).
export async function POST() {
  const created = await generateFollowUpTasks();
  return NextResponse.json({ created });
}
