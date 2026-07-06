"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyWebsite } from "@/lib/website";

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
const STAGE_FOR: Record<string, StageKey> = {
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
const LOSS_REASONS = ["ILGISIZ", "FIYAT", "RAKIBE_GITTI", "IHTIYAC_YOK", "ULASILAMADI"];

type StageKey = "ELEME" | "POTANSIYEL" | "MUSTERI";
const STAGES: {
  key: StageKey;
  label: string;
  badge: string;
  dot: string;
  ring: string;
  statuses: string[];
}[] = [
  {
    key: "ELEME",
    label: "Eleme",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-zinc-400",
    ring: "border-l-zinc-300 dark:border-l-zinc-700",
    statuses: ["YENI", "ON_MESAJ_GONDERILDI", "ULASILAMADI"],
  },
  {
    key: "POTANSIYEL",
    label: "Potansiyel",
    badge: "bg-primary/15 text-primary",
    dot: "bg-primary",
    ring: "border-l-primary/50",
    statuses: ["POTANSIYEL", "SUNUM_YAPILDI", "TEKLIF_YAPILDI", "KAYIP"],
  },
  {
    key: "MUSTERI",
    label: "Gerçek Müşteri",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    ring: "border-l-emerald-400",
    statuses: ["IS_DEVAM", "IS_BITTI"],
  },
];
const stageMeta = (k: StageKey) => STAGES.find((s) => s.key === k)!;
const PAGE = 20; // uzun listelerde kademeli yükleme

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
  groupKey: string;
  groupLabel: string;
  folder: string | null;
  city: string | null;
  district: string | null;
  sector: string | null;
};

type StageTab = "ALL" | StageKey;

export function KanbanBoard({ initial }: { initial: Firm[] }) {
  const [firms, setFirms] = useState<Firm[]>(initial);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<StageTab>("ALL");
  const [sektor, setSektor] = useState("");
  const [il, setIl] = useState("");
  const [site, setSite] = useState<"hepsi" | "var" | "sosyal" | "yok">("hepsi");
  const [sort, setSort] = useState<"skor" | "isim" | "yorum">("skor");
  const [openStage, setOpenStage] = useState<Set<string>>(new Set());
  const [openSeg, setOpenSeg] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<Record<string, number>>({});
  const [loss, setLoss] = useState<{ open: boolean; firmId: string | null }>({ open: false, firmId: null });
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState({ open: false, name: "", phone: "", website: "", error: "" });

  const sektorler = useMemo(
    () => [...new Set(firms.map((f) => f.sector).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, "tr")) as string[],
    [firms],
  );
  const iller = useMemo(
    () => [...new Set(firms.map((f) => f.city).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, "tr")) as string[],
    [firms],
  );

  const stageCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: firms.length, ELEME: 0, POTANSIYEL: 0, MUSTERI: 0 };
    for (const f of firms) c[f.stage] = (c[f.stage] ?? 0) + 1;
    return c;
  }, [firms]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const list = firms.filter((f) => {
      if (sektor && f.sector !== sektor) return false;
      if (il && f.city !== il) return false;
      const kind = classifyWebsite(f.website);
      if (site === "var" && kind !== "gercek") return false;
      if (site === "sosyal" && kind !== "sosyal") return false;
      if (site === "yok" && (kind === "gercek" || kind === "sosyal")) return false;
      if (needle) {
        const hay = `${f.name} ${f.context ?? ""} ${f.phone ?? ""}`.toLocaleLowerCase("tr");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const cmp: Record<typeof sort, (a: Firm, b: Firm) => number> = {
      skor: (a, b) => b.coarseScore - a.coarseScore,
      isim: (a, b) => a.name.localeCompare(b.name, "tr"),
      yorum: (a, b) => (b.googleReviews ?? 0) - (a.googleReviews ?? 0),
    };
    return [...list].sort(cmp[sort]);
  }, [firms, q, sektor, il, site, sort]);

  // Aşama → Segment gruplaması
  const grouped = useMemo(() => {
    return STAGES.filter((st) => tab === "ALL" || tab === st.key).map((st) => {
      const stageFirms = filtered.filter((f) => f.stage === st.key);
      const segMap = new Map<string, { key: string; label: string; folder: string | null; firms: Firm[] }>();
      for (const f of stageFirms) {
        let g = segMap.get(f.groupKey);
        if (!g) {
          g = { key: f.groupKey, label: f.groupLabel, folder: f.folder, firms: [] };
          segMap.set(f.groupKey, g);
        }
        g.firms.push(f);
      }
      const segs = [...segMap.values()].sort(
        (a, b) => b.firms.length - a.firms.length || a.label.localeCompare(b.label, "tr"),
      );
      return { ...st, total: stageFirms.length, segs };
    });
  }, [filtered, tab]);

  async function patch(id: string, status: string, lossReason?: string) {
    const prev = firms.find((f) => f.id === id);
    if (!prev) return;
    setFirms((fs) =>
      fs.map((f) =>
        f.id === id
          ? { ...f, status, stage: STAGE_FOR[status], lossReason: status === "KAYIP" ? (lossReason ?? null) : null }
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
      flash("Durum güncellenemedi.");
    }
  }
  function changeStatus(id: string, status: string) {
    if (status === "KAYIP") setLoss({ open: true, firmId: id });
    else patch(id, status);
  }
  async function removeFromList(id: string) {
    const prev = firms;
    setFirms((fs) => fs.filter((f) => f.id !== id));
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inWorkList: false }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setFirms(prev);
      flash("Listeden çıkarılamadı.");
    }
  }
  function flash(m: string) {
    setErr(m);
    setTimeout(() => setErr(null), 2500);
  }
  function toggle(set: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
    set((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  async function addManual() {
    const name = manual.name.trim();
    if (!name) return;
    setManual((m) => ({ ...m, error: "" }));
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: manual.phone, website: manual.website }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setManual((m) => ({ ...m, error: `${data.error} (durum: ${data.existing?.status})` }));
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Eklenemedi");
      const b = data.business;
      setFirms((fs) => [
        {
          id: b.id, name: b.name, status: "YENI", stage: "ELEME", coarseScore: 0,
          lossReason: null, phone: b.phone, website: b.website, googleRating: null,
          googleReviews: null, context: "manuel", groupKey: "manual",
          groupLabel: "Manuel eklenenler", folder: null, city: null, district: null, sector: null,
        },
        ...fs,
      ]);
      setManual({ open: false, name: "", phone: "", website: "", error: "" });
    } catch (e) {
      setManual((m) => ({ ...m, error: e instanceof Error ? e.message : "Hata" }));
    }
  }

  const TABS: { key: StageTab; label: string }[] = [
    { key: "ALL", label: "Tümü" },
    { key: "ELEME", label: "Eleme" },
    { key: "POTANSIYEL", label: "Potansiyel" },
    { key: "MUSTERI", label: "Gerçek Müşteri" },
  ];

  return (
    <main className="flex min-h-full flex-1 flex-col gap-4 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Çalışma Listem</h1>
          <p className="text-muted-foreground text-sm">{firms.length} firma · {filtered.length} gösteriliyor</p>
        </div>
        <Button variant="outline" onClick={() => setManual((m) => ({ ...m, open: true }))}>
          <Plus className="size-4" /> Manuel firma ekle
        </Button>
      </div>

      {/* Aşama sekmeleri */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          const meta = t.key !== "ALL" ? stageMeta(t.key) : null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-accent"
              }`}
            >
              {meta && <span className={`size-2 rounded-full ${meta.dot}`} />}
              {t.label}
              <span className="text-muted-foreground text-xs tabular-nums">{stageCounts[t.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Detaylı filtreler */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Firma / telefon ara…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <select value={il} onChange={(e) => setIl(e.target.value)} className="bg-background h-9 rounded-lg border px-2 text-sm">
          <option value="">Tüm iller</option>
          {iller.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={sektor} onChange={(e) => setSektor(e.target.value)} className="bg-background h-9 rounded-lg border px-2 text-sm">
          <option value="">Tüm sektörler</option>
          {sektorler.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          {([["hepsi","Hepsi"],["yok","Site yok"],["sosyal","Sosyal"],["var","Site var"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setSite(k)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${site === k ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-accent"}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-background h-9 rounded-lg border px-2 text-sm">
          <option value="skor">Skora göre</option>
          <option value="yorum">Yoruma göre</option>
          <option value="isim">İsme göre</option>
        </select>
      </div>

      {err && <div className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{err}</div>}

      {filtered.length === 0 ? (
        <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center">
          <p>{firms.length === 0 ? "Listen boş." : "Bu süzgeçle firma yok."}</p>
          {firms.length === 0 && <p className="text-xs">Bir aramada firmalara “Çalışmaya ekle” diyerek başla.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((stage) => {
            if (stage.total === 0) return null;
            const stageOpen = openStage.has(stage.key);
            return (
              <section key={stage.key} className={`overflow-hidden rounded-2xl border border-l-4 ${stage.ring}`}>
                {/* Aşama başlığı */}
                <button
                  onClick={() => toggle(setOpenStage, stage.key)}
                  className="bg-muted/40 hover:bg-muted/70 flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
                >
                  {stageOpen ? <ChevronDown className="text-muted-foreground size-4" /> : <ChevronRight className="text-muted-foreground size-4" />}
                  <span className={`size-2.5 rounded-full ${stage.dot}`} />
                  <span className="font-heading text-base font-bold">{stage.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${stage.badge}`}>{stage.total}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{stage.segs.length} grup</span>
                </button>

                {stageOpen && (
                  <div className="divide-y">
                    {stage.segs.map((seg) => {
                      const segId = `${stage.key}:${seg.key}`;
                      const segOpen = openSeg.has(segId);
                      const limit = shown[segId] ?? PAGE;
                      return (
                        <div key={segId}>
                          {/* Segment alt-başlığı */}
                          <button
                            onClick={() => toggle(setOpenSeg, segId)}
                            className="hover:bg-accent/40 flex w-full items-center gap-2 px-4 py-2 text-left"
                          >
                            {segOpen ? <ChevronDown className="text-muted-foreground size-3.5" /> : <ChevronRight className="text-muted-foreground size-3.5" />}
                            <MapPin className="text-muted-foreground size-3.5" />
                            <span className="truncate text-sm font-medium">{seg.label}</span>
                            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs tabular-nums">{seg.firms.length}</span>
                          </button>

                          {segOpen && (
                            <div className="divide-y border-t">
                              {seg.firms.slice(0, limit).map((f) => (
                                <FirmRow key={f.id} f={f} onStatus={changeStatus} onRemove={() => removeFromList(f.id)} />
                              ))}
                              {seg.firms.length > limit && (
                                <button
                                  onClick={() => setShown((s) => ({ ...s, [segId]: limit + PAGE }))}
                                  className="text-primary hover:bg-accent/40 w-full py-2.5 text-center text-sm font-medium"
                                >
                                  Daha fazla göster · {seg.firms.length - limit} firma kaldı
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Kayıp sebebi */}
      <Dialog open={loss.open} onOpenChange={(open) => setLoss((l) => ({ ...l, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kayıp sebebi</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {LOSS_REASONS.map((r) => (
              <Button key={r} variant="outline" onClick={() => { if (loss.firmId) patch(loss.firmId, "KAYIP", r); setLoss({ open: false, firmId: null }); }}>
                {LOSS_LABEL[r]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manuel ekle */}
      <Dialog open={manual.open} onOpenChange={(open) => setManual((m) => ({ ...m, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manuel firma ekle</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Input autoFocus placeholder="Firma adı *" value={manual.name} onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} />
            <Input placeholder="Telefon (opsiyonel)" value={manual.phone} onChange={(e) => setManual((m) => ({ ...m, phone: e.target.value }))} />
            <Input placeholder="Web sitesi (opsiyonel)" value={manual.website} onChange={(e) => setManual((m) => ({ ...m, website: e.target.value }))} />
            {manual.error && <p className="text-sm text-red-600">{manual.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManual({ open: false, name: "", phone: "", website: "", error: "" })}>Vazgeç</Button>
            <Button onClick={addManual} disabled={!manual.name.trim()}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FirmRow({ f, onStatus, onRemove }: { f: Firm; onStatus: (id: string, s: string) => void; onRemove: () => void }) {
  const meta = stageMeta(f.stage as StageKey);
  const kind = classifyWebsite(f.website);
  return (
    <div className="hover:bg-accent/40 flex items-center gap-3 px-4 py-2.5 pl-10 transition-colors">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums ${meta.badge}`} title="Fırsat skoru">
        {f.coarseScore}
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/firma/${f.id}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{f.name}</Link>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
          {f.googleRating != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-current text-amber-500" />
              {f.googleRating.toFixed(1)}{f.googleReviews != null && ` (${f.googleReviews})`}
            </span>
          )}
          {f.phone && <span>{f.phone}</span>}
          {kind === "sosyal" ? (
            <span className="text-fuchsia-600 dark:text-fuchsia-400">sosyal medya</span>
          ) : kind !== "gercek" ? (
            <span className="text-primary">site yok</span>
          ) : null}
          {f.status === "KAYIP" && f.lossReason && <span className="text-red-600">kayıp: {LOSS_LABEL[f.lossReason]}</span>}
        </div>
      </div>
      <Link
        href={`/firma/${f.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium"
        title="Firma detayını yeni sekmede aç"
      >
        Detay <ExternalLink className="size-3.5" />
      </Link>
      <select
        value={f.status}
        onChange={(e) => onStatus(f.id, e.target.value)}
        className={`h-8 shrink-0 rounded-lg border px-2 text-xs font-medium ${meta.badge}`}
      >
        {STAGES.map((st) => (
          <optgroup key={st.key} label={st.label}>
            {st.statuses.map((s) => (<option key={s} value={s}>{STATUS_LABEL[s]}</option>))}
          </optgroup>
        ))}
      </select>
      <button onClick={onRemove} className="text-muted-foreground hover:bg-accent shrink-0 rounded-md p-1.5 hover:text-red-600" title="Çalışma listemden çıkar">
        <X className="size-4" />
      </button>
    </div>
  );
}
