import Link from "next/link";
import { ArrowRight, Stamp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const asamalar = [
  {
    no: "01",
    ad: "Arama",
    renk: "text-muted-foreground",
    aciklama: "Şehir + sektör ara, kaba ele, telefonla ara. Bedava.",
  },
  {
    no: "02",
    ad: "Potansiyel",
    renk: "text-primary",
    aciklama: "Telefonda olumlu döndü. Derin analiz + sunum burada açılır.",
  },
  {
    no: "03",
    ad: "Gerçek Müşteri",
    renk: "text-emerald-600 dark:text-emerald-400",
    aciklama: "Anlaşma tamam. Çoklu iş + ödeme takibi (elle).",
  },
];

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col justify-center gap-14 px-6 py-20">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl shadow-md">
            <Stamp className="size-5.5" />
          </span>
          <span className="font-heading text-lg font-extrabold tracking-tight">
            Damga<span className="text-primary">Panel</span>
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-primary text-sm font-semibold tracking-[0.14em] uppercase">
            AI Satış Zekâsı Sistemi
          </p>
          <h1 className="font-heading text-5xl leading-[1.05] font-extrabold text-balance sm:text-6xl">
            Kime, neyi,
            <br />
            hangi mesajla sat.
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">
            Şehir + sektör yaz; sistem sana satışa hazır, sıralanmış, mesajı
            yazılmış bir müşteri listesi çıkarsın.
          </p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Link
            href="/calisma-alani"
            className={buttonVariants({ size: "lg", className: "group gap-2" })}
          >
            Arama Alanı’na gir
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <span className="text-muted-foreground text-sm">Tek şirket · tek kullanıcı</span>
        </div>
      </div>

      {/* Huni */}
      <ol className="grid gap-4 sm:grid-cols-3">
        {asamalar.map((a) => (
          <li
            key={a.ad}
            className="bg-card/70 group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-colors hover:border-primary/40"
          >
            <div className="font-heading text-muted-foreground/40 text-4xl font-extrabold">
              {a.no}
            </div>
            <div className={`font-heading mt-1 text-lg font-bold ${a.renk}`}>{a.ad}</div>
            <p className="text-muted-foreground mt-1 text-sm">{a.aciklama}</p>
          </li>
        ))}
      </ol>

      <p className="text-muted-foreground/70 text-xs">
        Değişmez kurallar: sistem mesajı sen gönderirsin · pahalı iş elle
        tetiklenir · para hunide aşağı indikçe harcanır.
      </p>
    </main>
  );
}
