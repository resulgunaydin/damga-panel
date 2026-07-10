"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";

type Settings = {
  enabled: boolean;
  appointmentLeadMinutes: number;
  browserNotifications: boolean;
  sound: boolean;
  taskReminders: boolean;
};

const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: "15 dakika" },
  { value: 30, label: "30 dakika" },
  { value: 60, label: "1 saat" },
  { value: 120, label: "2 saat" },
  { value: 240, label: "4 saat" },
  { value: 1440, label: "1 gün" },
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-muted-foreground text-xs">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function NotificationSettings({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial);
  const [flash, setFlash] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPerm(Notification.permission);
    else setPerm("unsupported");
  }, []);

  async function update(patch: Partial<Settings>) {
    const next = { ...s, ...patch };
    setS(next);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setS(data.settings);
      setFlash("Kaydedildi");
      setTimeout(() => setFlash(null), 1500);
    } catch {
      setS(s); // geri al
      setFlash("Kaydedilemedi");
      setTimeout(() => setFlash(null), 2000);
    }
  }

  async function askPermission() {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-heading flex items-center gap-2 text-lg font-bold">
          <Bell className="size-5" /> Bildirimler
        </h2>
        {flash && <span className="text-muted-foreground text-xs">{flash}</span>}
      </div>
      <p className="text-muted-foreground mb-3 text-sm">
        Yaklaşan ve zamanı gelen randevular ile vadesi gelen görevler için anlık hatırlatma.
      </p>

      <div className="divide-y rounded-xl border px-4">
        <Row title="Bildirimler açık" desc="Tüm hatırlatmaları aç/kapat.">
          <Toggle checked={s.enabled} onChange={(v) => update({ enabled: v })} />
        </Row>

        <Row
          title="Randevu ön uyarı süresi"
          desc="Randevudan ne kadar önce “yaklaşıyor” uyarısı verilsin."
        >
          <select
            value={s.appointmentLeadMinutes}
            disabled={!s.enabled}
            onChange={(e) => update({ appointmentLeadMinutes: Number(e.target.value) })}
            className="bg-background h-9 rounded-lg border px-2 text-sm disabled:opacity-40"
          >
            {LEAD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>

        <Row title="Görev hatırlatmaları" desc="Vadesi gelen takip/görevleri de bildir.">
          <Toggle
            checked={s.taskReminders}
            disabled={!s.enabled}
            onChange={(v) => update({ taskReminders: v })}
          />
        </Row>

        <Row
          title="Masaüstü bildirimi"
          desc="Uygulama açıkken tarayıcı üzerinden pop-up bildirim göster."
        >
          <Toggle
            checked={s.browserNotifications}
            disabled={!s.enabled}
            onChange={(v) => update({ browserNotifications: v })}
          />
        </Row>

        <Row title="Bildirim sesi" desc="Yeni bildirimde kısa bir ses çal.">
          <Toggle checked={s.sound} disabled={!s.enabled} onChange={(v) => update({ sound: v })} />
        </Row>
      </div>

      {/* Tarayıcı izni durumu */}
      {s.enabled && s.browserNotifications && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          {perm === "granted" ? (
            <span className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
              <BellRing className="size-4" /> Masaüstü bildirim izni verildi.
            </span>
          ) : perm === "denied" ? (
            <span className="text-muted-foreground">
              Tarayıcı bildirim izni <b>reddedilmiş</b>. Tarayıcı ayarlarından bu site için izin
              vermelisin.
            </span>
          ) : perm === "unsupported" ? (
            <span className="text-muted-foreground">Bu tarayıcı masaüstü bildirimi desteklemiyor.</span>
          ) : (
            <>
              <span className="text-muted-foreground">Masaüstü bildirimleri için izin gerekiyor.</span>
              <button
                onClick={askPermission}
                className="bg-primary text-primary-foreground shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary/80"
              >
                İzin ver
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
