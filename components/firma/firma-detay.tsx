"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CalendarPlus,
  Check,
  Clock,
  Copy,
  Globe,
  Package,
  Phone,
  PhoneOff,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { classifyWebsite } from "@/lib/website";
import { IsTakibi, type Job } from "@/components/firma/is-takibi";
import { AnalizPanel, type AnalysisRecord } from "@/components/firma/analiz-panel";

const STATUS_LABEL: Record<string, string> = {
  YENI: "Yeni",
  ARAMAYA_HAZIR: "Aramaya hazır",
  ARANDI_ULASILAMADI: "Arandı — ulaşılamadı",
  SUNUM_GONDERILDI: "Sunum gönderildi",
  RANDEVU: "Randevu ayarlandı",
  TEKLIF_YAPILDI: "Teklif yapıldı",
  KAYIP: "Kayıp",
  IS_DEVAM: "İş devam ediyor",
  IS_BITTI: "İş bitti",
};

const CALL_LOSS_REASONS: [string, string][] = [
  ["ILGISIZ", "İlgisiz"],
  ["FIYAT", "Fiyat"],
  ["RAKIBE_GITTI", "Rakibe gitti"],
  ["IHTIYAC_YOK", "İhtiyaç yok"],
  ["ULASILAMADI", "Ulaşılamadı"],
];

const CALL_OUTCOME_LABEL: Record<string, string> = {
  ULASILDI_KABUL: "Ulaşıldı — sunum istiyor",
  ULASILDI_RET: "Ulaşıldı — ilgilenmiyor",
  ULASILAMADI: "Ulaşılamadı",
  TEKRAR_ARA: "Sonra tekrar ara",
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
type AppointmentRecord = {
  id: string;
  scheduledAt: string;
  location: string | null;
  note: string | null;
  status: string;
};

type Opportunity = { area: string; priority: number; reasons: string[] };

export function FirmaDetay({
  business,
  opportunities,
  initialMessage,
  appointments: initialAppointments,
  activities: initialActivities,
  isCustomer,
  jobs,
  hasPlaceId,
  hasSearch,
  hasWebsite,
  analyses,
}: {
  business: Business;
  opportunities: Opportunity[];
  initialMessage: string | null;
  appointments: AppointmentRecord[];
  activities: Activity[];
  isCustomer: boolean;
  jobs: Job[];
  hasPlaceId: boolean;
  hasSearch: boolean;
  hasWebsite: boolean;
  analyses: AnalysisRecord[];
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
  const [callLossOpen, setCallLossOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(initialAppointments);
  const [apt, setApt] = useState({ when: "", location: "", note: "" });
  const [aptBusy, setAptBusy] = useState(false);

  // Aramaya uygun (eleme) aşamasındaki durumlar — arama sonucu butonları burada gösterilir.
  const isCallable =
    status === "YENI" || status === "ARAMAYA_HAZIR" || status === "ARANDI_ULASILAMADI";
  // Sunum gönderildikten sonra randevu ayarlanabilir.
  const canSchedule =
    status === "SUNUM_GONDERILDI" || status === "RANDEVU" || status === "TEKLIF_YAPILDI";

  async function createAppointment() {
    if (!apt.when) return;
    setAptBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/businesses/${business.id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date(apt.when).toISOString(),
          location: apt.location,
          note: apt.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Randevu kaydedilemedi.");
      const ap = data.appointment;
      setAppointments((list) => [
        {
          id: ap.id,
          scheduledAt: ap.scheduledAt,
          location: ap.location,
          note: ap.note,
          status: ap.status,
        },
        ...list,
      ]);
      setStatus("RANDEVU");
      setActivities((a) => [
        {
          id: crypto.randomUUID(),
          kind: "SISTEM",
          message: `Randevu ayarlandı: ${new Date(ap.scheduledAt).toLocaleString("tr-TR")}`,
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
      setApt({ when: "", location: "", note: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Randevu kaydedilemedi.");
    } finally {
      setAptBusy(false);
    }
  }

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

  async function generate(regenerate = false) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/businesses/${business.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "ARAMA_SCRIPT", regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Üretim başarısız.");
      setMessage(data.message.content);
      if (!data.cached) {
        // Script üretmek "aramaya hazır" sinyali (server tarafında YENI → ARAMAYA_HAZIR).
        if (status === "YENI") setStatus("ARAMAYA_HAZIR");
        setActivities((a) => [
          {
            id: crypto.randomUUID(),
            kind: "SISTEM",
            message: "Arama script'i üretildi.",
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

  // Telefon araması sonucunu kaydeder (telefon pivotu).
  async function recordOutcome(
    outcome: "ULASILDI_KABUL" | "ULASILDI_RET" | "ULASILAMADI" | "TEKRAR_ARA",
    extra?: { lossReason?: string; nextCallAt?: string },
  ) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/businesses/${business.id}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi.");
      setStatus(data.status);
      setActivities((a) => [
        {
          id: crypto.randomUUID(),
          kind: "SISTEM",
          message: `Arama: ${CALL_OUTCOME_LABEL[outcome]}${
            data.status ? ` → ${STATUS_LABEL[data.status]}` : ""
          }`,
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Arama kaydedilemedi.");
    } finally {
      setBusy(false);
      setCallLossOpen(false);
    }
  }

  function laterCall() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    recordOutcome("TEKRAR_ARA", { nextCallAt: d.toISOString() });
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-listem"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Çalışma Listem
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
              {(() => {
                const kind = classifyWebsite(business.website);
                if (kind === "gercek")
                  return (
                    <a
                      href={business.website!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Globe className="size-3.5" /> web sitesi
                    </a>
                  );
                if (kind === "sosyal")
                  return (
                    <a
                      href={business.website!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400"
                      title="Sadece sosyal medya — gerçek sitesi yok"
                    >
                      sosyal medya
                    </a>
                  );
                return <span className="font-medium text-orange-600">site yok</span>;
              })()}
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

      {/* Derin Analiz (Bölüm 4.5) — elle tetiklenir */}
      <AnalizPanel
        businessId={business.id}
        hasPlaceId={hasPlaceId}
        hasSearch={hasSearch}
        hasWebsite={hasWebsite}
        initial={analyses}
      />

      {/* Sunum editörü linki (Bölüm 4.8) */}
      <Link
        href={`/firma/${business.id}/sunum`}
        className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/40"
      >
        <div>
          <div className="font-medium">Sunum hazırla</div>
          <div className="text-muted-foreground text-sm">
            Analiz verisinden ikna sunumu (AI taslak, HTML/PDF) — fiyat yok.
          </div>
        </div>
        <span className="text-muted-foreground">→</span>
      </Link>

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

      {/* Arama script'i (telefon pivotu) */}
      <section className="overflow-hidden rounded-xl border">
        {/* Başlık + birincil eylem: ARA */}
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Phone className="size-4" /> Arama
            </h2>
            <p className="text-muted-foreground text-xs">
              Firmayı ara, sonra görüşmenin sonucunu işaretle.
            </p>
          </div>
          {business.phone ? (
            <a
              href={`tel:${business.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Phone className="size-4.5" />
              <span className="tabular-nums">{business.phone}</span>
            </a>
          ) : (
            <span className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">
              Telefon numarası yok
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* Arama script'i — opsiyonel yardımcı */}
          <div className="bg-muted/20 rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{"Arama script'i"}</span>
                <span className="text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  opsiyonel
                </span>
              </div>
              <div className="flex items-center gap-1">
                {message && (
                  <>
                    <Button size="xs" variant="ghost" onClick={copy}>
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                      {copied ? "Kopyalandı" : "Kopyala"}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => generate(true)} disabled={busy}>
                      <RefreshCw className={`size-3 ${busy ? "animate-spin" : ""}`} /> Yenile
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setScriptOpen((o) => !o)}>
                      {scriptOpen ? "Gizle" : "Göster"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {!message ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3">
                <p className="text-muted-foreground max-w-md text-xs">
                  Açılış konuşması + olası itirazlara cevap notları. İstersen üret, zorunlu değil.
                </p>
                <Button size="sm" variant="outline" onClick={() => generate(false)} disabled={busy}>
                  <Sparkles className={`size-3.5 ${busy ? "animate-pulse" : ""}`} />
                  {busy ? "Üretiliyor…" : "Üret"}
                </Button>
              </div>
            ) : (
              scriptOpen && (
                <div className="border-t p-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={10}
                    className="bg-background w-full resize-y rounded-md border p-3 text-sm leading-relaxed"
                  />
                </div>
              )
            )}
          </div>

          {/* Görüşme sonucu */}
          {isCallable && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Görüşme sonucu</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <OutcomeCard
                  icon={<Check className="size-4" />}
                  title="Ulaşıldı — sunum istiyor"
                  hint="Sunum gönderildi'ye geçer"
                  accent="emerald"
                  disabled={busy}
                  onClick={() => recordOutcome("ULASILDI_KABUL")}
                />
                <OutcomeCard
                  icon={<ThumbsDown className="size-4" />}
                  title="İlgilenmiyor"
                  hint="Kayıp olarak kapanır (sebep sorulur)"
                  accent="red"
                  disabled={busy}
                  onClick={() => setCallLossOpen(true)}
                />
                <OutcomeCard
                  icon={<PhoneOff className="size-4" />}
                  title="Ulaşılamadı"
                  hint="Tekrar arama görevi açılır"
                  accent="neutral"
                  disabled={busy}
                  onClick={() => recordOutcome("ULASILAMADI")}
                />
                <OutcomeCard
                  icon={<Clock className="size-4" />}
                  title="Sonra ara"
                  hint="2 gün sonra kuyruğa geri döner"
                  accent="neutral"
                  disabled={busy}
                  onClick={laterCall}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* İlgilenmiyor → kayıp sebebi */}
      <Dialog open={callLossOpen} onOpenChange={setCallLossOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İlgilenmiyor — kayıp sebebi</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {CALL_LOSS_REASONS.map(([key, label]) => (
              <Button
                key={key}
                variant="outline"
                onClick={() => recordOutcome("ULASILDI_RET", { lossReason: key })}
              >
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Randevu (telefon pivotu) — sunum gönderildikten sonra */}
      {canSchedule && (
        <section className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarPlus className="size-4" /> Randevu
            </h2>
            <span className="text-muted-foreground text-xs">
              Kaydedince Görev Kutusuna hatırlatma düşer.
            </span>
          </div>

          {appointments.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {appointments.map((ap) => (
                <li key={ap.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-medium">
                    {new Date(ap.scheduledAt).toLocaleString("tr-TR")}
                  </span>
                  {ap.location && <span className="text-muted-foreground">· {ap.location}</span>}
                  {ap.note && <span className="text-muted-foreground w-full text-xs">{ap.note}</span>}
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="datetime-local"
              value={apt.when}
              onChange={(e) => setApt((s) => ({ ...s, when: e.target.value }))}
              className="bg-background h-9 rounded-md border px-2 text-sm"
            />
            <Input
              placeholder="Yer (adres / telefon / video linki)"
              value={apt.location}
              onChange={(e) => setApt((s) => ({ ...s, location: e.target.value }))}
            />
            <Input
              placeholder="Not (opsiyonel)"
              value={apt.note}
              onChange={(e) => setApt((s) => ({ ...s, note: e.target.value }))}
              className="sm:col-span-2"
            />
          </div>
          <Button onClick={createAppointment} disabled={aptBusy || !apt.when} className="mt-3">
            <CalendarPlus className="size-4" /> {aptBusy ? "Kaydediliyor…" : "Randevu ayarla"}
          </Button>
        </section>
      )}

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

// Görüşme sonucu seçeneği: ikon + başlık + ne olacağını söyleyen kısa ipucu.
const OUTCOME_ACCENT = {
  emerald:
    "border-emerald-300 bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70",
  red: "hover:border-red-300 hover:bg-red-50 hover:text-red-800 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-100",
  neutral: "hover:bg-accent",
} as const;

function OutcomeCard({
  icon,
  title,
  hint,
  accent,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  accent: keyof typeof OUTCOME_ACCENT;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50 ${OUTCOME_ACCENT[accent]}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs opacity-70">{hint}</span>
      </span>
    </button>
  );
}
