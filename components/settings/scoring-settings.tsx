"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScoringConfig = {
  siteYok: number;
  siteAcilmiyor: number;
  sslYok: number;
  mobilBozuk: number;
  azYorum: number;
  azYorumMax: number;
  dusukPuan: number;
  dusukPuanMax: number;
  sicakMin: number;
  ilikMin: number;
};

type ScoringData = {
  total: number;
  scored: number;
  unscored: number;
  sicak: number;
  ilik: number;
  soguk: number;
  avg: number;
  signals: { key: string; label: string; count: number }[];
};

const DEFAULTS: ScoringConfig = {
  siteYok: 40,
  siteAcilmiyor: 20,
  sslYok: 15,
  mobilBozuk: 15,
  azYorum: 15,
  azYorumMax: 30,
  dusukPuan: 10,
  dusukPuanMax: 4.0,
  sicakMin: 70,
  ilikMin: 40,
};

const POINT_FIELDS: { key: keyof ScoringConfig; label: string; desc: string }[] = [
  { key: "siteYok", label: "Gerçek site yok", desc: "Sosyal medya / rehber sayfası dahil" },
  { key: "siteAcilmiyor", label: "Site açılmıyor", desc: "Adres var ama erişilemiyor" },
  { key: "sslYok", label: "SSL (https) yok", desc: "Güvenli bağlantı yok" },
  { key: "mobilBozuk", label: "Mobil uyumsuz", desc: "Viewport etiketi yok" },
  { key: "azYorum", label: "Az yorum", desc: "Google yorum sayısı düşük" },
  { key: "dusukPuan", label: "Düşük Google puanı", desc: "Ortalama yıldız düşük" },
];

const THRESHOLD_FIELDS: {
  key: keyof ScoringConfig;
  label: string;
  desc: string;
  step?: number;
  suffix?: string;
}[] = [
  { key: "azYorumMax", label: "Az yorum eşiği", desc: "Yorum sayısı bunun altındaysa “az yorum”", suffix: "yorum" },
  { key: "dusukPuanMax", label: "Düşük puan eşiği", desc: "Google puanı bunun altındaysa “düşük”", step: 0.1, suffix: "yıldız" },
  { key: "sicakMin", label: "🔥 Sıcak eşiği", desc: "Skor bu değer ve üstü → Sıcak" },
  { key: "ilikMin", label: "🟡 Ilık eşiği", desc: "Skor bu değer ve üstü → Ilık (altı Soğuk)" },
];

export function ScoringSettings({ config, data }: { config: ScoringConfig; data: ScoringData }) {
  const [cfg, setCfg] = useState<ScoringConfig>(config);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const dirty = (Object.keys(cfg) as (keyof ScoringConfig)[]).some((k) => cfg[k] !== config[k]);

  function set(key: keyof ScoringConfig, value: string) {
    const num = Number(value);
    setCfg((c) => ({ ...c, [key]: Number.isFinite(num) ? num : 0 }));
  }

  async function save() {
    setSaving(true);
    setFlash(null);
    try {
      const res = await fetch("/api/settings/scoring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      setCfg(d.config);
      setFlash("Kaydedildi. (Mevcut firmaları güncellemek için segmentte “Yeniden puanla”.)");
      setTimeout(() => setFlash(null), 4000);
    } catch {
      setFlash("Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  const bucketMax = Math.max(data.sicak, data.ilik, data.soguk, 1);
  const signalMax = Math.max(...data.signals.map((s) => s.count), 1);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/ayarlar"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Ayarlar
        </Link>
        <h1 className="font-heading flex items-center gap-2 text-2xl font-bold">
          <SlidersHorizontal className="size-6" /> Firma Puanlama
        </h1>
        <p className="text-muted-foreground text-sm">
          Kaba eleme fırsat skorunun kuralları ve mevcut veri dağılımı. “Ne kadar açığı var = ne
          kadar satılır.”
        </p>
      </div>

      {/* ── Veri paneli ── */}
      <section className="flex flex-col gap-4 rounded-xl border p-4">
        <h2 className="font-heading flex items-center gap-2 font-bold">
          <BarChart3 className="size-4" /> Veriler
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Toplam firma" value={data.total} />
          <Stat label="Puanlandı" value={data.scored} />
          <Stat label="Puanlanmadı" value={data.unscored} />
          <Stat label="Ortalama skor" value={data.avg} />
        </div>

        {/* Kova dağılımı */}
        <div>
          <div className="text-muted-foreground mb-1.5 text-xs font-medium">Kova dağılımı</div>
          {data.scored === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz puanlanmış firma yok.</p>
          ) : (
            <div className="space-y-1.5">
              <BucketBar label="🔥 Sıcak" count={data.sicak} max={bucketMax} color="bg-orange-500" />
              <BucketBar label="🟡 Ilık" count={data.ilik} max={bucketMax} color="bg-amber-400" />
              <BucketBar label="⚪ Soğuk" count={data.soguk} max={bucketMax} color="bg-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* En sık sinyaller */}
        {data.signals.length > 0 && (
          <div>
            <div className="text-muted-foreground mb-1.5 text-xs font-medium">
              En sık tespit edilen açıklar
            </div>
            <div className="space-y-1.5">
              {data.signals.slice(0, 8).map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-sm">{s.label}</span>
                  <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${(s.count / signalMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Sinyal puanları ── */}
      <section className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading font-bold">Sinyal puanları</h2>
          <button
            onClick={() => setCfg(DEFAULTS)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <RotateCcw className="size-3" /> Varsayılana dön
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {POINT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} desc={f.desc}>
              <NumberInput value={cfg[f.key]} onChange={(v) => set(f.key, v)} suffix="puan" />
            </Field>
          ))}
        </div>
      </section>

      {/* ── Eşikler ── */}
      <section className="rounded-xl border p-4">
        <h2 className="font-heading mb-3 font-bold">Eşikler</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {THRESHOLD_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} desc={f.desc}>
              <NumberInput
                value={cfg[f.key]}
                step={f.step}
                onChange={(v) => set(f.key, v)}
                suffix={f.suffix ?? "puan"}
              />
            </Field>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        {flash && <span className="text-muted-foreground text-sm">{flash}</span>}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

function BucketBar({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-sm">{label}</span>
      <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(count / max) * 100}%` }} />
      </div>
      <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
        {count}
      </span>
    </div>
  );
}

function Field({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step,
  suffix,
}: {
  value: number;
  onChange: (v: string) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background h-9 w-20 rounded-lg border px-2 text-right text-sm tabular-nums"
      />
      {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
    </span>
  );
}
