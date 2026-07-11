import { NextResponse } from "next/server";
import {
  buildNotifications,
  getNotificationSettings,
  markAllRead,
  markRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

// O anki bildirimleri döner (bildirim zili periyodik yoklar).
export async function GET() {
  const settings = await getNotificationSettings();
  const notifications = settings.enabled ? await buildNotifications(settings) : [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  return NextResponse.json({
    enabled: settings.enabled,
    browserNotifications: settings.browserNotifications,
    sound: settings.sound,
    count: notifications.length,
    unreadCount,
    notifications,
  });
}

// Bildirim(ler)i okundu işaretle. body: { ids?: string[] } veya { all: true }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.all === true) {
    await markAllRead();
  } else if (Array.isArray(body.ids)) {
    await markRead(body.ids.filter((x: unknown): x is string => typeof x === "string"));
  } else {
    return NextResponse.json({ error: "ids veya all gerekli." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
