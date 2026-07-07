"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Save,
  Sparkles,
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
  const [copied, setCopied] = useState(false);

  const previewUrl = pres ? `/sunum/${pres.id}` : null;

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

  async function save() {
    if (!pres) return;
    setBusy("save");
    try {
      await fetch(`/api/presentations/${pres.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionConfig: pres.sections, content: pres.content }),
      });
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

  async function downloadPdf() {
    if (!pres) return;
    setBusy("pdf");
    try {
      await save();
      const res = await fetch(`/api/presentations/${pres.id}/pdf`, { method: "POST" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${businessName}-sunum.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }

  async function copyMessage() {
    if (!previewUrl) return;
    const link = `${window.location.origin}${previewUrl}`;
    await navigator.clipboard.writeText(
      `Merhaba, ${businessName} için hazırladığımız kısa sunum: ${link}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pres.themeId ?? globalThemeId}
              onChange={async (e) => {
                const themeId = e.target.value;
                update((p) => ({ ...p, themeId }));
                await fetch(`/api/presentations/${pres.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ themeId }),
                });
              }}
              className="bg-background h-9 rounded-md border px-2 text-sm"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  Tema: {t.name}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={save} disabled={busy === "save"}>
              <Save className="size-4" /> Kaydet
            </Button>
            {previewUrl && (
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`${previewUrl}?theme=${pres.themeId ?? globalThemeId}`, "_blank")
                }
              >
                <ExternalLink className="size-4" /> Önizle
              </Button>
            )}
            <Button variant="outline" onClick={downloadPdf} disabled={busy === "pdf"}>
              <Download className="size-4" /> {busy === "pdf" ? "PDF…" : "PDF indir"}
            </Button>
            <Button variant="outline" onClick={copyMessage}>
              <Copy className="size-4" /> {copied ? "Kopyalandı" : "Mesajı kopyala"}
            </Button>
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
        </>
      )}
    </main>
  );
}
