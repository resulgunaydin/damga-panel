import Link from "next/link";
import { Settings } from "lucide-react";
import { buildNotifications, getNotificationSettings } from "@/lib/notifications";
import { NotificationsList } from "@/components/notifications/notifications-list";

export const dynamic = "force-dynamic";

export default async function BildirimlerPage() {
  const settings = await getNotificationSettings();
  const notifications = settings.enabled ? await buildNotifications(settings) : [];

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Bildirimler</h1>
          <p className="text-muted-foreground text-sm">
            Yaklaşan / zamanı gelen randevular ve vadesi gelen görevler.
          </p>
        </div>
        <Link
          href="/ayarlar"
          className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm"
        >
          <Settings className="size-4" /> Bildirim ayarları
        </Link>
      </div>

      {!settings.enabled && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Bildirimler kapalı. <Link href="/ayarlar" className="underline">Ayarlar</Link>’dan açabilirsin.
        </div>
      )}

      <NotificationsList initial={notifications} />
    </main>
  );
}
