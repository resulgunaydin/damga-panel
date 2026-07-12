"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronRight,
  MapPin,
  Menu,
  Plus,
  Radar,
  Search,
  Settings2,
  Sparkles,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ILLER, IL_ILCE } from "@/lib/tr-regions";

type Sector = { name: string; keywords: string[] };
type Arama = {
  id: string;
  city: string;
  district: string | null;
  sector: string;
  keywords: string[];
  lastRunAt: string | null;
  firmaCount: number;
  queryCount: number;
  scanState: "bos" | "kismi" | "tamam";
};
// Silmeden önce gösterilen etki özeti (GET /api/searches/[id]).
type Impact = {
  businesses: number;
  inWorkList: number;
  customers: number;
  queryCount: number;
};
const NONE = "__genel__";

const SCAN_META: Record<Arama["scanState"], { label: string; cls: string }> = {
  bos: { label: "Taranmadı", cls: "bg-muted text-muted-foreground" },
  kismi: { label: "Kısmi", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  tamam: { label: "Tarandı", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "İşlem başarısız");
  return res.json();
}

type Sel = { il: string | null; ilce: string | null; sektor: string | null };
const EMPTY_SEL: Sel = { il: null, ilce: null, sektor: null };

export function Workspace({
  initialSegments,
  initialSectors,
}: {
  initialSegments: Arama[];
  initialSectors: Sector[];
}) {
  const [aramalar, setAramalar] = useState<Arama[]>(initialSegments);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [groupBy, setGroupBy] = useState<"konum" | "sektor">("konum");
  const [sel, setSel] = useState<Sel>(EMPTY_SEL);
  const [openNode, setOpenNode] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [scanFilter, setScanFilter] = useState<Arama["scanState"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobil çekmece

  const [wiz, setWiz] = useState({ open: false, city: "", district: "", sector: "", kw: [] as string[], kwInput: "" });
  const [sekDialog, setSekDialog] = useState<{ open: boolean; draft: Sector[] }>({ open: false, draft: [] });
  // Silme onayı: impact null iken özet yükleniyor demektir.
  const [del, setDel] = useState<{ arama: Arama; impact: Impact | null; busy: boolean } | null>(null);

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Bir hata oluştu");
    setTimeout(() => setError(null), 4000);
  }

  // ── Ağaç verisi ──
  const konumTree = useMemo(() => {
    const iller = new Map<string, Map<string, number>>();
    for (const s of aramalar) {
      const d = s.district ?? NONE;
      if (!iller.has(s.city)) iller.set(s.city, new Map());
      const m = iller.get(s.city)!;
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return [...iller.entries()]
      .map(([city, m]) => ({
        key: city,
        total: [...m.values()].reduce((a, b) => a + b, 0),
        children: [...m.entries()]
          .map(([d, n]) => ({ key: d, label: d === NONE ? "Genel" : d, n }))
          .sort((a, b) => a.label.localeCompare(b.label, "tr")),
      }))
      .sort((a, b) => a.key.localeCompare(b.key, "tr"));
  }, [aramalar]);

  const sektorTree = useMemo(() => {
    const sekt = new Map<string, Map<string, number>>();
    for (const s of aramalar) {
      if (!sekt.has(s.sector)) sekt.set(s.sector, new Map());
      const m = sekt.get(s.sector)!;
      m.set(s.city, (m.get(s.city) ?? 0) + 1);
    }
    return [...sekt.entries()]
      .map(([sector, m]) => ({
        key: sector,
        total: [...m.values()].reduce((a, b) => a + b, 0),
        children: [...m.entries()]
          .map(([c, n]) => ({ key: c, label: c, n }))
          .sort((a, b) => a.label.localeCompare(b.label, "tr")),
      }))
      .sort((a, b) => a.key.localeCompare(b.key, "tr"));
  }, [aramalar]);

  const tree = groupBy === "konum" ? konumTree : sektorTree;

  // ── Filtre ──
  const scoped = useMemo(() => {
    return aramalar.filter((s) => {
      if (sel.il && s.city !== sel.il) return false;
      if (sel.ilce && (s.district ?? NONE) !== sel.ilce) return false;
      if (sel.sektor && s.sector !== sel.sektor) return false;
      return true;
    });
  }, [aramalar, sel]);

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    // Arama yazılıysa tüm aramalarda ara (ağaç seçiminden bağımsız); değilse seçili kapsam.
    const base = needle ? aramalar : scoped;
    return base.filter((s) => {
      if (scanFilter && s.scanState !== scanFilter) return false;
      if (needle) {
        const hay = [s.city, s.district ?? "", s.sector, ...s.keywords].join(" ").toLocaleLowerCase("tr");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [aramalar, scoped, q, scanFilter]);

  // Sağ paneli sektöre göre grupla
  const sectorGroups = useMemo(() => {
    const m = new Map<string, Arama[]>();
    for (const s of visible) {
      const a = m.get(s.sector) ?? [];
      a.push(s);
      m.set(s.sector, a);
    }
    return [...m.entries()]
      .map(([sector, items]) => ({ sector, items }))
      .sort((a, b) => b.items.length - a.items.length || a.sector.localeCompare(b.sector, "tr"));
  }, [visible]);

  function toggleNode(key: string) {
    setOpenNode((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }
  function pickParent(key: string) {
    setSel(groupBy === "konum" ? { il: key, ilce: null, sektor: null } : { il: null, ilce: null, sektor: key });
    setSidebarOpen(false);
  }
  function pickChild(parent: string, child: string) {
    setSel(
      groupBy === "konum"
        ? { il: parent, ilce: child, sektor: null }
        : { il: child, ilce: null, sektor: parent },
    );
    setSidebarOpen(false);
  }
  function switchMode(mode: "konum" | "sektor") {
    setGroupBy(mode);
    setSel(EMPTY_SEL);
    setOpenNode(new Set());
  }

  // ── Arama oluştur ──
  async function createArama() {
    const city = wiz.city.trim();
    const sector = wiz.sector.trim();
    if (!city || !sector) return;
    try {
      const created = await api<Arama>("/api/searches", "POST", {
        city,
        district: wiz.district.trim() || null,
        sector,
        keywords: wiz.kw,
      });
      setAramalar((ss) => [{ ...created, lastRunAt: null, firmaCount: 0, scanState: "bos" }, ...ss]);
      setWiz({ open: false, city: "", district: "", sector: "", kw: [], kwInput: "" });
      switchMode("konum");
      setSel({ il: city, ilce: wiz.district.trim() || NONE, sektor: null });
      setOpenNode(new Set([city]));
    } catch (e) {
      fail(e);
    }
  }
  // ── Arama sil (onaylı) ──
  // Silme Cascade: firmalar da gider. Önce ne kaybedileceğini göster.
  async function askDelete(s: Arama) {
    setDel({ arama: s, impact: null, busy: false });
    try {
      const { impact } = await api<{ impact: Impact }>(`/api/searches/${s.id}`, "GET");
      setDel((d) => (d && d.arama.id === s.id ? { ...d, impact } : d));
    } catch (e) {
      setDel(null);
      fail(e);
    }
  }
  async function confirmDelete() {
    if (!del) return;
    const { id } = del.arama;
    setDel((d) => (d ? { ...d, busy: true } : d));
    try {
      await api(`/api/searches/${id}`, "DELETE");
      setAramalar((ss) => ss.filter((s) => s.id !== id));
      setDel(null);
    } catch (e) {
      setDel((d) => (d ? { ...d, busy: false } : d));
      fail(e);
    }
  }
  function addKw(k: string) {
    const t = k.trim();
    if (t && !wiz.kw.includes(t)) setWiz((w) => ({ ...w, kw: [...w.kw, t], kwInput: "" }));
  }
  function chooseSector(name: string) {
    const found = sectors.find((s) => s.name === name);
    setWiz((w) => ({ ...w, sector: name, kw: found ? [...found.keywords] : w.kw }));
  }

  // ── Sektör kataloğu ──
  async function saveSectors() {
    try {
      const { sectors: saved } = await api<{ sectors: Sector[] }>("/api/sectors", "PUT", {
        sectors: sekDialog.draft,
      });
      setSectors(saved);
      setSekDialog({ open: false, draft: [] });
    } catch (e) {
      fail(e);
    }
  }

  const baslik = q.trim()
    ? `“${q.trim()}” araması`
    : sel.sektor
      ? `${sel.sektor}${sel.il ? " · " + sel.il : ""}`
      : sel.il
        ? `${sel.il}${sel.ilce && sel.ilce !== NONE ? " · " + sel.ilce : ""}`
        : "Tüm aramalar";

  const ilceler = wiz.city ? (IL_ILCE[wiz.city] ?? []) : [];

  return (
    <div className="flex min-h-full flex-1">
      {/* Mobil çekmece arka planı */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* ── Sol: grup ağacı (mobilde çekmece) ── */}
      <aside
        className={`bg-sidebar md:bg-sidebar/50 fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 transform flex-col border-r shadow-xl transition-transform md:static md:z-auto md:w-64 md:translate-x-0 md:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-1 p-2">
          <button
            onClick={() => switchMode("konum")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium ${
              groupBy === "konum" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <MapPin className="size-4" /> Konum
          </button>
          <button
            onClick={() => switchMode("sektor")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium ${
              groupBy === "sektor" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Tags className="size-4" /> Sektör
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 pt-0 text-sm">
          <button
            onClick={() => {
              setSel(EMPTY_SEL);
              setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 ${
              !sel.il && !sel.sektor ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
            }`}
          >
            <Radar className="size-4" />
            <span className="flex-1 text-left">Tüm aramalar</span>
            <span className="text-xs tabular-nums opacity-70">{aramalar.length}</span>
          </button>

          {tree.map((node) => {
            const open = openNode.has(node.key);
            const activeParent =
              groupBy === "konum" ? sel.il === node.key && !sel.ilce : sel.sektor === node.key && !sel.il;
            const activeInParent =
              groupBy === "konum" ? sel.il === node.key : sel.sektor === node.key;
            return (
              <div key={node.key}>
                <div
                  className={`group flex items-center rounded-lg ${
                    activeParent ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  }`}
                >
                  <button onClick={() => toggleNode(node.key)} className="p-1.5" aria-label="aç/kapat">
                    <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                  </button>
                  <button
                    onClick={() => {
                      pickParent(node.key);
                      if (!open) toggleNode(node.key);
                    }}
                    className="flex flex-1 items-center gap-2 py-1.5 pr-2 text-left"
                  >
                    <span className={`flex-1 truncate ${activeParent ? "font-medium" : ""}`}>{node.key}</span>
                    <span className="text-xs tabular-nums opacity-70">{node.total}</span>
                  </button>
                </div>
                {open &&
                  node.children.map((c) => {
                    const activeChild =
                      groupBy === "konum"
                        ? activeInParent && sel.ilce === c.key
                        : activeInParent && sel.il === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => pickChild(node.key, c.key)}
                        className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-9 text-left ${
                          activeChild ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                        }`}
                      >
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="text-xs tabular-nums opacity-70">{c.n}</span>
                      </button>
                    );
                  })}
              </div>
            );
          })}

          {tree.length === 0 && (
            <p className="text-muted-foreground px-2.5 py-6 text-center text-xs">Henüz arama yok.</p>
          )}
        </nav>

        <div className="border-t p-2">
          <button
            onClick={() => setSekDialog({ open: true, draft: sectors.map((s) => ({ ...s, keywords: [...s.keywords] })) })}
            className="text-muted-foreground hover:bg-accent flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm"
          >
            <Settings2 className="size-4" /> Sektörleri yönet
          </button>
        </div>
      </aside>

      {/* ── Sağ: merkez ── */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="hover:bg-accent -ml-1 shrink-0 rounded-lg p-2 md:hidden"
              aria-label="Grupları aç"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-heading truncate text-xl font-bold sm:text-2xl">{baslik}</h1>
              <p className="text-muted-foreground text-sm">{visible.length} arama</p>
            </div>
          </div>
          <Button onClick={() => setWiz((w) => ({ ...w, open: true, city: groupBy === "konum" && sel.il ? sel.il : "", sector: groupBy === "sektor" && sel.sektor ? sel.sektor : "" }))}>
            <Plus className="size-4" /> Yeni arama
          </Button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
          <div className="relative min-w-52 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input placeholder="Ara…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-1">
            {(["bos", "kismi", "tamam"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setScanFilter((f) => (f === st ? null : st))}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  scanFilter === st ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-accent"
                }`}
              >
                {SCAN_META[st].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {visible.length === 0 ? (
            <div className="text-muted-foreground flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center">
              <Sparkles className="size-8 opacity-40" />
              <p>{aramalar.length === 0 ? "İlk aramanı oluştur." : "Bu süzgeçle arama yok."}</p>
              <Button variant="outline" className="mt-1" onClick={() => setWiz((w) => ({ ...w, open: true }))}>
                <Plus className="size-4" /> Yeni arama
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-7">
              {sectorGroups.map((g) => (
                <section key={g.sector}>
                  <div className="mb-3 flex items-center gap-2">
                    <Tags className="text-primary size-4" />
                    <h2 className="font-heading font-bold">{g.sector}</h2>
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
                      {g.items.length}
                    </span>
                    <div className="bg-border ml-1 h-px flex-1" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((s) => (
                      <AramaCard key={s.id} s={s} onDelete={() => askDelete(s)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}

      {/* ── Oluşturma sihirbazı ── */}
      <Dialog open={wiz.open} onOpenChange={(open) => setWiz((w) => ({ ...w, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Yeni arama</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">İl *</span>
                <select
                  value={wiz.city}
                  onChange={(e) => setWiz((w) => ({ ...w, city: e.target.value, district: "" }))}
                  className="bg-background h-9 w-full rounded-lg border px-2 text-sm"
                >
                  <option value="">Seç…</option>
                  {ILLER.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">İlçe</span>
                <select
                  value={wiz.district}
                  onChange={(e) => setWiz((w) => ({ ...w, district: e.target.value }))}
                  disabled={!wiz.city}
                  className="bg-background h-9 w-full rounded-lg border px-2 text-sm disabled:opacity-50"
                >
                  <option value="">Tümü / Genel</option>
                  {ilceler.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sektör *</span>
                <button
                  onClick={() => setSekDialog({ open: true, draft: sectors.map((s) => ({ ...s, keywords: [...s.keywords] })) })}
                  className="text-primary text-xs hover:underline"
                >
                  + sektör yönet
                </button>
              </div>
              <select
                value={wiz.sector}
                onChange={(e) => chooseSector(e.target.value)}
                className="bg-background h-9 w-full rounded-lg border px-2 text-sm"
              >
                <option value="">Seç…</option>
                {sectors.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </label>

            <div className="space-y-1 text-sm">
              <span className="text-muted-foreground">Anahtar kelimeler</span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border p-2">
                {wiz.kw.map((k) => (
                  <span key={k} className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                    {k}
                    <button onClick={() => setWiz((w) => ({ ...w, kw: w.kw.filter((x) => x !== k) }))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={wiz.kwInput}
                  onChange={(e) => setWiz((w) => ({ ...w, kwInput: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addKw(wiz.kwInput);
                    }
                  }}
                  placeholder={wiz.kw.length === 0 ? "yaz + Enter…" : ""}
                  className="min-w-24 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <p className="text-muted-foreground text-xs">Sektör seçince önerilenler otomatik gelir; ekle/çıkar.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWiz({ open: false, city: "", district: "", sector: "", kw: [], kwInput: "" })}>
              Vazgeç
            </Button>
            <Button onClick={createArama} disabled={!wiz.city.trim() || !wiz.sector.trim()}>
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sektör kataloğu yönetimi ── */}
      <Dialog open={sekDialog.open} onOpenChange={(open) => setSekDialog((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Sektörler</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {sekDialog.draft.map((s, i) => (
              <SectorEditor
                key={i}
                sector={s}
                onChange={(next) =>
                  setSekDialog((d) => ({ ...d, draft: d.draft.map((x, j) => (j === i ? next : x)) }))
                }
                onRemove={() => setSekDialog((d) => ({ ...d, draft: d.draft.filter((_, j) => j !== i) }))}
              />
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSekDialog((d) => ({ ...d, draft: [...d.draft, { name: "", keywords: [] }] }))}
            >
              <Plus className="size-4" /> Sektör ekle
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSekDialog({ open: false, draft: [] })}>Vazgeç</Button>
            <Button onClick={saveSectors}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Arama silme onayı ── */}
      <Dialog open={del !== null} onOpenChange={(open) => !open && !del?.busy && setDel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Aramayı sil</DialogTitle>
          </DialogHeader>
          {del && (
            <div className="space-y-4 text-sm">
              <p>
                <span className="font-medium">
                  {del.arama.city}
                  {del.arama.district ? ` · ${del.arama.district}` : ""} · {del.arama.sector}
                </span>{" "}
                araması ve bu aramada bulunan firmalar <strong>kalıcı olarak</strong> silinecek.
              </p>

              {!del.impact ? (
                <p className="text-muted-foreground">Etki özeti yükleniyor…</p>
              ) : (
                <>
                  <ul className="bg-muted/50 space-y-1 rounded-lg border p-3">
                    <li className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Silinecek firma</span>
                      <span className="font-medium tabular-nums">{del.impact.businesses}</span>
                    </li>
                    {del.impact.inWorkList > 0 && (
                      <li className="flex justify-between gap-3">
                        <span className="text-muted-foreground">— Çalışma listendeki</span>
                        <span className="font-medium tabular-nums">{del.impact.inWorkList}</span>
                      </li>
                    )}
                    {del.impact.customers > 0 && (
                      <li className="text-destructive flex justify-between gap-3">
                        <span>— Müşteriye dönmüş (iş + ödeme kayıtlarıyla)</span>
                        <span className="font-medium tabular-nums">{del.impact.customers}</span>
                      </li>
                    )}
                  </ul>

                  {del.impact.customers > 0 && (
                    <p className="text-destructive">
                      Dikkat: müşteri kayıtları, işleri ve ödeme geçmişi de silinir. Bu geri alınamaz.
                    </p>
                  )}

                  <p className="text-muted-foreground">
                    Bu firmaları tekrar görmek istersen aynı bölge için yeniden arama açıp{" "}
                    <strong>baştan taraman</strong> gerekir — bu yeni Google Places sorgusu harcar.
                    {del.impact.queryCount > 0 && (
                      <> Bu aramada şimdiye kadar {del.impact.queryCount} sorgu harcanmıştı.</>
                    )}
                  </p>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDel(null)} disabled={del?.busy}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!del?.impact || del.busy}
            >
              {del?.busy ? "Siliniyor…" : "Kalıcı olarak sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sektör satırı editörü ──
function SectorEditor({
  sector,
  onChange,
  onRemove,
}: {
  sector: Sector;
  onChange: (s: Sector) => void;
  onRemove: () => void;
}) {
  const [kwInput, setKwInput] = useState("");
  function addKw(k: string) {
    const t = k.trim();
    if (t && !sector.keywords.includes(t)) onChange({ ...sector, keywords: [...sector.keywords, t] });
    setKwInput("");
  }
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Sektör adı"
          value={sector.name}
          onChange={(e) => onChange({ ...sector, name: e.target.value })}
        />
        <button onClick={onRemove} className="text-muted-foreground p-1 hover:text-red-600" title="Sil">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border p-2">
        {sector.keywords.map((k) => (
          <span key={k} className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
            {k}
            <button onClick={() => onChange({ ...sector, keywords: sector.keywords.filter((x) => x !== k) })}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={kwInput}
          onChange={(e) => setKwInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addKw(kwInput);
            }
          }}
          placeholder="anahtar kelime + Enter"
          className="min-w-28 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

// ── Arama kartı ──
function AramaCard({ s, onDelete }: { s: Arama; onDelete: () => void }) {
  const scan = SCAN_META[s.scanState];
  return (
    <div className="bg-card group relative flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/calisma-alani/segment/${s.id}`} className="min-w-0">
          <div className="font-heading truncate font-semibold group-hover:text-primary">
            {s.city}{s.district ? ` · ${s.district}` : ""}
          </div>
          <p className="text-muted-foreground truncate text-sm">{s.sector}</p>
        </Link>
        <button
          onClick={onDelete}
          className="text-muted-foreground shrink-0 p-1 opacity-0 hover:text-red-600 group-hover:opacity-100"
          title="Aramayı sil"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {s.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {s.keywords.slice(0, 4).map((k) => (
            <span key={k} className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">{k}</span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scan.cls}`}>{scan.label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{s.firmaCount} firma</span>
      </div>

      <Link
        href={`/calisma-alani/segment/${s.id}`}
        className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:gap-2"
      >
        Aç <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
