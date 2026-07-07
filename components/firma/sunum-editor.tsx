"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Section = { key: string; title: string; enabled: boolean };
type Presentation = {
  id: string;
  sections: Section[];
  content: Record<string, string>;
  format: string;
  openedAt: string | null;
  themeId: string | null;
};

export function SunumEditor({
  businessId,
  businessName,
  initial,
  defaultSections,
  themes,
  globalThemeId,
}: {
  businessId: string;
  businessName: string;
  initial: Presentation | null;
  defaultSections: Section[];
  themes: { id: string; name: string }[];
  globalThemeId: string;
}) {
  const [pres, setPres] = useState<Presentation | null>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ open: boolean; url: string | null; loading: boolean }>({
    open: false,
    url: null,
    loading: false,
  });
  const previewUrlRef = useRef<string | null>(null);

  const activeThemeId = pres ? (pres.themeId ?? globalThemeId) : globalThemeId;
  const activeThemeName = themes.find((t) => t.id === activeThemeId)?.name ?? "Tema";

  // Blob URL sızıntısını önle.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Önizleme açıkken Esc ile kapat.
  useEffect(() => {
    if (!preview.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview((p) => ({ ...p, open: false }));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview.open]);

  async function create() {
    setBusy("create");
    setMsg(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/presentation`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Oluşturulamadı");
      const p = data.presentation;
      setPres({
        id: p.id,
        sections: p.sectionConfig,
        content: p.content,
        format: p.format,
        openedAt: p.openedAt,
        themeId: p.themeId ?? null,
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  function update(fn: (p: Presentation) => Presentation) {
    setPres((p) => (p ? fn(p) : p));
  }

  function toggle(key: string) {
    update((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    }));
  }
  function move(i: number, dir: -1 | 1) {
    update((p) => {
      const s = [...p.sections];
      const j = i + dir;
      if (j < 0 || j >= s.length) return p;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...p, sections: s };
    });
  }
  function edit(key: string, text: string) {
    update((p) => ({ ...p, content: { ...p.content, [key]: text } }));
  }

  // Kaydeder (busy durumuna dokunmaz — PDF/önizleme akışları kendi göstergesini yönetir).
  async function persist() {
    if (!pres) return;
    await fetch(`/api/presentations/${pres.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionConfig: pres.sections, content: pres.content }),
    });
  }

  async function save() {
    setBusy("save");
    try {
      await persist();
      setMsg("Kaydedildi.");
      setTimeout(() => setMsg(null), 2000);
    } finally {
      setBusy(null);
    }
  }

  async function regenerate(key: string) {
    if (!pres) return;
    setBusy(key);
    try {
      const res = await fetch(`/api/presentations/${pres.id}/section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (res.ok) edit(key, data.text);
    } finally {
      setBusy(null);
    }
  }

  // Kaydedip PDF üretir; blob döndürür. preview=true → durum değişmez, inline.
  async function buildPdf(previewMode: boolean): Promise<Blob> {
    await persist();
    const res = await fetch(
      `/api/presentations/${pres!.id}/pdf${previewMode ? "?preview=1" : ""}`,
      { method: "POST" },
    );
    if (!res.ok) throw new Error("PDF üretilemedi.");
    return res.blob();
  }

  async function downloadPdf() {
    if (!pres) return;
    setBusy("pdf");
    try {
      const blob = await buildPdf(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${businessName}-sunum.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("PDF indirildi.");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  async function openPreview() {
    if (!pres) return;
    setPreview({ open: true, url: null, loading: true });
    try {
      const blob = await buildPdf(true);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreview({ open: true, url, loading: false });
    } catch (e) {
      setPreview({ open: false, url: null, loading: false });
      setMsg(e instanceof Error ? e.message : "Önizleme oluşturulamadı.");
    }
  }

  function closePreview() {
    setPreview((p) => ({ ...p, open: false }));
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href={`/firma/${businessId}`}
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> {businessName}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <FileText className="size-6" /> Sunum Editörü
        </h1>
        <p className="text-muted-foreground text-sm">
          İkna aracı — AI taslak hazırlar, son söz sende. Fiyat yok.
        </p>
      </div>

      {msg && <div className="rounded-md border px-4 py-2 text-sm">{msg}</div>}

      {!pres ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
          <p className="text-muted-foreground text-sm">
            {defaultSections.filter((s) => s.enabled).length} bölümlü bir taslak, firmanın analiz
            verisinden AI ile hazırlanır. Sonra her bölümü düzenleyebilir/kapatabilirsin.
          </p>
          <Button onClick={create} disabled={busy === "create"}>
            <Sparkles className={`size-4 ${busy === "create" ? "animate-pulse" : ""}`} />
            {busy === "create" ? "Hazırlanıyor…" : "Sunum taslağı oluştur"}
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-background/85 sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-xl border p-2 shadow-sm backdrop-blur">
            {/* Tema seçici */}
            <div className="relative flex items-center">
              <Palette className="text-muted-foreground pointer-events-none absolute left-2.5 size-4" />
              <select
                value={activeThemeId}
                onChange={async (e) => {
                  const themeId = e.target.value;
                  update((p) => ({ ...p, themeId }));
                  await fetch(`/api/presentations/${pres.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ themeId }),
                  });
                }}
                className="bg-background hover:bg-muted h-9 cursor-pointer appearance-none rounded-lg border pr-8 pl-8 text-sm font-medium transition-colors"
                title="Tema"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="text-muted-foreground pointer-events-none absolute right-2.5 size-4" />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="ghost" size="lg" onClick={save} disabled={busy === "save"}>
                {busy === "save" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Kaydet
              </Button>
              <Button variant="outline" size="lg" onClick={openPreview} disabled={preview.loading}>
                {preview.loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Eye className="size-4" />
                )}
                Önizle
              </Button>
              <Button size="lg" onClick={downloadPdf} disabled={busy === "pdf"}>
                {busy === "pdf" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {busy === "pdf" ? "Hazırlanıyor…" : "PDF indir"}
              </Button>
            </div>
          </div>

          {pres.openedAt && (
            <div className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200">
              Sunum {new Date(pres.openedAt).toLocaleString("tr-TR")} tarihinde açıldı.
            </div>
          )}

          <div className="space-y-3">
            {pres.sections.map((s, i) => (
              <div key={s.key} className={`rounded-lg border p-3 ${s.enabled ? "" : "opacity-50"}`}>
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={() => toggle(s.key)}
                    className="size-4"
                  />
                  <span className="flex-1 font-medium">{s.title}</span>
                  <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground p-1" title="Yukarı">
                    <ChevronUp className="size-4" />
                  </button>
                  <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground p-1" title="Aşağı">
                    <ChevronDown className="size-4" />
                  </button>
                  <button
                    onClick={() => regenerate(s.key)}
                    disabled={busy === s.key}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                    title="Yeniden üret"
                  >
                    <RefreshCw className={`size-3.5 ${busy === s.key ? "animate-spin" : ""}`} /> yeniden üret
                  </button>
                </div>
                {s.enabled && (
                  <textarea
                    value={pres.content[s.key] ?? ""}
                    onChange={(e) => edit(s.key, e.target.value)}
                    rows={4}
                    placeholder="(bu bölüm için içerik yok — yeniden üret)"
                    className="bg-background w-full resize-y rounded-md border p-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {preview.open && (
            <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
              {/* Üst bar */}
              <div className="bg-background flex items-center justify-between gap-3 border-b px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <FileText className="text-primary size-4 shrink-0" />
                  <span className="truncate">
                    PDF Önizleme
                    <span className="text-muted-foreground hidden sm:inline">
                      {" · "}
                      {activeThemeName} · {businessName}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {preview.url && (
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm sm:inline-flex"
                    >
                      <ExternalLink className="size-4" /> Yeni sekme
                    </a>
                  )}
                  <Button size="lg" onClick={downloadPdf} disabled={busy === "pdf"}>
                    {busy === "pdf" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    İndir
                  </Button>
                  <button
                    onClick={closePreview}
                    className="hover:bg-muted grid size-9 place-items-center rounded-lg"
                    aria-label="Kapat"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              {/* PDF gövdesi */}
              <div className="relative flex-1 overflow-hidden bg-neutral-300/70 dark:bg-neutral-900">
                {preview.loading || !preview.url ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="text-primary size-7 animate-spin" />
                      <span className="text-muted-foreground text-sm">PDF hazırlanıyor…</span>
                    </div>
                  </div>
                ) : (
                  <iframe title="PDF önizleme" src={preview.url} className="h-full w-full border-0" />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
