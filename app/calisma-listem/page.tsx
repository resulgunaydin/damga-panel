import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/business";
import type { FunnelStage } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

const STAGES: {
  key: FunnelStage;
  title: string;
  note: string;
  accent: string;
}[] = [
  {
    key: "ELEME",
    title: "Eleme Müşterisi",
    note: "Seçildi — dönüş gelene kadar “Yeni”. (Seçim ≠ Potansiyel)",
    accent: "border-border",
  },
  {
    key: "POTANSIYEL",
    title: "Potansiyel Müşteri",
    note: "Ön mesaja dönüş geldi; kozlar burada açılır.",
    accent: "border-orange-300 dark:border-orange-900/60",
  },
  {
    key: "MUSTERI",
    title: "Gerçek Müşteri",
    note: "Anlaşma tamam; iş + ödeme takibi.",
    accent: "border-green-300 dark:border-green-900/60",
  },
];

export default async function CalismaListemPage() {
  const businesses = await prisma.business.findMany({
    where: { inWorkList: true, blacklisted: false },
    orderBy: [{ coarseScore: "desc" }],
    select: {
      id: true,
      name: true,
      status: true,
      stage: true,
      coarseScore: true,
      googleRating: true,
      googleReviews: true,
      search: { select: { id: true, city: true, district: true, sector: true } },
    },
  });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Çalışma Alanı
        </Link>
        <h1 className="text-2xl font-semibold">Çalışma Listem</h1>
        <p className="text-muted-foreground text-sm">
          Seçtiğin firmalar. Kanban panosu #7’de gelecek; şimdilik aşamaya göre liste.
        </p>
      </div>

      {businesses.length === 0 ? (
        <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
          <p>Çalışma listen boş.</p>
          <p className="text-xs">
            Bir segmentte firmalara “Çalışmaya ekle” diyerek başla.
          </p>
        </div>
      ) : (
        STAGES.map((stage) => {
          const items = businesses.filter((b) => b.stage === stage.key);
          if (items.length === 0) return null;
          return (
            <section key={stage.key}>
              <div className="mb-2">
                <h2 className="font-semibold">
                  {stage.title}{" "}
                  <span className="text-muted-foreground text-sm font-normal">
                    · {items.length}
                  </span>
                </h2>
                <p className="text-muted-foreground text-xs">{stage.note}</p>
              </div>
              <div className={`divide-y overflow-hidden rounded-lg border ${stage.accent}`}>
                {items.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                      {b.coarseScore}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {b.search
                          ? `${b.search.city}${b.search.district ? " · " + b.search.district : ""} · ${b.search.sector}`
                          : "—"}
                        {b.googleRating != null && (
                          <span className="ml-2 inline-flex items-center gap-0.5">
                            <Star className="size-3 fill-current text-amber-500" />
                            {b.googleRating.toFixed(1)} ({b.googleReviews ?? 0})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
