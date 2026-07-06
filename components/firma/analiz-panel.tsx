"use client";

import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Metric = { label: string; value: string; level: "kesin" | "tahmini" | "tespit-edilemedi" };
type AnalysisResult = { metrics: Metric[]; summary: string };
export type AnalysisRecord = {
  kind: string;
  result: AnalysisResult;
  generatedAt: string;
};

const LEVEL_STYLE: Record<Metric["level"], string> = {
  kesin: "text-green-700 dark:text-green-300",
  tahmini: "text-amber-700 dark:text-amber-300",
  "tespit-edilemedi": "text-muted-foreground italic",
};
const LEVEL_LABEL: Record<Metric["level"], string> = {
  kesin: "kesin",
  tahmini: "tahmini",
  "tespit-edilemedi": "tespit edilemedi",
};

export function AnalizPanel({
  businessId,
  hasPlaceId,
  initial,
}: {
  businessId: string;
  hasPlaceId: boolean;
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

  const gbp = analyses["GOOGLE_BUSINESS"];

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <BarChart3 className="size-4" /> Derin Analiz
        </h2>
        <span className="text-muted-foreground text-xs">Elle tetiklenir (pahalı adım)</span>
      </div>

      {err && <div className="mb-3 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{err}</div>}

      {/* Google Business */}
      <div className="rounded-md border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">Google Business</span>
          {gbp ? (
            <Button variant="ghost" size="sm" onClick={() => run("GOOGLE_BUSINESS", true)} disabled={busy === "GOOGLE_BUSINESS"}>
              <RefreshCw className={`size-3.5 ${busy === "GOOGLE_BUSINESS" ? "animate-spin" : ""}`} /> Tazele
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => run("GOOGLE_BUSINESS")}
              disabled={busy === "GOOGLE_BUSINESS" || !hasPlaceId}
              title={hasPlaceId ? "" : "Google kaydı (place_id) yok"}
            >
              {busy === "GOOGLE_BUSINESS" ? "Analiz ediliyor…" : "Analiz yap"}
            </Button>
          )}
        </div>

        {gbp ? (
          <div className="space-y-2">
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {gbp.result.metrics.map((m) => (
                <div key={m.label} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className={LEVEL_STYLE[m.level]}>
                    {m.value}
                    {m.level !== "kesin" && (
                      <span className="text-muted-foreground ml-1 text-xs">({LEVEL_LABEL[m.level]})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm">{gbp.result.summary}</p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {hasPlaceId
              ? "Yorum, puan, son yorum ve aktivite analizi için “Analiz yap”a bas."
              : "Manuel eklenen firma — Google kaydı olmadan GBP analizi yapılamaz."}
          </p>
        )}
      </div>

      {/* Website (#13) ve Rakip (#15) yakında */}
      <p className="text-muted-foreground mt-3 text-xs">
        Website analizi (PageSpeed) ve rakip kıyası yakında bu panele eklenecek.
      </p>
    </section>
  );
}
