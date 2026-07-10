import { NextResponse } from "next/server";
import { getNotificationSettings, saveNotificationSettings } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getNotificationSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const settings = await saveNotificationSettings({
    enabled: body.enabled,
    appointmentLeadMinutes: body.appointmentLeadMinutes,
    browserNotifications: body.browserNotifications,
    sound: body.sound,
    taskReminders: body.taskReminders,
  });
  return NextResponse.json({ settings });
}
