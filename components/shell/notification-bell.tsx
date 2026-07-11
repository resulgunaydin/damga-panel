"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Check, CheckCircle2, ListChecks, X } from "lucide-react";

type AppNotification = {
  id: string;
  type: "appointment" | "task";
  severity: "due" | "soon";
  title: string;
  message: string;
  at: string;
  href: string;
  read: boolean;
};
type Payload = {
  enabled: boolean;
  browserNotifications: boolean;
  sound: boolean;
  count: number;
  unreadCount: number;
  notifications: AppNotification[];
};

const POLL_MS = 30_000;
const SEEN_KEY = "damga.notif.seen"; // tarayıcı bildirimi gösterilmiş id'ler

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveSeen(set: Set<string>) {
  const arr = [...set].slice(-200);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    /* yok say */
  }
}

// Kısa "bip" sesi (dosya gerektirmeden, WebAudio ile).
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  } catch {
    /* yok say */
  }
}

function relTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const label = m < 60 ? `${m} dk` : m < 1440 ? `${Math.round(m / 60)} sa` : `${Math.round(m / 1440)} g`;
  return diff >= 0 ? `${label} sonra` : `${label} önce`;
}

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data: Payload = await res.json();
      setItems(data.notifications ?? []);

      // Yeni + okunmamış olanlar için tarayıcı bildirimi (ilk yüklemede pop-up yok).
      const fresh = (data.notifications ?? []).filter(
        (n) => !n.read && !seenRef.current.has(n.id),
      );
      if (!startedRef.current) {
        for (const n of data.notifications ?? []) seenRef.current.add(n.id);
        saveSeen(seenRef.current);
        startedRef.current = true;
        return;
      }
      if (fresh.length > 0 && data.enabled) {
        if (data.browserNotifications && "Notification" in window && Notification.permission === "granted") {
          for (const n of fresh.slice(0, 3)) {
            try {
              const notif = new Notification(n.title, { body: n.message, tag: n.id });
              notif.onclick = () => {
                window.focus();
                window.location.href = n.href;
              };
            } catch {
              /* yok say */
            }
          }
        }
        if (data.sound) beep();
        for (const n of fresh) seenRef.current.add(n.id);
        saveSeen(seenRef.current);
      }
    } catch {
      /* ağ hatası — bir sonraki tur dener */
    }
  }, []);

  useEffect(() => {
    seenRef.current = loadSeen();
    poll();
    const iv = setInterval(poll, POLL_MS);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function markRead(ids: string[]) {
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {
      /* yok say — bir sonraki poll düzeltir */
    }
  }
  async function markAll() {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      /* yok say */
    }
  }

  function toggle() {
    if (!open && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    setOpen((o) => !o);
  }

  const unread = items.filter((n) => !n.read);
  const count = unread.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggle}
        className="text-muted-foreground hover:text-foreground hover:bg-accent relative grid size-9 place-items-center rounded-lg transition-colors"
        title="Bildirimler"
        aria-label="Bildirimler"
      >
        <Bell className="size-4.5" />
        {count > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="bg-popover text-popover-foreground absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-hidden rounded-xl border shadow-lg ring-1 ring-foreground/5">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="font-heading text-sm font-bold">Bildirimler</span>
            {count > 0 && (
              <button
                onClick={markAll}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              >
                <Check className="size-3" /> Tümünü okundu
              </button>
            )}
          </div>

          {count === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-10 text-center text-sm">
              <CheckCircle2 className="size-7 opacity-40" />
              Okunmamış bildirim yok.
            </div>
          ) : (
            <ul className="max-h-[52vh] divide-y overflow-y-auto">
              {unread.map((n) => {
                const Icon = n.type === "appointment" ? CalendarClock : ListChecks;
                const accent =
                  n.severity === "due"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400";
                return (
                  <li key={n.id} className="hover:bg-accent/50 flex items-start gap-2 px-3 py-3">
                    <Link
                      href={n.href}
                      onClick={() => {
                        markRead([n.id]);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3"
                    >
                      <Icon className={`mt-0.5 size-4 shrink-0 ${accent}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{n.title}</span>
                          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                            {relTime(n.at)}
                          </span>
                        </div>
                        <p className="text-muted-foreground truncate text-xs">{n.message}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => markRead([n.id])}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground mt-0.5 shrink-0 rounded p-1"
                      title="Okundu işaretle"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t px-4 py-2">
            <Link
              href="/bildirimler"
              onClick={() => setOpen(false)}
              className="text-primary text-xs font-medium hover:underline"
            >
              Tümünü gör
            </Link>
            <Link
              href="/ayarlar"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Ayarlar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
