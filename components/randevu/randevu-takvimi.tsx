"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type Appt = {
  id: string;
  scheduledAt: string;
  location: string | null;
  note: string | null;
  status: string;
  business: { id: string; name: string } | null;
};

const AY = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const GUN = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const STATUS_STYLE: Record<string, string> = {
  PLANLANDI: "bg-primary/15 text-primary",
  YAPILDI: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  IPTAL: "bg-muted text-muted-foreground line-through",
};
const STATUS_LABEL: Record<string, string> = {
  PLANLANDI: "planlandı",
  YAPILDI: "yapıldı",
  IPTAL: "iptal",
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function saat(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
// ISO → datetime-local input değeri (yerel saat)
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function RandevuTakvimi({ appointments }: { appointments: Appt[] }) {
  const [items, setItems] = useState<Appt[]>(appointments);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id: string; when: string; location: string; note: string } | null>(null);
  const todayKey = ymd(now);

  function flash(m: string) {
    setErr(m);
    setTimeout(() => setErr(null), 2500);
  }

  async function patchAppt(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Güncellenemedi.");
      const ap = data.appointment;
      setItems((list) =>
        list.map((x) =>
          x.id === id
            ? { ...x, status: ap.status, scheduledAt: ap.scheduledAt, location: ap.location, note: ap.note }
            : x,
        ),
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  async function removeAppt(id: string) {
    if (!confirm("Randevu silinsin mi? Hatırlatma görevi de kaldırılır.")) return;
    setBusy(id);
    const prev = items;
    setItems((list) => list.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
      flash("Randevu silinemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    const { id, when, location, note } = edit;
    setEdit(null);
    await patchAppt(id, {
      scheduledAt: new Date(when).toISOString(),
      location,
      note,
    });
  }

  const byDay = useMemo(() => {
    const m = new Map<string, Appt[]>();
    for (const a of items) {
      const key = ymd(new Date(a.scheduledAt));
      const arr = m.get(key) ?? [];
      arr.push(a);
      m.set(key, arr);
    }
    for (const arr of m.values())
      arr.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    return m;
  }, [items]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Pzt=0
    const start = new Date(first);
    start.setDate(first.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const upcoming = useMemo(
    () =>
      items
        .filter(
          (a) =>
            new Date(a.scheduledAt) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        )
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [items, now],
  );

  const selectedAppts = selected ? (byDay.get(selected) ?? []) : [];

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelected(null);
  }

  const actions = {
    busy,
    onDone: (id: string) => patchAppt(id, { status: "YAPILDI" }),
    onCancel: (id: string) => patchAppt(id, { status: "IPTAL" }),
    onReopen: (id: string) => patchAppt(id, { status: "PLANLANDI" }),
    onDelete: removeAppt,
    onEdit: (a: Appt) =>
      setEdit({
        id: a.id,
        when: toLocalInput(a.scheduledAt),
        location: a.location ?? "",
        note: a.note ?? "",
      }),
  };

  return (
    <div className="flex flex-col gap-3">
      {err && <div className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{err}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Takvim */}
        <div className="rounded-2xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-heading text-lg font-bold">
              {AY[cursor.getMonth()]} {cursor.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                className="hover:bg-accent rounded-md border p-1.5"
                aria-label="Önceki ay"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => {
                  setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelected(null);
                }}
                className="hover:bg-accent rounded-md border px-2.5 py-1.5 text-xs font-medium"
              >
                Bugün
              </button>
              <button
                onClick={() => shiftMonth(1)}
                className="hover:bg-accent rounded-md border p-1.5"
                aria-label="Sonraki ay"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b text-center">
            {GUN.map((g) => (
              <div key={g} className="text-muted-foreground py-2 text-xs font-medium">
                {g}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const appts = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(appts.length ? key : null)}
                  className={`min-h-20 border-r border-b p-1.5 text-left align-top last:border-r-0 ${
                    inMonth ? "" : "bg-muted/30 text-muted-foreground"
                  } ${appts.length ? "hover:bg-accent/50" : ""} ${
                    selected === key ? "ring-primary ring-2 ring-inset" : ""
                  }`}
                >
                  <div
                    className={`mb-1 inline-grid size-6 place-items-center rounded-full text-xs font-medium ${
                      isToday ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {appts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className={`truncate rounded px-1 py-0.5 text-[11px] ${STATUS_STYLE[a.status] ?? ""}`}
                        title={`${saat(a.scheduledAt)} · ${a.business?.name ?? ""}`}
                      >
                        {saat(a.scheduledAt)} {a.business?.name ?? "Randevu"}
                      </div>
                    ))}
                    {appts.length > 2 && (
                      <div className="text-muted-foreground text-[11px]">
                        +{appts.length - 2} daha
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Yan panel */}
        <div className="rounded-2xl border p-4">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">
                  {new Date(selected).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted-foreground text-xs hover:underline"
                >
                  Yaklaşanlar
                </button>
              </div>
              <ApptList items={selectedAppts} actions={actions} />
            </>
          ) : (
            <>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <CalendarDays className="size-4" /> Yaklaşan randevular
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">Yaklaşan randevu yok.</p>
              ) : (
                <ApptList items={upcoming} actions={actions} showDate />
              )}
            </>
          )}
        </div>
      </div>

      {/* Düzenle / ertele */}
      <Dialog open={edit != null} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevuyu düzenle</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <input
                type="datetime-local"
                value={edit.when}
                onChange={(e) => setEdit({ ...edit, when: e.target.value })}
                className="bg-background h-9 rounded-md border px-2 text-sm"
              />
              <Input
                placeholder="Yer (adres / telefon / video linki)"
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
              />
              <Input
                placeholder="Not"
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              Vazgeç
            </Button>
            <Button onClick={saveEdit} disabled={!edit?.when}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Actions = {
  busy: string | null;
  onDone: (id: string) => void;
  onCancel: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (a: Appt) => void;
};

function ApptList({
  items,
  actions,
  showDate,
}: {
  items: Appt[];
  actions: Actions;
  showDate?: boolean;
}) {
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">Bu günde randevu yok.</p>;

  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const isBusy = actions.busy === a.id;
        const closed = a.status === "YAPILDI" || a.status === "IPTAL";
        return (
          <li key={a.id} className="rounded-lg border p-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {showDate
                  ? new Date(a.scheduledAt).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                    }) + " "
                  : ""}
                {saat(a.scheduledAt)}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[a.status] ?? ""}`}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
            {a.business && (
              <Link href={`/firma/${a.business.id}`} className="text-primary hover:underline">
                {a.business.name}
              </Link>
            )}
            {a.location && (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <MapPin className="size-3" /> {a.location}
              </div>
            )}
            {a.note && <div className="text-muted-foreground text-xs">{a.note}</div>}

            {/* Yönetim */}
            <div className="mt-2 flex flex-wrap items-center gap-1 border-t pt-2">
              {closed ? (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => actions.onReopen(a.id)}
                >
                  <RotateCcw className="size-3" /> Geri al
                </Button>
              ) : (
                <>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => actions.onDone(a.id)}
                    className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <Check className="size-3" /> Yapıldı
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => actions.onCancel(a.id)}
                  >
                    <X className="size-3" /> İptal
                  </Button>
                </>
              )}
              <Button size="xs" variant="ghost" disabled={isBusy} onClick={() => actions.onEdit(a)}>
                <Pencil className="size-3" /> Düzenle
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={isBusy}
                onClick={() => actions.onDelete(a.id)}
                className="text-muted-foreground ml-auto hover:text-red-600"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
