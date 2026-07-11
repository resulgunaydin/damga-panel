"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, CheckCircle2, ListChecks } from "lucide-react";

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

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsList({ initial }: { initial: AppNotification[] }) {
  const [items, setItems] = useState<AppNotification[]>(initial);

  async function markRead(ids: string[]) {
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {
      /* yok say */
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

  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
        <CheckCircle2 className="size-8 opacity-40" />
        <p>Şu an bildirim yok.</p>
        <p className="text-xs">Yaklaşan randevu ya da vadesi gelen görev oldukça burada listelenir.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">
            Okunmamış{" "}
            <span className="text-muted-foreground text-sm font-normal tabular-nums">
              ({unread.length})
            </span>
          </h2>
          {unread.length > 0 && (
            <button
              onClick={markAll}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <Check className="size-3.5" /> Tümünü okundu işaretle
            </button>
          )}
        </div>
        {unread.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
            Okunmamış bildirim yok.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border">
            {unread.map((n) => (
              <Item key={n.id} n={n} onRead={() => markRead([n.id])} />
            ))}
          </ul>
        )}
      </section>

      {read.length > 0 && (
        <section>
          <h2 className="text-muted-foreground mb-2 font-semibold">
            Okundu{" "}
            <span className="text-sm font-normal tabular-nums">({read.length})</span>
          </h2>
          <ul className="divide-y overflow-hidden rounded-xl border opacity-70">
            {read.map((n) => (
              <Item key={n.id} n={n} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ n, onRead }: { n: AppNotification; onRead?: () => void }) {
  const Icon = n.type === "appointment" ? CalendarClock : ListChecks;
  const accent =
    n.severity === "due" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400";
  return (
    <li className="hover:bg-accent/40 flex items-start gap-3 px-4 py-3">
      <Icon className={`mt-0.5 size-4 shrink-0 ${accent}`} />
      <Link href={n.href} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <span className="font-medium">{n.title}</span>
          <span className="text-muted-foreground text-xs tabular-nums">{fmt(n.at)}</span>
        </div>
        <p className="text-muted-foreground text-sm">{n.message}</p>
      </Link>
      {onRead && (
        <button
          onClick={onRead}
          className="text-muted-foreground hover:bg-accent hover:text-foreground shrink-0 rounded-md border px-2 py-1 text-xs"
          title="Okundu işaretle"
        >
          Okundu
        </button>
      )}
    </li>
  );
}
