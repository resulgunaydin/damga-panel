"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ImageUp, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Branding = {
  logoUrl?: string | null;
  agencyName?: string | null;
  website?: string | null;
  brandColor?: string | null;
  contact?: { phone?: string | null; email?: string | null; address?: string | null } | null;
  defaultThemeId: string;
};
type ThemeInfo = { id: string; name: string; description: string };

export function BrandingSettings({ initial, themes }: { initial: Branding; themes: ThemeInfo[] }) {
  const [b, setB] = useState<Branding>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = b.contact ?? {};

  function set<K extends keyof Branding>(k: K, v: Branding[K]) {
    setB((p) => ({ ...p, [k]: v }));
  }
  function setContact(k: "phone" | "email" | "address", v: string) {
    setB((p) => ({ ...p, contact: { ...(p.contact ?? {}), [k]: v } }));
  }

  function onLogo(file: File) {
    if (file.size > 1_150_000) {
      setMsg("Logo çok büyük (en fazla ~1.1MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: b.logoUrl ?? null,
          agencyName: b.agencyName ?? null,
          website: b.website ?? null,
          brandColor: b.brandColor ?? null,
          defaultThemeId: b.defaultThemeId,
          contact: b.contact ?? {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi");
      setMsg("Kaydedildi.");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  const accent = b.brandColor || "#17913a";

  return (
    <main className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8">
      <div>
        <Link
          href="/ayarlar"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Ayarlar
        </Link>
        <h1 className="text-2xl font-semibold">Sunum Markası &amp; Temalar</h1>
        <p className="text-muted-foreground text-sm">
          Logonuz ve iletişim bilgileriniz her sunuma yansır. Bir varsayılan tema seçin.
        </p>
      </div>

      {msg && <div className="rounded-md border px-4 py-2 text-sm">{msg}</div>}

      {/* Ajans kimliği */}
      <section className="grid gap-5 rounded-xl border p-5">
        <h2 className="font-medium">Ajans kimliği</h2>
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-white">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt="logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <ImageUp className="text-muted-foreground size-6" />
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageUp className="size-4" /> Logo yükle
            </Button>
            {b.logoUrl && (
              <Button variant="outline" onClick={() => set("logoUrl", null)}>
                <Trash2 className="size-4" /> Kaldır
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Ajans adı
            <input
              className="bg-background rounded-md border px-3 py-2"
              value={b.agencyName ?? ""}
              onChange={(e) => set("agencyName", e.target.value)}
              placeholder="DamgaBilişim"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Web sitesi
            <input
              className="bg-background rounded-md border px-3 py-2"
              value={b.website ?? ""}
              onChange={(e) => set("website", e.target.value)}
              placeholder="damgabilisim.com"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Telefon
            <input
              className="bg-background rounded-md border px-3 py-2"
              value={c.phone ?? ""}
              onChange={(e) => setContact("phone", e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            E-posta
            <input
              className="bg-background rounded-md border px-3 py-2"
              value={c.email ?? ""}
              onChange={(e) => setContact("email", e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Adres
            <input
              className="bg-background rounded-md border px-3 py-2"
              value={c.address ?? ""}
              onChange={(e) => setContact("address", e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Marka rengi
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={accent}
                onChange={(e) => set("brandColor", e.target.value)}
                className="h-9 w-12 rounded border"
              />
              <input
                className="bg-background w-28 rounded-md border px-2 py-1.5 font-mono text-sm"
                value={accent}
                onChange={(e) => set("brandColor", e.target.value)}
              />
            </span>
          </label>
        </div>
      </section>

      {/* Tema galerisi */}
      <section className="grid gap-4">
        <h2 className="font-medium">Tema</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {themes.map((t) => {
            const selected = b.defaultThemeId === t.id;
            return (
              <button key={t.id} onClick={() => set("defaultThemeId", t.id)} className="group text-left">
                <div
                  className="relative overflow-hidden rounded-xl border-2 transition"
                  style={{ borderColor: selected ? accent : "transparent" }}
                >
                  <div className="pointer-events-none h-56 w-full overflow-hidden bg-white">
                    <iframe
                      src={`/sunum/onizleme?theme=${t.id}`}
                      title={t.name}
                      className="origin-top-left"
                      style={{ width: "794px", height: "1123px", transform: "scale(0.315)", border: 0 }}
                    />
                  </div>
                  {selected && (
                    <span
                      className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ background: accent }}
                    >
                      <Check className="size-3" /> Seçili
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-muted-foreground text-xs">{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Kaydet
        </Button>
      </div>
    </main>
  );
}
