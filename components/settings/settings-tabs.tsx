"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Sparkles, Stamp } from "lucide-react";

const TABS = [
  { href: "/ayarlar", label: "AI Sağlayıcı", icon: Sparkles },
  { href: "/ayarlar/limitler", label: "Sınırlar & Kota", icon: Gauge },
  { href: "/ayarlar/sunum", label: "Sunum & Marka", icon: Stamp },
];

// Ayarlar alt sayfaları arası sekme çubuğu — sayfaları konularına göre gruplar.
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 border-b pb-3">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </div>
  );
}
