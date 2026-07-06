import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const asamalar = [
  {
    ad: "Eleme Müşterisi",
    renk: "text-zinc-500",
    aciklama: "Şehir + sektör ara, kaba eleme, çalışma listesi. (Bedava)",
  },
  {
    ad: "Potansiyel Müşteri",
    renk: "text-orange-500",
    aciklama: "Ön mesaja dönüş geldi. Derin analiz + sunum burada açılır.",
  },
  {
    ad: "Gerçek Müşteri",
    renk: "text-green-600",
    aciklama: "Anlaşma tamam. Çoklu iş + ödeme takibi (elle).",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-24">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-orange-500 uppercase">
          AI Satış Zekâsı Sistemi
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          DamgaPanel
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Şehir + sektör yaz; sistem sana satışa hazır, sıralanmış, mesajı
          yazılmış bir müşteri listesi çıkarsın.
        </p>
      </div>

      <ol className="grid gap-4">
        {asamalar.map((a, i) => (
          <li
            key={a.ad}
            className="bg-card flex gap-4 rounded-lg border p-4"
          >
            <span className="text-muted-foreground font-mono text-sm">
              {i + 1}
            </span>
            <div className="space-y-1">
              <p className={`font-medium ${a.renk}`}>{a.ad}</p>
              <p className="text-muted-foreground text-sm">{a.aciklama}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3">
        <Link href="/calisma-alani" className={buttonVariants()}>
          Çalışma Alanı’na git
        </Link>
        <span className="text-muted-foreground text-sm">
          Klasörler + arama segmentleri hazır.
        </span>
      </div>
    </main>
  );
}
