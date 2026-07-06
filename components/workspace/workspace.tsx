"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronRight,
  ClipboardList,
  FolderPlus,
  Gauge,
  Inbox,
  ListChecks,
  Layers,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Tipler ────────────────────────────────────────────────
type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
};
type Segment = {
  id: string;
  city: string;
  district: string | null;
  sector: string;
  keywords: string[];
  folderId: string | null;
  lastRunAt: string | null;
};
type FolderNode = FolderItem & { children: FolderNode[] };
type Selection = "ALL" | "UNFILED" | string; // string = klasör id

// ── Yardımcılar ───────────────────────────────────────────
async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "İşlem başarısız");
  }
  return res.json();
}

function buildTree(folders: FolderItem[]): FolderNode[] {
  const byParent = new Map<string | null, FolderNode[]>();
  for (const f of folders) {
    const node: FolderNode = { ...f, children: [] };
    const list = byParent.get(f.parentId) ?? [];
    list.push(node);
    byParent.set(f.parentId, list);
  }
  const attach = (parentId: string | null): FolderNode[] =>
    (byParent.get(parentId) ?? []).map((n) => ({
      ...n,
      children: attach(n.id),
    }));
  return attach(null);
}

function descendantIds(folders: FolderItem[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        changed = true;
      }
    }
  }
  return out;
}

// ── Ana bileşen ───────────────────────────────────────────
export function Workspace({
  initialFolders,
  initialSegments,
}: {
  initialFolders: FolderItem[];
  initialSegments: Segment[];
}) {
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [selected, setSelected] = useState<Selection>("ALL");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | "UNFILED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Diyalog durumları
  const [folderDialog, setFolderDialog] = useState<{
    open: boolean;
    parentId: string | null;
    editId: string | null;
    value: string;
  }>({ open: false, parentId: null, editId: null, value: "" });
  const [segDialog, setSegDialog] = useState({
    open: false,
    city: "",
    district: "",
    sector: "",
    keywords: "",
  });

  const tree = useMemo(() => buildTree(folders), [folders]);

  const visibleSegments = useMemo(() => {
    if (selected === "ALL") return segments;
    if (selected === "UNFILED") return segments.filter((s) => !s.folderId);
    return segments.filter((s) => s.folderId === selected);
  }, [segments, selected]);

  const selectedFolder =
    typeof selected === "string" && selected !== "ALL" && selected !== "UNFILED"
      ? folders.find((f) => f.id === selected)
      : undefined;

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Bir hata oluştu");
    setTimeout(() => setError(null), 4000);
  }

  // ── Klasör işlemleri ──
  async function submitFolder() {
    const name = folderDialog.value.trim();
    if (!name) return;
    try {
      if (folderDialog.editId) {
        const updated = await api<FolderItem>(
          `/api/folders/${folderDialog.editId}`,
          "PATCH",
          { name },
        );
        setFolders((fs) =>
          fs.map((f) => (f.id === updated.id ? { ...f, name: updated.name } : f)),
        );
      } else {
        const created = await api<FolderItem>("/api/folders", "POST", {
          name,
          parentId: folderDialog.parentId,
        });
        setFolders((fs) => [...fs, created]);
      }
      setFolderDialog({ open: false, parentId: null, editId: null, value: "" });
    } catch (e) {
      fail(e);
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm("Klasör silinsin mi? Alt klasörler de silinir; segmentler klasörsüz kalır."))
      return;
    try {
      await api(`/api/folders/${id}`, "DELETE");
      const removed = descendantIds(folders, id);
      setFolders((fs) => fs.filter((f) => !removed.has(f.id)));
      setSegments((ss) =>
        ss.map((s) => (s.folderId && removed.has(s.folderId) ? { ...s, folderId: null } : s)),
      );
      if (typeof selected === "string" && removed.has(selected)) setSelected("ALL");
    } catch (e) {
      fail(e);
    }
  }

  // ── Segment işlemleri ──
  async function submitSegment() {
    const city = segDialog.city.trim();
    const sector = segDialog.sector.trim();
    if (!city || !sector) return;
    try {
      const created = await api<Segment>("/api/searches", "POST", {
        city,
        district: segDialog.district,
        sector,
        keywords: segDialog.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        folderId: selectedFolder ? selectedFolder.id : null,
      });
      setSegments((ss) => [
        { ...created, lastRunAt: null },
        ...ss,
      ]);
      setSegDialog({ open: false, city: "", district: "", sector: "", keywords: "" });
    } catch (e) {
      fail(e);
    }
  }

  async function deleteSegment(id: string) {
    try {
      await api(`/api/searches/${id}`, "DELETE");
      setSegments((ss) => ss.filter((s) => s.id !== id));
    } catch (e) {
      fail(e);
    }
  }

  async function moveSegment(id: string, folderId: string | null) {
    const current = segments.find((s) => s.id === id);
    if (!current || current.folderId === folderId) return;
    setSegments((ss) => ss.map((s) => (s.id === id ? { ...s, folderId } : s)));
    try {
      await api(`/api/searches/${id}`, "PATCH", { folderId });
    } catch (e) {
      setSegments((ss) =>
        ss.map((s) => (s.id === id ? { ...s, folderId: current.folderId } : s)),
      );
      fail(e);
    }
  }

  function onDropTo(folderId: string | null, key: string | "UNFILED") {
    return (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(null);
      if (dragId) moveSegment(dragId, folderId);
      setDragId(null);
    };
  }
  function allowDrop(key: string | "UNFILED") {
    return (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(key);
    };
  }

  const count = (key: Selection) =>
    key === "ALL"
      ? segments.length
      : key === "UNFILED"
        ? segments.filter((s) => !s.folderId).length
        : segments.filter((s) => s.folderId === key).length;

  return (
    <div className="flex min-h-full flex-1">
      {/* ── Kenar çubuğu: klasör ağacı ── */}
      <aside className="bg-muted/30 flex w-72 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <Layers className="size-4" /> Çalışma Alanı
          </span>
          <div className="flex items-center gap-1">
            <Link
              href="/calisma-listem"
              title="Çalışma Listem"
              className="hover:bg-accent rounded-md p-2"
            >
              <ClipboardList className="size-4" />
            </Link>
            <Link
              href="/gorevler"
              title="Görev Kutusu"
              className="hover:bg-accent rounded-md p-2"
            >
              <ListChecks className="size-4" />
            </Link>
            <Link
              href="/hizmetler"
              title="Hizmet Listesi"
              className="hover:bg-accent rounded-md p-2"
            >
              <Package className="size-4" />
            </Link>
            <Link
              href="/kullanim"
              title="Kullanım & Bütçe"
              className="hover:bg-accent rounded-md p-2"
            >
              <Gauge className="size-4" />
            </Link>
            <Link
              href="/ayarlar"
              title="AI Sağlayıcı"
              className="hover:bg-accent rounded-md p-2"
            >
              <Sparkles className="size-4" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              title="Yeni klasör"
              onClick={() =>
                setFolderDialog({ open: true, parentId: null, editId: null, value: "" })
              }
            >
              <FolderPlus className="size-4" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 text-sm">
          <SidebarItem
            active={selected === "ALL"}
            onClick={() => setSelected("ALL")}
            icon={<Layers className="size-4" />}
            label="Tümü"
            count={count("ALL")}
          />

          {tree.map((node) => (
            <FolderRow
              key={node.id}
              node={node}
              depth={0}
              selected={selected}
              dropTarget={dropTarget}
              count={count}
              onSelect={setSelected}
              onDragOver={allowDrop}
              onDragLeave={() => setDropTarget(null)}
              onDrop={onDropTo}
              onAddChild={(parentId) =>
                setFolderDialog({ open: true, parentId, editId: null, value: "" })
              }
              onRename={(f) =>
                setFolderDialog({ open: true, parentId: null, editId: f.id, value: f.name })
              }
              onDelete={deleteFolder}
            />
          ))}

          <div
            onDragOver={allowDrop("UNFILED")}
            onDragLeave={() => setDropTarget(null)}
            onDrop={onDropTo(null, "UNFILED")}
            className={dropTarget === "UNFILED" ? "rounded-md ring-2 ring-orange-400" : ""}
          >
            <SidebarItem
              active={selected === "UNFILED"}
              onClick={() => setSelected("UNFILED")}
              icon={<Inbox className="size-4" />}
              label="Klasörsüz"
              count={count("UNFILED")}
            />
          </div>
        </nav>
      </aside>

      {/* ── Ana alan: segment kartları ── */}
      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">
              {selected === "ALL"
                ? "Tüm segmentler"
                : selected === "UNFILED"
                  ? "Klasörsüz segmentler"
                  : (selectedFolder?.name ?? "Segmentler")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {visibleSegments.length} arama segmenti
            </p>
          </div>
          <Button onClick={() => setSegDialog((d) => ({ ...d, open: true }))}>
            <Plus className="size-4" /> Yeni segment
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {visibleSegments.length === 0 ? (
            <div className="text-muted-foreground flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
              <Layers className="size-8 opacity-40" />
              <p>Bu görünümde segment yok.</p>
              <p className="text-xs">
                “Yeni segment” ile il/ilçe + sektör araması ekleyin. (Tarama #4’te.)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSegments.map((s) => (
                <SegmentCard
                  key={s.id}
                  segment={s}
                  onDragStart={() => setDragId(s.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropTarget(null);
                  }}
                  onDelete={() => deleteSegment(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Hata bildirimi */}
      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}

      {/* ── Klasör diyaloğu ── */}
      <Dialog
        open={folderDialog.open}
        onOpenChange={(open) => setFolderDialog((d) => ({ ...d, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderDialog.editId ? "Klasörü yeniden adlandır" : "Yeni klasör"}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Klasör adı (ör. İstanbul, Diş Klinikleri…)"
            value={folderDialog.value}
            onChange={(e) => setFolderDialog((d) => ({ ...d, value: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submitFolder()}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setFolderDialog({ open: false, parentId: null, editId: null, value: "" })
              }
            >
              Vazgeç
            </Button>
            <Button onClick={submitFolder}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Segment diyaloğu ── */}
      <Dialog
        open={segDialog.open}
        onOpenChange={(open) => setSegDialog((d) => ({ ...d, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni arama segmenti</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Şehir *"
                value={segDialog.city}
                onChange={(e) => setSegDialog((d) => ({ ...d, city: e.target.value }))}
              />
              <Input
                placeholder="İlçe (opsiyonel)"
                value={segDialog.district}
                onChange={(e) => setSegDialog((d) => ({ ...d, district: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Sektör * (ör. diş kliniği)"
              value={segDialog.sector}
              onChange={(e) => setSegDialog((d) => ({ ...d, sector: e.target.value }))}
            />
            <Input
              placeholder="Anahtar kelimeler (virgülle: diş hekimi, ağız diş sağlığı)"
              value={segDialog.keywords}
              onChange={(e) => setSegDialog((d) => ({ ...d, keywords: e.target.value }))}
            />
            {selectedFolder && (
              <p className="text-muted-foreground text-xs">
                “{selectedFolder.name}” klasörüne eklenecek.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setSegDialog({ open: false, city: "", district: "", sector: "", keywords: "" })
              }
            >
              Vazgeç
            </Button>
            <Button onClick={submitSegment}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Alt bileşenler ────────────────────────────────────────
function SidebarItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${
        active ? "bg-accent font-medium" : "hover:bg-accent/50"
      }`}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-muted-foreground text-xs">{count}</span>
    </button>
  );
}

function FolderRow({
  node,
  depth,
  selected,
  dropTarget,
  count,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddChild,
  onRename,
  onDelete,
}: {
  node: FolderNode;
  depth: number;
  selected: Selection;
  dropTarget: string | "UNFILED" | null;
  count: (key: Selection) => number;
  onSelect: (s: Selection) => void;
  onDragOver: (key: string) => (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (folderId: string | null, key: string) => (e: React.DragEvent) => void;
  onAddChild: (parentId: string) => void;
  onRename: (f: FolderItem) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const active = selected === node.id;
  const isDrop = dropTarget === node.id;

  return (
    <div>
      <div
        onDragOver={onDragOver(node.id)}
        onDragLeave={onDragLeave}
        onDrop={onDrop(node.id, node.id)}
        className={`group flex items-center gap-1 rounded-md pr-1 ${
          active ? "bg-accent" : "hover:bg-accent/50"
        } ${isDrop ? "ring-2 ring-orange-400" : ""}`}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-1"
          aria-label={open ? "Kapat" : "Aç"}
        >
          <ChevronRight
            className={`size-3.5 transition-transform ${open ? "rotate-90" : ""} ${
              node.children.length === 0 ? "opacity-25" : ""
            }`}
          />
        </button>
        <button
          onClick={() => onSelect(node.id)}
          className="flex flex-1 items-center gap-2 py-1.5 text-left"
        >
          <span className={`flex-1 truncate ${active ? "font-medium" : ""}`}>
            {node.name}
          </span>
          <span className="text-muted-foreground text-xs">{count(node.id)}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddChild(node.id)}>
              <FolderPlus className="size-4" /> Alt klasör
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(node)}>
              <Pencil className="size-4" /> Yeniden adlandır
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(node.id)}>
              <Trash2 className="size-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open &&
        node.children.map((child) => (
          <FolderRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selected={selected}
            dropTarget={dropTarget}
            count={count}
            onSelect={onSelect}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onAddChild={onAddChild}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

function SegmentCard({
  segment,
  onDragStart,
  onDragEnd,
  onDelete,
}: {
  segment: Segment;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className="bg-card group flex cursor-grab flex-col gap-2 rounded-lg border p-4 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/calisma-alani/segment/${segment.id}`}
            className="font-medium hover:underline"
          >
            {segment.city}
            {segment.district ? ` · ${segment.district}` : ""}
          </Link>
          <p className="text-muted-foreground text-sm">{segment.sector}</p>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground p-1 opacity-0 hover:text-red-600 group-hover:opacity-100"
          title="Segmenti sil"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {segment.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {segment.keywords.map((k) => (
            <span
              key={k}
              className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
            >
              {k}
            </span>
          ))}
        </div>
      )}

      <p className="text-muted-foreground mt-1 text-xs">
        {segment.lastRunAt ? "Çalıştırıldı" : "Henüz çalıştırılmadı"}
      </p>
    </div>
  );
}
