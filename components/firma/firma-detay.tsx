"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  Globe,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsTakibi, type Job } from "@/components/firma/is-takibi";

const STATUS_LABEL: Record<string, string> = {
  YENI: "Yeni",
  ON_MESAJ_GONDERILDI: "Ön mesaj gönderildi",
  ULASILAMADI: "Ulaşılamadı",
  POTANSIYEL: "Potansiyel",
  SUNUM_YAPILDI: "Sunum yapıldı",
  TEKLIF_YAPILDI: "Teklif yapıldı",
  KAYIP: "Kayıp",
  IS_DEVAM: "İş devam ediyor",
  IS_BITTI: "İş bitti",
};

type Business = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: string;
  blacklisted: boolean;
  coarseScore: number;
  googleRating: number | null;
  googleReviews: number | null;
  context: string | null;
};
type Activity = { id: string; kind: string; message: string; createdAt: string };

// Telefonu wa.me için uluslararası (90…) biçime çevirir.
function waNumber(phone: string | null): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("90")) return d;
  if (d.startsWith("0")) return "90" + d.slice(1);
  if (d.length === 10) return "90" + d; // 5xx…
  return d;
}

type Opportunity = { area: string; priority: number; reasons: string[] };

export function FirmaDetay({
  business,
  opportunities,
  initialMessage,
  activities: initialActivities,
  isCustomer,
  jobs,
}: {
  business: Business;
  opportunities: Opportunity[];
  initialMessage: string | null;
  activities: Activity[];
  isCustomer: boolean;
  jobs: Job[];
}) {
  const [status, setStatus] = useState(business.status);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [blacklisted, setBlacklisted] = useState(business.blacklisted);

  async function toggleBlacklist(next: boolean) {
    if (next && !confirm("Firma kara listeye alınsın mı? Listelerde ve keşifte bir daha gösterilmez."))
      return;
    setBlacklisted(next);
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blacklisted: next }),
      });
      if (!res.ok) throw new Error();
      setActivities((a) => [
        {
          id: crypto.randomUUID(),
          kind: "SISTEM",
          message: next ? "Kara listeye alındı." : "Kara listeden çıkarıldı.",
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
    } catch {
      setBlacklisted(!next);
      setErr("Kara liste güncellenemedi.");
    }
  }

  const wa = waNumber(business.phone);
  const waLink =
    wa && message
      ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}`
      : null;

  async function generate(regenerate = false) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/businesses/${business.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "ON_MESAJ", regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Üretim başarısız.");
      setMessage(data.message.content);
      if (!data.cached) {
        setActivities((a) => [
          {
            id: crypto.randomUUID(),
            kind: "SISTEM",
            message: "Ön mesaj üretildi.",
            createdAt: new Date().toISOString(),
          },
          ...a,
        ]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    const text = note.trim();
    if (!text) return;
    setNoteBusy(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error();
      setActivities((a) => [
        {
          id: crypto.randomUUID(),
          kind: "NOT",
          message: text,
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
      setNote("");
    } catch {
      setErr("Not eklenemedi.");
    } finally {
      setNoteBusy(false);
    }
  }

  async function copy() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function markSent() {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ON_MESAJ_GONDERILDI" }),
      });
      if (!res.ok) throw new Error();
      setStatus("ON_MESAJ_GONDERILDI");
      setActivities((a) => [
        {
          id: crypto.randomUUID(),
          kind: "SISTEM",
          message: `Durum: ${STATUS_LABEL[business.status]} → Ön mesaj gönderildi`,
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
    } catch {
      setErr("Durum güncellenemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-listem"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Çalışma Panom
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{business.name}</h1>
            {business.context && (
              <p className="text-muted-foreground text-sm">{business.context}</p>
            )}
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {business.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" /> {business.phone}
                </span>
              )}
              {business.website ? (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="size-3.5" /> web sitesi
                </a>
              ) : (
                <span className="font-medium text-orange-600">site yok</span>
              )}
              {business.googleRating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-current text-amber-500" />
                  {business.googleRating.toFixed(1)} ({business.googleReviews ?? 0})
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="bg-muted inline-flex size-12 items-center justify-center rounded-lg text-lg font-semibold">
                {business.coarseScore}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">{STATUS_LABEL[status]}</div>
            </div>
            {blacklisted ? (
              <Button variant="ghost" size="sm" onClick={() => toggleBlacklist(false)}>
                <RotateCcw className="size-3.5" /> Kara listeden çıkar
              </Button>
            ) : (
              <button
                onClick={() => toggleBlacklist(true)}
                className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-red-600"
              >
                <Ban className="size-3.5" /> Kara listeye al
              </button>
            )}
          </div>
        </div>
        {blacklisted && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            Bu firma kara listede — listelerde ve keşifte gösterilmez.
          </div>
        )}
      </div>

      {/* Gerçek Müşteri iş takibi (Bölüm 4.11) */}
      {isCustomer && <IsTakibi businessId={business.id} initialJobs={jobs} />}

      {/* Satış fırsatları (Bölüm 4.6) — fiyatsız */}
      {opportunities.length > 0 && (
        <section className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Package className="size-4" /> Satış fırsatları
            </h2>
            <Link href="/hizmetler" className="text-muted-foreground text-xs hover:underline">
              Hizmet listem
            </Link>
          </div>
          <ul className="space-y-2">
            {opportunities.map((o) => (
              <li key={o.area} className="flex items-start gap-3">
                <span className="text-amber-500">
                  {"★".repeat(o.priority)}
                  <span className="text-muted-foreground">{"★".repeat(3 - o.priority)}</span>
                </span>
                <div>
                  <div className="font-medium">{o.area}</div>
                  <div className="text-muted-foreground text-xs">{o.reasons.join(" · ")}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ön mesaj (nabız yoklama) */}
      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <MessageCircle className="size-4" /> Ön mesaj
          </h2>
          <span className="text-muted-foreground text-xs">
            Sistem üretir, sen gönderirsin.
          </span>
        </div>

        {!message ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              Firmanın canlı ve ilgili olup olmadığını ucuza yoklamak için kısa,
              kişisel bir WhatsApp mesajı üretilir.
            </p>
            <Button onClick={() => generate(false)} disabled={busy}>
              <Sparkles className={`size-4 ${busy ? "animate-pulse" : ""}`} />
              {busy ? "Üretiliyor…" : "Ön mesaj üret"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="bg-background w-full resize-y rounded-md border p-3 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Kopyalandı" : "Kopyala"}
              </Button>
              {waLink ? (
                <Button onClick={() => window.open(waLink, "_blank")}>
                  <MessageCircle className="size-4" /> WhatsApp’ta aç
                </Button>
              ) : (
                <span className="text-muted-foreground self-center text-xs">
                  (telefon yok — wa.me linki üretilemedi)
                </span>
              )}
              <Button variant="ghost" onClick={() => generate(true)} disabled={busy}>
                <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> Yeniden üret
              </Button>
              {status !== "ON_MESAJ_GONDERILDI" && (
                <Button variant="outline" onClick={markSent} disabled={busy}>
                  <Check className="size-4" /> Gönderildi olarak işaretle
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {err && (
        <div className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{err}</div>
      )}

      {/* Aktivite defteri (Bölüm 4.9) */}
      <section>
        <h2 className="mb-2 font-semibold">Firma defteri</h2>
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="Elle not ekle (ör. aradım, konuştuk…)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
          />
          <Button variant="outline" onClick={addNote} disabled={noteBusy || !note.trim()}>
            Not ekle
          </Button>
        </div>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz kayıt yok.</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="text-muted-foreground w-32 shrink-0 text-xs">
                  {new Date(a.createdAt).toLocaleString("tr-TR")}
                </span>
                <span className="flex-1">
                  {a.kind === "NOT" && (
                    <span className="mr-1.5 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      not
                    </span>
                  )}
                  {a.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
