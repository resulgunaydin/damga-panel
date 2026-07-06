"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical, MoreVertical, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Etiketler client tarafında (lib/business prisma'yı bundle'a sokmasın diye kopya).
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
const LOSS_LABEL: Record<string, string> = {
  ILGISIZ: "İlgisiz",
  FIYAT: "Fiyat",
  RAKIBE_GITTI: "Rakibe gitti",
  IHTIYAC_YOK: "İhtiyaç yok",
  ULASILAMADI: "Ulaşılamadı",
};
const STAGE_FOR: Record<string, string> = {
  YENI: "ELEME",
  ON_MESAJ_GONDERILDI: "ELEME",
  ULASILAMADI: "ELEME",
  POTANSIYEL: "POTANSIYEL",
  SUNUM_YAPILDI: "POTANSIYEL",
  TEKLIF_YAPILDI: "POTANSIYEL",
  KAYIP: "POTANSIYEL",
  IS_DEVAM: "MUSTERI",
  IS_BITTI: "MUSTERI",
};

const STAGES = [
  {
    key: "ELEME",
    title: "Eleme Müşterisi · bedava",
    tint: "bg-zinc-50 dark:bg-zinc-900/40",
    head: "text-zinc-600 dark:text-zinc-300",
    statuses: ["YENI", "ON_MESAJ_GONDERILDI", "ULASILAMADI"],
  },
  {
    key: "POTANSIYEL",
    title: "Potansiyel Müşteri",
    tint: "bg-orange-50 dark:bg-orange-950/30",
    head: "text-orange-700 dark:text-orange-300",
    statuses: ["POTANSIYEL", "SUNUM_YAPILDI", "TEKLIF_YAPILDI", "KAYIP"],
  },
  {
    key: "MUSTERI",
    title: "Gerçek Müşteri",
    tint: "bg-green-50 dark:bg-green-950/30",
    head: "text-green-700 dark:text-green-300",
    statuses: ["IS_DEVAM", "IS_BITTI"],
  },
];

const LOSS_REASONS = ["ILGISIZ", "FIYAT", "RAKIBE_GITTI", "IHTIYAC_YOK", "ULASILAMADI"];

type Firm = {
  id: string;
  name: string;
  status: string;
  stage: string;
  coarseScore: number;
  lossReason: string | null;
  phone: string | null;
  website: string | null;
  googleRating: number | null;
  googleReviews: number | null;
  context: string | null;
};

export function KanbanBoard({ initial }: { initial: Firm[] }) {
  const [firms, setFirms] = useState<Firm[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);
  const [loss, setLoss] = useState<{ open: boolean; firmId: string | null }>({
    open: false,
    firmId: null,
  });
  const [err, setErr] = useState<string | null>(null);

  async function patch(id: string, status: string, lossReason?: string) {
    const prev = firms.find((f) => f.id === id);
    if (!prev) return;
    setFirms((fs) =>
      fs.map((f) =>
        f.id === id
          ? {
              ...f,
              status,
              stage: STAGE_FOR[status],
              lossReason: status === "KAYIP" ? (lossReason ?? null) : null,
            }
          : f,
      ),
    );
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, lossReason }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setFirms((fs) => fs.map((f) => (f.id === id ? prev : f)));
      setErr("Durum güncellenemedi.");
      setTimeout(() => setErr(null), 3000);
    }
  }

  function moveTo(id: string, status: string) {
    if (status === "KAYIP") {
      setLoss({ open: true, firmId: id });
    } else {
      patch(id, status);
    }
  }

  function onDrop(status: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      setDropCol(null);
      if (dragId) moveTo(dragId, status);
      setDragId(null);
    };
  }

  return (
    <main className="flex min-h-full flex-1 flex-col gap-4 px-6 py-6">
      <div>
        <Link
          href="/calisma-alani"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Çalışma Alanı
        </Link>
        <h1 className="text-2xl font-semibold">Çalışma Panom</h1>
        <p className="text-muted-foreground text-sm">
          {firms.length} firma · kartları sürükleyerek veya ⋮ menüsüyle ilerlet.
        </p>
      </div>

      {err && (
        <div className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{err}</div>
      )}

      {firms.length === 0 ? (
        <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
          <p>Panon boş.</p>
          <p className="text-xs">Bir segmentte firmalara “Çalışmaya ekle” diyerek başla.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage.key} className={`rounded-xl p-2 ${stage.tint}`}>
              <div className={`px-2 pb-2 text-xs font-semibold ${stage.head}`}>
                {stage.title}
              </div>
              <div className="flex gap-3">
                {stage.statuses.map((status) => {
                  const items = firms.filter((f) => f.status === status);
                  return (
                    <div
                      key={status}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropCol(status);
                      }}
                      onDragLeave={() => setDropCol(null)}
                      onDrop={onDrop(status)}
                      className={`flex w-60 shrink-0 flex-col rounded-lg border bg-background/60 ${
                        dropCol === status ? "ring-2 ring-orange-400" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
                        <span>{STATUS_LABEL[status]}</span>
                        <span className="text-muted-foreground text-xs">{items.length}</span>
                      </div>
                      <div className="flex min-h-16 flex-col gap-2 p-2">
                        {items.map((f) => (
                          <Card key={f.id} f={f} onDragStart={() => setDragId(f.id)} onMove={moveTo} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kayıp sebebi dialoğu (Bölüm 3.2) */}
      <Dialog open={loss.open} onOpenChange={(open) => setLoss((l) => ({ ...l, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kayıp sebebi</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {LOSS_REASONS.map((r) => (
              <Button
                key={r}
                variant="outline"
                onClick={() => {
                  if (loss.firmId) patch(loss.firmId, "KAYIP", r);
                  setLoss({ open: false, firmId: null });
                }}
              >
                {LOSS_LABEL[r]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Card({
  f,
  onDragStart,
  onMove,
}: {
  f: Firm;
  onDragStart: () => void;
  onMove: (id: string, status: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      className="bg-card group flex cursor-grab flex-col gap-1 rounded-md border p-2 text-sm active:cursor-grabbing"
    >
      <div className="flex items-start gap-1">
        <GripVertical className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
        <span className="flex-1 font-medium leading-tight">{f.name}</span>
        <span className="bg-muted text-muted-foreground rounded px-1 text-xs">
          {f.coarseScore}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-0.5 opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.keys(STATUS_LABEL)
              .filter((s) => s !== f.status)
              .map((s) => (
                <DropdownMenuItem key={s} onClick={() => onMove(f.id, s)}>
                  → {STATUS_LABEL[s]}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {f.context && <div className="text-muted-foreground pl-4 text-xs">{f.context}</div>}
      <div className="text-muted-foreground flex items-center gap-2 pl-4 text-xs">
        {f.googleRating != null && (
          <span className="inline-flex items-center gap-0.5">
            <Star className="size-3 fill-current text-amber-500" />
            {f.googleRating.toFixed(1)}
          </span>
        )}
        {!f.website && <span className="text-orange-600">site yok</span>}
        {f.status === "KAYIP" && f.lossReason && (
          <span className="rounded bg-red-100 px-1 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {LOSS_LABEL[f.lossReason]}
          </span>
        )}
      </div>
    </div>
  );
}
