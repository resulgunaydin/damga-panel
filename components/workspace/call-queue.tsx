"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  FileText,
  MapPin,
  Phone,
  PhoneOff,
  Star,
  ThumbsDown,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Arama kuyruğu firması (KanbanBoard'daki Firm'in alt kümesi + arama alanları).
export type CallFirm = {
  id: string;
  name: string;
  status: string;
  coarseScore: number;
  phone: string | null;
  address: string | null;
  mapsUri: string | null;
  googleRating: number | null;
  googleReviews: number | null;
  nextCallAt: string | null;
  context: string | null;
};

type FirmPatch = { status: string; stage: string; inCallList: boolean; nextCallAt: string | null };

const LOSS_REASONS: [string, string][] = [
  ["ILGISIZ", "İlgisiz"],
  ["FIYAT", "Fiyat"],
  ["RAKIBE_GITTI", "Rakibe gitti"],
  ["IHTIYAC_YOK", "İhtiyaç yok"],
  ["ULASILAMADI", "Ulaşılamadı"],
];

export function CallQueue({
  firms,
  onUpdated,
  onRemove,
}: {
  firms: CallFirm[];
  onUpdated: (id: string, patch: FirmPatch) => void;
  onRemove: (id: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lossFor, setLossFor] = useState<string | null>(null);
  const [now] = useState(() => Date.now()); // render sırasında sabit an

  function flash(m: string) {
    setErr(m);
    setTimeout(() => setErr(null), 2500);
  }

  async function record(
    id: string,
    outcome: "ULASILDI_KABUL" | "ULASILDI_RET" | "ULASILAMADI" | "TEKRAR_ARA",
    extra?: { lossReason?: string; nextCallAt?: string },
  ) {
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch(`/api/businesses/${id}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi.");
      const status: string = data.status;
      const stage =
        status === "SUNUM_GONDERILDI" || status === "KAYIP" ? "POTANSIYEL" : "ELEME";
      // TEKRAR_ARA hariç kuyruktan düşer.
      if (outcome === "TEKRAR_ARA") {
        onUpdated(id, {
          status,
          stage,
          inCallList: false,
          nextCallAt: extra?.nextCallAt ?? null,
        });
      } else {
        onUpdated(id, { status, stage, inCallList: false, nextCallAt: null });
        onRemove(id);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  function laterCall(id: string) {
    // Varsayılan: 2 gün sonra tekrar ara.
    const d = new Date();
    d.setDate(d.getDate() + 2);
    record(id, "TEKRAR_ARA", { nextCallAt: d.toISOString() });
  }

  if (firms.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center">
        <Phone className="size-6" />
        <p>Bugünkü arama kuyruğu boş.</p>
        <p className="text-xs">
          Bir firmayı aramak için satırındaki telefon simgesiyle “Bugün Ara”ya ekle.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {err && <div className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{err}</div>}
      <p className="text-muted-foreground text-sm">
        {firms.length} firma aranacak. Ara → sonucu işaretle. “Ulaşıldı, sunum istiyor”
        seçince firma <b>Sunum gönderildi</b>’ye geçer.
      </p>

      {firms.map((f) => {
        const mapsHref =
          f.mapsUri ??
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.name} ${f.address ?? ""}`)}`;
        const due = f.nextCallAt ? new Date(f.nextCallAt) : null;
        const isBusy = busy === f.id;
        return (
          <div key={f.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-start gap-3">
              <span
                className="bg-muted grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums"
                title="Fırsat skoru"
              >
                {f.coarseScore}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/firma/${f.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium break-words hover:underline"
                >
                  {f.name}
                </Link>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                  {f.context && <span>{f.context}</span>}
                  {f.googleRating != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="size-3 fill-current text-amber-500" />
                      {f.googleRating.toFixed(1)}
                      {f.googleReviews != null && ` (${f.googleReviews})`}
                    </span>
                  )}
                  {due && due.getTime() <= now && (
                    <span className="text-primary">tekrar arama zamanı</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {f.phone ? (
                  <a
                    href={`tel:${f.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    title="Ara"
                  >
                    <Phone className="size-4" /> {f.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground text-xs">telefon yok</span>
                )}
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center rounded-md border p-1.5"
                  title="Haritada aç"
                >
                  <MapPin className="size-3.5" />
                </a>
                <Link
                  href={`/firma/${f.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium"
                  title="Arama script'i firma detayında"
                >
                  <FileText className="size-3.5" /> Script
                </Link>
                <button
                  onClick={() => onRemove(f.id)}
                  className="text-muted-foreground hover:bg-accent shrink-0 rounded-md p-1.5 hover:text-red-600"
                  title="Bugünkü listeden çıkar"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Arama sonucu */}
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              <Button
                size="sm"
                disabled={isBusy}
                onClick={() => record(f.id, "ULASILDI_KABUL")}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="size-4" /> Ulaşıldı — sunum istiyor
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => setLossFor(f.id)}
              >
                <ThumbsDown className="size-4" /> İlgilenmiyor
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => record(f.id, "ULASILAMADI")}
              >
                <PhoneOff className="size-4" /> Ulaşılamadı
              </Button>
              <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => laterCall(f.id)}>
                Sonra ara (2 gün)
              </Button>
            </div>
          </div>
        );
      })}

      {/* İlgilenmiyor → kayıp sebebi */}
      <Dialog open={lossFor != null} onOpenChange={(open) => !open && setLossFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İlgilenmiyor — kayıp sebebi</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {LOSS_REASONS.map(([key, label]) => (
              <Button
                key={key}
                variant="outline"
                onClick={() => {
                  const id = lossFor;
                  setLossFor(null);
                  if (id) record(id, "ULASILDI_RET", { lossReason: key });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
