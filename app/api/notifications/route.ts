import { NextResponse } from "next/server";
import { buildNotifications, getNotificationSettings } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// O anki bildirimleri döner (bildirim zili periyodik yoklar).
export async function GET() {
  const settings = await getNotificationSettings();
  const notifications = settings.enabled ? await buildNotifications(settings) : [];
  return NextResponse.json({
    enabled: settings.enabled,
    browserNotifications: settings.browserNotifications,
    sound: settings.sound,
    count: notifications.length,
    notifications,
  });
}
