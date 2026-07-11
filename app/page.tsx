import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Gauge,
  LayoutGrid,
  ListChecks,
  Phone,
  Trophy,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listActiveTasks } from "@/lib/tasks";
import { getCaps, getTodayTotal } from "@/lib/quota";

export const dynamic = "force-dynamic";

const WORK = { inWorkList: true, blacklisted: false } as const;

function relDay(iso: Date): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);
  const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (days === 0) return `Bugün ${saat}`;
  if (days === 1) return `Yarın ${saat}`;
  if (days < 0) return `${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${saat}`;
  return `${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${saat}`;
}

export default async function Home() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [eleme, potansiyel, musteri, callQueue, apptCount, upcomingAppts, tasks, workScored, caps, todayUsage] =
    await Promise.all([
      prisma.business.count({ where: { ...WORK, stage: "ELEME" } }),
      prisma.business.count({ where: { ...WORK, stage: "POTANSIYEL" } }),
      prisma.business.count({ where: { ...WORK, stage: "MUSTERI" } }),
      prisma.business.count({
        where: { ...WORK, stage: "ELEME", OR: [{ inCallList: true }, { nextCallAt: { lte: now } }] },
      }),
      prisma.appointment.count({ where: { status: "PLANLANDI", scheduledAt: { gte: startToday } } }),
      prisma.appointment.findMany({
        where: { status: "PLANLANDI", scheduledAt: { gte: startToday } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: { business: { select: { id: true, name: true } } },
      }),
      listActiveTasks(),
      prisma.business.findMany({ where: WORK, select: { scoreBreakdown: true } }),
      getCaps(),
      getTodayTotal(),
    ]);

  let sicak = 0,
    ilik = 0,
    soguk = 0;
  for (const b of workScored) {
    const bucket = (b.scoreBreakdown as { bucket?: string } | null)?.bucket;
    if (bucket === "SICAK") sicak++;
    else if (bucket === "ILIK") ilik++;
    else if (bucket === "SOGUK") soguk++;
  }
  const scoredTotal = sicak + ilik + soguk || 1;
  const usagePct = Math.min(100, Math.round((todayUsage / (caps.dailyCap || 1)) * 100));

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Panel</h1>
          <p className="text-muted-foreground text-sm">
            {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/calisma-alani"
            className="hover:bg-accent inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium"
          >
            <LayoutGrid className="size-4" /> Arama Alanı
          </Link>
          <Link
            href="/calisma-listem"
            className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
          >
            <Phone className="size-4" /> Çalışma Listem
          </Link>
        </div>
      </div>

      {/* KPI satırı */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          href="/calisma-listem"
          icon={<Phone className="size-5" />}
          label="Bugün aranacak"
          value={callQueue}
          accent="emerald"
        />
        <Kpi
          href="/randevular"
          icon={<CalendarDays className="size-5" />}
          label="Yaklaşan randevu"
          value={apptCount}
          accent="primary"
        />
        <Kpi
          href="/gorevler"
          icon={<ListChecks className="size-5" />}
          label="Açık görev"
          value={tasks.length}
          accent="amber"
        />
        <Kpi
          href="/calisma-listem"
          icon={<Trophy className="size-5" />}
          label="Gerçek müşteri"
          value={musteri}
          accent="emerald"
        />
      </div>

      {/* Huni */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
          Çalışma hunisi
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <FunnelCard label="Arama" value={eleme} dot="bg-zinc-400" />
          <FunnelCard label="Potansiyel" value={potansiyel} dot="bg-primary" />
          <FunnelCard label="Gerçek Müşteri" value={musteri} dot="bg-emerald-500" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Yaklaşan randevular */}
        <section className="rounded-2xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarDays className="size-4" /> Yaklaşan randevular
            </h2>
            <Link href="/randevular" className="text-muted-foreground text-xs hover:underline">
              Tümü →
            </Link>
          </div>
          {upcomingAppts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Yaklaşan randevu yok.</p>
          ) : (
            <ul className="divide-y">
              {upcomingAppts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={a.business ? `/firma/${a.business.id}` : "/randevular"}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {a.business?.name ?? "Randevu"}
                  </Link>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {relDay(a.scheduledAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Açık görevler */}
        <section className="rounded-2xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <ListChecks className="size-4" /> Açık görevler
            </h2>
            <Link href="/gorevler" className="text-muted-foreground text-xs hover:underline">
              Tümü →
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Açık görev yok.</p>
          ) : (
            <ul className="divide-y">
              {tasks.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={t.business ? `/firma/${t.business.id}` : "/gorevler"}
                    className="min-w-0 flex-1 truncate text-sm hover:underline"
                  >
                    {t.title}
                  </Link>
                  {t.dueAt && (
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {relDay(t.dueAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Skor dağılımı */}
        <section className="rounded-2xl border p-4">
          <h2 className="mb-3 font-semibold">Fırsat dağılımı (çalışma listem)</h2>
          {sicak + ilik + soguk === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz puanlanmış firma yok.</p>
          ) : (
            <div className="space-y-2">
              <DistRow label="🔥 Sıcak" count={sicak} total={scoredTotal} color="bg-orange-500" />
              <DistRow label="🟡 Ilık" count={ilik} total={scoredTotal} color="bg-amber-400" />
              <DistRow label="⚪ Soğuk" count={soguk} total={scoredTotal} color="bg-muted-foreground/40" />
            </div>
          )}
        </section>

        {/* Kullanım */}
        <section className="rounded-2xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Gauge className="size-4" /> Bugünkü kullanım
            </h2>
            <Link href="/kullanim" className="text-muted-foreground text-xs hover:underline">
              Ayrıntı →
            </Link>
          </div>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">API sorgusu</span>
            <span className="font-medium tabular-nums">
              {todayUsage} / {caps.dailyCap}
            </span>
          </div>
          <div className="bg-muted h-2.5 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-400" : "bg-primary"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Günlük tavanın %{usagePct}’i kullanıldı.
          </p>
        </section>
      </div>
    </main>
  );
}

const ACCENTS = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  primary: "text-primary",
  amber: "text-amber-600 dark:text-amber-400",
} as const;

function Kpi({
  href,
  icon,
  label,
  value,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: keyof typeof ACCENTS;
}) {
  return (
    <Link
      href={href}
      className="hover:border-primary/40 hover:bg-accent/40 flex flex-col gap-2 rounded-2xl border p-4 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className={ACCENTS[accent]}>{icon}</span>
        <ArrowRight className="text-muted-foreground/40 size-4" />
      </div>
      <div>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        <div className="text-muted-foreground text-sm">{label}</div>
      </div>
    </Link>
  );
}

function FunnelCard({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="bg-muted/30 rounded-xl border p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-muted-foreground mt-0.5 inline-flex items-center gap-1.5 text-xs">
        <span className={`size-2 rounded-full ${dot}`} /> {label}
      </div>
    </div>
  );
}

function DistRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-sm">{label}</span>
      <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(count / total) * 100}%` }} />
      </div>
      <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
        {count}
      </span>
    </div>
  );
}
