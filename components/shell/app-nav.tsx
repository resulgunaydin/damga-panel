"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Gauge,
  Layers,
  LayoutGrid,
  ListChecks,
  LogOut,
  Moon,
  Package,
  Settings,
  Stamp,
  Sun,
} from "lucide-react";

const LINKS = [
  { href: "/calisma-alani", label: "Arama Alanı", icon: Layers },
  { href: "/calisma-listem", label: "Çalışma Listem", icon: LayoutGrid },
  { href: "/gorevler", label: "Görevler", icon: ListChecks },
  { href: "/hizmetler", label: "Hizmetler", icon: Package },
  { href: "/kullanim", label: "Kullanım", icon: Gauge },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : false;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  return (
    <button
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground hover:bg-accent grid size-9 place-items-center rounded-lg transition-colors"
      title={dark ? "Aydınlık tema" : "Karanlık tema"}
      aria-label="Tema değiştir"
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}

function LogoutButton() {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/giris";
  }
  return (
    <button
      onClick={logout}
      disabled={busy}
      className="text-muted-foreground hover:text-foreground hover:bg-accent grid size-9 place-items-center rounded-lg transition-colors"
      title="Çıkış yap"
      aria-label="Çıkış yap"
    >
      <LogOut className="size-4.5" />
    </button>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4">
        {/* Marka */}
        <Link href="/calisma-alani" className="group mr-3 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg shadow-sm transition-transform group-hover:-rotate-6">
            <Stamp className="size-4.5" />
          </span>
          <span className="font-heading text-[15px] font-extrabold tracking-tight">
            Damga<span className="text-primary">Panel</span>
          </span>
        </Link>

        {/* Bağlantılar */}
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
