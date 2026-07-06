"use client";

import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Metric = { label: string; value: string; level: "kesin" | "tahmini" | "tespit-edilemedi" };
type GbpResult = { metrics: Metric[]; summary: string };
type CompRow = {
  name: string;
  rating: number | null;
  reviews: number | null;
  hasWebsite: boolean;
  score: number;
  self: boolean;
};
type CompResult = { rows: CompRow[]; explanation: string };

export type AnalysisRecord = {
  kind: string;
  result: unknown;
  generatedAt: string;
};

const LEVEL_STYLE: Record<Metric["level"], string> = {
  kesin: "text-green-700 dark:text-green-300",
  tahmini: "text-amber-700 dark:text-amber-300",
  "tespit-edilemedi": "text-muted-foreground italic",
};

export function AnalizPanel({
  businessId,
  hasPlaceId,
  hasSearch,
  hasWebsite,
  initial,
}: {
  businessId: string;
  hasPlaceId: boolean;
  hasSearch: boolean;
  hasWebsite: boolean;
  initial: AnalysisRecord[];
}) {
  const [analyses, setAnalyses] = useState<Record<string, AnalysisRecord>>(
    Object.fromEntries(initial.map((a) => [a.kind, a])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(kind: string, force = false) {
    setBusy(kind);
    setErr(null);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/analyze?kind=${kind}${force ? "&force=1" : ""}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analiz başarısız.");
      setAnalyses((a) => ({ ...a, [kind]: data.analysis }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  const website = analyses["WEBSITE"]?.result as GbpResult | undefined;
  const gbp = analyses["GOOGLE_BUSINESS"]?.result as GbpResult | undefined;
  const comp = analyses["COMPETITOR"]?.result as CompResult | undefined;

  // Veri tazeliği (Bölüm 5 — cache şeffaflığı)
  const fresh = (kind: string) =>
    analyses[kind] ? new Date(analyses[kind].generatedAt).toLocaleDateString("tr-TR") : null;
  const Fresh = ({ kind }: { kind: string }) =>
    fresh(kind) ? (
      <span className="text-muted-foreground ml-2 text-xs font-normal">· güncel {fresh(kind)}</span>
    ) : null;

  const MetricList = ({ data }: { data: GbpResult }) => (
    <div className="space-y-2">
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {data.metrics.map((m) => (
          <div key={m.label} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{m.label}</span>
            <span className={LEVEL_STYLE[m.level]}>
              {m.value}
              {m.level !== "kesin" && (
                <span className="text-muted-foreground ml-1 text-xs">({m.level})</span>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm">{data.summary}</p>
    </div>
  );

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <BarChart3 className="size-4" /> Derin Analiz
        </h2>
        <span className="text-muted-foreground text-xs">Elle tetiklenir (pahalı adım)</span>
      </div>

      {err && <div className="mb-3 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{err}</div>}

      <div className="space-y-3">
        {/* Website */}
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Website<Fresh kind="WEBSITE" /></span>
            {website ? (
              <Button variant="ghost" size="sm" onClick={() => run("WEBSITE", true)} disabled={busy === "WEBSITE"}>
                <RefreshCw className={`size-3.5 ${busy === "WEBSITE" ? "animate-spin" : ""}`} /> Tazele
              </Button>
            ) : (
              <Button size="sm" onClick={() => run("WEBSITE")} disabled={busy === "WEBSITE" || !hasWebsite} title={hasWebsite ? "" : "Web sitesi yok"}>
                {busy === "WEBSITE" ? "Analiz ediliyor…" : "Analiz yap"}
              </Button>
            )}
          </div>
          {website ? (
            <MetricList data={website} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {hasWebsite
                ? "Gerçek tarayıcı + PageSpeed ile hız/SEO/mobil analizi için “Analiz yap”a bas."
                : "Web sitesi yok — satış açısı zaten burada (site yok)."}
            </p>
          )}
        </div>

        {/* Google Business */}
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Google Business<Fresh kind="GOOGLE_BUSINESS" /></span>
            {gbp ? (
              <Button variant="ghost" size="sm" onClick={() => run("GOOGLE_BUSINESS", true)} disabled={busy === "GOOGLE_BUSINESS"}>
                <RefreshCw className={`size-3.5 ${busy === "GOOGLE_BUSINESS" ? "animate-spin" : ""}`} /> Tazele
              </Button>
            ) : (
              <Button size="sm" onClick={() => run("GOOGLE_BUSINESS")} disabled={busy === "GOOGLE_BUSINESS" || !hasPlaceId} title={hasPlaceId ? "" : "Google kaydı (place_id) yok"}>
                {busy === "GOOGLE_BUSINESS" ? "Analiz ediliyor…" : "Analiz yap"}
              </Button>
            )}
          </div>
          {gbp ? (
            <div className="space-y-2">
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {gbp.metrics.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className={LEVEL_STYLE[m.level]}>
                      {m.value}
                      {m.level !== "kesin" && (
                        <span className="text-muted-foreground ml-1 text-xs">({m.level})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm">{gbp.summary}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {hasPlaceId
                ? "Yorum, puan, son yorum ve aktivite analizi için “Analiz yap”a bas."
                : "Manuel firma — Google kaydı olmadan GBP analizi yapılamaz."}
            </p>
          )}
        </div>

        {/* Rakip analizi */}
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Rakip kıyası<Fresh kind="COMPETITOR" /></span>
            {comp ? (
              <Button variant="ghost" size="sm" onClick={() => run("COMPETITOR", true)} disabled={busy === "COMPETITOR"}>
                <RefreshCw className={`size-3.5 ${busy === "COMPETITOR" ? "animate-spin" : ""}`} /> Tazele
              </Button>
            ) : (
              <Button size="sm" onClick={() => run("COMPETITOR")} disabled={busy === "COMPETITOR" || !hasSearch} title={hasSearch ? "" : "Bir aramaya bağlı değil"}>
                {busy === "COMPETITOR" ? "Analiz ediliyor…" : "Analiz yap"}
              </Button>
            )}
          </div>
          {comp ? (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-left text-xs">
                    <tr>
                      <th className="py-1 pr-2 font-medium">Firma</th>
                      <th className="py-1 pr-2 font-medium">Puan</th>
                      <th className="py-1 pr-2 font-medium">Yorum</th>
                      <th className="py-1 font-medium">Site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comp.rows.map((r, i) => (
                      <tr key={i} className={`border-t ${r.self ? "font-medium text-orange-600" : ""}`}>
                        <td className="py-1 pr-2">{r.self ? "» " : ""}{r.name}</td>
                        <td className="py-1 pr-2">{r.rating ?? "—"}</td>
                        <td className="py-1 pr-2">{r.reviews ?? "—"}</td>
                        <td className="py-1">{r.hasWebsite ? "var" : "yok"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm">
                {comp.explanation}
                <span className="text-muted-foreground ml-1 text-xs">(AI yorumu · tahmini)</span>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {hasSearch
                ? "Aynı şehir+sektördeki en üst firmalarla kıyas + AI açıklaması."
                : "Manuel firma — kıyaslanacak segment yok."}
            </p>
          )}
        </div>
      </div>

    </section>
  );
}
