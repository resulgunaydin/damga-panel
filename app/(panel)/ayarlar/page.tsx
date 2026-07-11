import Link from "next/link";
import { ChevronRight, Palette, SlidersHorizontal, Sparkles } from "lucide-react";
import { getNotificationSettings } from "@/lib/notifications";
import { NotificationSettings } from "@/components/settings/notification-settings";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  {
    href: "/ayarlar/puanlama",
    title: "Firma Puanlama",
    desc: "Fırsat skoru kuralları (puanlar, eşikler) ve veri dağılımı.",
    icon: SlidersHorizontal,
  },
  {
    href: "/ayarlar/ai",
    title: "Yapay Zekâ",
    desc: "Sağlayıcı seçimi ve API anahtarları (mesaj + analiz üretimi).",
    icon: Sparkles,
  },
  {
    href: "/ayarlar/sunum",
    title: "Sunum Markası & Temalar",
    desc: "Logo, iletişim bilgileri ve sunum teması.",
    icon: Palette,
  },
];

export default async function AyarlarPage() {
  const notifications = await getNotificationSettings();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground text-sm">
          Bildirimler, yapay zekâ ve sunum ayarlarını buradan yönet.
        </p>
      </div>

      {/* Bildirim ayarları (yeni alan) */}
      <section>
        <NotificationSettings initial={notifications} />
      </section>

      {/* Diğer kategoriler */}
      <section>
        <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          Diğer ayarlar
        </h2>
        <div className="divide-y overflow-hidden rounded-xl border">
          {CATEGORIES.map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-accent/50 flex items-center gap-3 px-4 py-4 transition-colors"
            >
              <span className="bg-muted grid size-9 shrink-0 place-items-center rounded-lg">
                <Icon className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{title}</span>
                <span className="text-muted-foreground block text-sm">{desc}</span>
              </span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
